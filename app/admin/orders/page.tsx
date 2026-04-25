'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  ExternalLink,
  Copy,
  Paperclip,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import type { OrderRecord } from '@/lib/types/domain';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { formatDateTime, formatOrderStatusLabel, getOrderDisplayId, normalizeOrderStatus } from '@/lib/order-system';
import { toStorageMetadata, toStorageMetadataFromLibrary, withProtectedFileToken } from '@/lib/storage-utils';
import { normalizeImageUrl, resolveStoredMediaUrl } from '@/lib/image-display';
import MediaLibraryModal from '@/components/MediaLibraryModal';
import UploadedImage from '@/components/UploadedImage';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const;

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

type ComposerAttachment = {
  url: string;
  name: string;
  type: string;
  size: number;
  media: ReturnType<typeof toStorageMetadata>;
};

function statusStyles(status: string) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'approved') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  }
  if (normalized === 'rejected') {
    return 'bg-accent/10 text-accent border-accent/30';
  }
  return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
}

function isFinalizedStatus(status: string) {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'approved' || normalized === 'rejected';
}

function paymentMethodName(order: OrderRecord) {
  const legacy = (order as any).paymentMethodName;
  return order.paymentMethodSnapshot?.name || legacy || '';
}

function senderAccount(order: OrderRecord) {
  const proof = order.paymentProof as any;
  return proof?.senderAccount || proof?.senderNumber || '';
}

function transactionValue(order: OrderRecord) {
  const proof = order.paymentProof as any;
  return proof?.transactionId || '';
}

function screenshotUrl(order: OrderRecord) {
  const proof = order.paymentProof as any;
  return (
    resolveStoredMediaUrl(proof?.screenshotMedia) ||
    normalizeImageUrl(proof?.fileUrl || proof?.screenshotUrl || proof?.paymentProofUrl || '')
  );
}

function getMessageAttachment(entry: any) {
  const url =
    resolveStoredMediaUrl(entry?.attachmentMedia) ||
    normalizeImageUrl(
      entry?.attachmentUrl ||
        entry?.attachment?.fileUrl ||
        entry?.attachment?.url ||
        ''
    );

  if (!url) {
    return null;
  }

  return {
    url,
    name: entry?.attachmentName || entry?.attachmentMedia?.fileName || 'Attachment',
    mimeType: entry?.attachmentType || entry?.attachmentMedia?.mimeType || '',
  };
}

function isImageAttachment(attachment: { url: string; mimeType?: string; name?: string }) {
  const mime = (attachment.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) {
    return true;
  }

  const urlWithoutQuery = (attachment.url || '').split('?')[0];
  if (/\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(urlWithoutQuery)) {
    return true;
  }

  return /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(attachment.name || '');
}

function toDownloadableMediaUrl(url: string) {
  if (!url.includes('/api/upload/')) {
    return url;
  }

  try {
    const parsed = new URL(url, 'http://localhost');
    parsed.searchParams.set('download', '1');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function getPrimaryItem(order: OrderRecord) {
  const explicit = (order as any).itemSummary?.[0];
  if (explicit) {
    return explicit;
  }
  return (order.items || [])[0] || null;
}

function getOrderPlanLabel(order: OrderRecord) {
  const primary = getPrimaryItem(order);
  return primary?.selectedPlanName || (order as any).primaryPlanName || order.selectedPlanName || '';
}

function getOrderDuration(order: OrderRecord) {
  const primary = getPrimaryItem(order) as any;
  return primary?.durationLabel || (order as any).primaryDuration || (order as any).duration || '';
}

function getOrderPlanType(order: OrderRecord) {
  const primary = getPrimaryItem(order) as any;
  return primary?.planType || (order as any).primaryPlanType || '';
}

function getOrderCoupon(order: OrderRecord) {
  const data = order as any;
  return data.couponCode || data.appliedCouponCode || data.coupon?.code || '';
}

function getOrderDiscountAmount(order: OrderRecord) {
  const data = order as any;
  return Number(data.discountAmount || 0);
}

function getOrderOriginalTotal(order: OrderRecord) {
  const data = order as any;
  const value = Number(data.originalTotalAmount ?? order.subtotal ?? order.totalAmount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getTargetEmail(order: OrderRecord) {
  const anyOrder = order as any;
  return anyOrder.deliveryEmail || anyOrder.targetEmail || order.userEmail || order.email || '';
}

function getOrderQuantity(order: OrderRecord) {
  if (typeof order.quantityTotal === 'number' && order.quantityTotal > 0) {
    return order.quantityTotal;
  }
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function productSummary(order: OrderRecord) {
  const titles = (order.items || []).map((item) => item.productTitle).filter(Boolean);
  if (!titles.length) {
    return '';
  }
  return titles.join(', ');
}

function getOrderCustomerName(order: OrderRecord) {
  return order.userName || '';
}

function orderPriority(status: string) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'pending') {
    return 0;
  }
  if (normalized === 'approved') {
    return 1;
  }
  return 2;
}

function DataField({
  label,
  value,
  onCopy,
  highlight = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
        highlight ? 'bg-primary/85 border-primary text-black' : 'bg-[#D7D7D7] border-[#D7D7D7] text-black'
      }`}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-bold leading-tight text-black">{label}</div>
        <div className="text-sm font-semibold leading-tight text-black whitespace-pre-wrap break-words">{value || '-'}</div>
      </div>
      <button
        onClick={onCopy}
        className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-2.5 py-1 ${
          highlight ? 'bg-black/15 hover:bg-black/25' : 'bg-black/10 hover:bg-black/20'
        }`}
      >
        <Copy className="w-3.5 h-3.5" /> Copy
      </button>
    </div>
  );
}

export default function AdminOrdersPage() {
  const params = useSearchParams();
  const requestedOrder = params.get('order');
  const { isAdmin, isStaff, user } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('pending');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [composerMessage, setComposerMessage] = useState('');
  const [composerAttachment, setComposerAttachment] = useState<ComposerAttachment | null>(null);
  const [isAttachmentLibraryOpen, setIsAttachmentLibraryOpen] = useState(false);
  const [fileAccessToken, setFileAccessToken] = useState('');
  const [deletingAllOrders, setDeletingAllOrders] = useState(false);
  const [receiptViewerUrl, setReceiptViewerUrl] = useState('');
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    type: 'approve' | 'reject';
    value: string;
  } | null>(null);

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<OrderRecord, 'id'>),
        }));
        setOrders(data);
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Failed to load orders:', snapshotError);
        toast.error('Failed to load orders', 'Please check your Firestore connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isStaff, toast]);

  useEffect(() => {
    if (!orders.length) {
      return;
    }

    if (requestedOrder && orders.some((order) => order.id === requestedOrder)) {
      setSelectedOrderId(requestedOrder);
    }
  }, [orders, requestedOrder]);

  useEffect(() => {
    if (!user) {
      setFileAccessToken('');
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setFileAccessToken('');
        return;
      }

      try {
        const token = await nextUser.getIdToken();
        setFileAccessToken(token);
      } catch (error) {
        console.error('Failed to refresh file access token:', error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const byStatus = orderPriority(a.status) - orderPriority(b.status);
        if (byStatus !== 0) {
          return byStatus;
        }
        const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return sortedOrders.filter((order) => {
      const searchable = [
        getOrderDisplayId(order),
        order.userEmail,
        order.email,
        order.userPhone,
        order.phone,
        order.userName,
        paymentMethodName(order),
        senderAccount(order),
        transactionValue(order),
        getOrderPlanLabel(order),
        getOrderDuration(order),
        ...(order.items || []).map((item) => item.productTitle),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || normalizeOrderStatus(order.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sortedOrders, searchTerm, statusFilter]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const stats = useMemo(
    () => ({
      pending: orders.filter((order) => normalizeOrderStatus(order.status) === 'pending').length,
      approved: orders.filter((order) => normalizeOrderStatus(order.status) === 'approved').length,
      rejected: orders.filter((order) => normalizeOrderStatus(order.status) === 'rejected').length,
    }),
    [orders]
  );

  const orderMessages = useMemo(() => {
    if (!selectedOrder?.messages || !Array.isArray(selectedOrder.messages)) {
      return [] as Array<{
        senderRole: string;
        senderId: string;
        message: string;
        createdAt: any;
        attachmentUrl?: string;
        attachmentName?: string;
      }>;
    }

    return [...selectedOrder.messages].sort((a, b) => {
      const aTime = (a.createdAt as any)?.toDate?.()?.getTime?.() || new Date(a.createdAt || 0).getTime() || 0;
      const bTime = (b.createdAt as any)?.toDate?.()?.getTime?.() || new Date(b.createdAt || 0).getTime() || 0;
      return aTime - bTime;
    });
  }, [selectedOrder?.messages]);

  useEffect(() => {
    setComposerAttachment(null);
  }, [selectedOrderId]);

  if (!isStaff) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  async function pushOrderMessage(
    order: OrderRecord,
    content: string,
    messageType: 'message' | 'approval' | 'rejection',
    title: string,
    nextStatus?: 'pending' | 'approved' | 'rejected',
    attachment?:
      | {
          url: string;
          name: string;
          type: string;
          size: number;
          media?: ReturnType<typeof toStorageMetadata>;
        }
      | null
  ) {
    if (!user) {
      throw new Error('You must be logged in as admin to update orders.');
    }

    const trimmed = content.trim();
    if (!trimmed && !attachment) {
      throw new Error('Message or attachment is required.');
    }
    const currentStatus = normalizeOrderStatus(order.status);
    if (nextStatus && isFinalizedStatus(currentStatus) && nextStatus !== currentStatus) {
      throw new Error(
        `Order ${getOrderDisplayId(order)} is already ${formatOrderStatusLabel(currentStatus)}. Final status cannot be changed.`
      );
    }

    const existingMessages = Array.isArray(order.messages) ? [...order.messages] : [];
    const newMessage = {
      senderRole: 'admin',
      senderId: user.uid,
      message: trimmed,
      attachmentUrl: attachment?.url || '',
      attachmentName: attachment?.name || '',
      attachmentType: attachment?.type || '',
      attachmentSize: attachment?.size || 0,
      attachmentMedia: attachment?.media || null,
      createdAt: new Date(),
    };

    const orderRef = doc(db, 'orders', order.id);
    const batch = writeBatch(db);
    const previewText = trimmed || `Attachment: ${attachment?.name || 'file'}`;

    const updatePayload: Record<string, unknown> = {
      adminMessage: trimmed || order.adminMessage || '',
      latestMessagePreview: previewText.slice(0, 220),
      latestMessageAt: serverTimestamp(),
      messages: [...existingMessages, newMessage],
      tickerState: 'opened',
      tickerOpenedAt: serverTimestamp(),
      openedByAdminId: user.uid,
      updatedAt: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    if (nextStatus) {
      updatePayload.status = nextStatus;
      updatePayload.statusUpdatedAt = serverTimestamp();
      updatePayload.status_updated_at = serverTimestamp();
      updatePayload.statusFinal = nextStatus !== 'pending';
      updatePayload.statusFinalizedAt = nextStatus !== 'pending' ? serverTimestamp() : null;
      if (nextStatus === 'rejected') {
        updatePayload.rejectionReason = trimmed;
      }
      if (nextStatus === 'approved') {
        updatePayload.rejectionReason = '';
      }
    }

    batch.update(orderRef, updatePayload);

    const orderRecipientId = order.userId || (order as any).user_id || '';
    if (orderRecipientId) {
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        recipientId: orderRecipientId,
        recipientRole: 'user',
        type: messageType === 'message' ? 'order_message' : 'order_status',
        title,
        body: previewText,
        link: `/dashboard?order=${encodeURIComponent(order.id)}`,
        orderId: order.id,
        metadata: {
          orderId: getOrderDisplayId(order),
          status: nextStatus || normalizeOrderStatus(order.status),
          attachmentUrl: attachment?.url || '',
          attachmentName: attachment?.name || '',
          attachmentMediaId: attachment?.media?.mediaId || '',
        },
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  async function handleApprove(inputMessage?: string) {
    if (!selectedOrder) {
      return false;
    }
    if (isFinalizedStatus(selectedOrder.status) && normalizeOrderStatus(selectedOrder.status) !== 'approved') {
      const message = 'This order is already rejected and cannot be approved.';
      setError(message);
      toast.error('Approve blocked', message);
      return false;
    }
    if (normalizeOrderStatus(selectedOrder.status) === 'approved') {
      const message = 'This order is already approved.';
      setError(message);
      toast.error('Approve blocked', message);
      return false;
    }

    setError('');
    setActionLoading(true);
    try {
      const text =
        (inputMessage || '').trim() ||
        `Your order ${getOrderDisplayId(selectedOrder)} has been approved. Please check your dashboard details.`;
      await pushOrderMessage(selectedOrder, text, 'approval', 'Order Approved', 'approved');
      toast.success('Order approved', getOrderDisplayId(selectedOrder));
      return true;
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Failed to approve order.';
      setError(message);
      toast.error('Approve failed', message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reasonInput?: string) {
    if (!selectedOrder) {
      return false;
    }
    if (isFinalizedStatus(selectedOrder.status) && normalizeOrderStatus(selectedOrder.status) !== 'rejected') {
      const message = 'This order is already approved and cannot be rejected.';
      setError(message);
      toast.error('Reject blocked', message);
      return false;
    }
    if (normalizeOrderStatus(selectedOrder.status) === 'rejected') {
      const message = 'This order is already rejected.';
      setError(message);
      toast.error('Reject blocked', message);
      return false;
    }

    const reason = (reasonInput || '').trim();
    if (!reason) {
      setError('Rejection reason is required.');
      return false;
    }

    setError('');
    setActionLoading(true);
    try {
      await pushOrderMessage(selectedOrder, reason, 'rejection', 'Order Rejected', 'rejected');
      toast.success('Order rejected', getOrderDisplayId(selectedOrder));
      return true;
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Failed to reject order.';
      setError(message);
      toast.error('Reject failed', message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedOrder) {
      return false;
    }

    setError('');
    setActionLoading(true);
    try {
      const attachment = composerAttachment
        ? {
            ...composerAttachment,
            media: composerAttachment.media,
          }
        : null;
      await pushOrderMessage(selectedOrder, composerMessage, 'message', 'Order Message', undefined, attachment);
      setComposerMessage('');
      setComposerAttachment(null);
      toast.success('Message sent', getOrderDisplayId(selectedOrder));
      return true;
    } catch (actionError) {
      const msg = actionError instanceof Error ? actionError.message : 'Failed to send message.';
      setError(msg);
      toast.error('Message failed', msg);
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function copyValue(value: string, label: string) {
    if (!value) {
      toast.error(`${label} is empty`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (copyError) {
      console.error('Copy failed:', copyError);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }

  async function handleDeleteAllOrders() {
    if (!isAdmin) {
      toast.error('Only admin can delete all orders.');
      return;
    }

    const confirmDelete = window.confirm(
      'Delete ALL orders permanently? This cannot be undone.'
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAllOrders(true);
    setError('');
    try {
      const chunkSize = 300;
      let totalDeleted = 0;

      for (;;) {
        const snapshot = await getDocs(query(collection(db, 'orders'), limit(chunkSize)));
        if (snapshot.empty) {
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
        totalDeleted += snapshot.size;

        if (snapshot.size < chunkSize) {
          break;
        }
      }

      setSelectedOrderId(null);
      toast.success('Orders deleted', `${totalDeleted} order(s) removed.`);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete orders.';
      setError(message);
      toast.error('Delete all failed', message);
    } finally {
      setDeletingAllOrders(false);
    }
  }

  const selectedPrimaryItem = selectedOrder ? getPrimaryItem(selectedOrder) : null;
  const selectedProductName = selectedPrimaryItem?.productTitle || productSummary(selectedOrder || ({} as OrderRecord));
  const selectedPlanName = selectedOrder ? getOrderPlanLabel(selectedOrder) : '';
  const selectedDuration = selectedOrder ? getOrderDuration(selectedOrder) : '';
  const selectedPlanType = selectedOrder ? getOrderPlanType(selectedOrder) : '';
  const selectedCoupon = selectedOrder ? getOrderCoupon(selectedOrder) : '';
  const selectedDiscountAmount = selectedOrder ? getOrderDiscountAmount(selectedOrder) : 0;
  const selectedOriginalTotal = selectedOrder ? getOrderOriginalTotal(selectedOrder) : 0;
  const selectedStatus = selectedOrder ? normalizeOrderStatus(selectedOrder.status) : 'pending';
  const selectedOrderIsFinal = selectedOrder ? isFinalizedStatus(selectedOrder.status) : false;
  const selectedScreenshotUrl = selectedOrder
    ? withProtectedFileToken(screenshotUrl(selectedOrder), fileAccessToken)
    : '';

  function renderChatPanel(fullscreen = false) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-[#3A3C3F] p-3 flex flex-col ${
          fullscreen ? 'h-[80vh] w-full max-w-4xl' : 'min-h-[240px]'
        }`}
      >
        <div className="flex items-center justify-between pb-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Order Chat</div>
          <button
            onClick={() => setChatFullscreen((prev) => !prev)}
            className="h-8 w-8 rounded-lg border border-white/15 bg-black/20 text-white/80 grid place-items-center hover:border-primary/50 hover:text-primary transition-colors"
            title={fullscreen ? 'Exit fullscreen chat' : 'Open fullscreen chat'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2">
          {orderMessages.length === 0 ? (
            <div className="h-full min-h-[120px] grid place-items-center text-sm text-white/60">
              No messages yet
            </div>
          ) : (
            orderMessages.map((entry, index) => {
              const isAdmin = entry.senderRole === 'admin';
              const attachment = getMessageAttachment(entry);
              const attachmentUrl = attachment
                ? withProtectedFileToken(attachment.url, fileAccessToken)
                : '';
              const attachmentIsImage = attachment ? isImageAttachment(attachment) : false;
              return (
                <div key={`${entry.senderId}-${index}`} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isAdmin ? 'bg-[#E3B80D] text-black' : 'bg-[#E4E4E4] text-[#2A2A2A]'
                    }`}
                  >
                    {entry.message ? <div>{entry.message}</div> : null}
                    {attachment ? (
                      attachmentIsImage ? (
                        <button
                          onClick={() => setReceiptViewerUrl(attachmentUrl)}
                          className="mt-2 block w-full text-left"
                        >
                          <UploadedImage
                            src={attachmentUrl}
                            fallbackSrc={null}
                            fallbackOnError={false}
                            alt={attachment.name}
                            className="w-full max-h-[220px] object-cover rounded-xl border border-white/20"
                          />
                          <div className={`mt-1 text-[10px] ${isAdmin ? 'text-black/70' : 'text-[#2A2A2A]/70'}`}>
                            {attachment.name}
                          </div>
                        </button>
                      ) : (
                        <a
                          href={toDownloadableMediaUrl(attachmentUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2 inline-flex items-center gap-1.5 underline ${
                            isAdmin ? 'text-black/90' : 'text-[#2A2A2A]'
                          }`}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {attachment.name}
                        </a>
                      )
                    ) : null}
                    <div className={`mt-2 text-[10px] ${isAdmin ? 'text-black/65' : 'text-[#2A2A2A]/60'}`}>
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 space-y-2">
          {composerAttachment ? (
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white flex items-center justify-between gap-2">
              <span className="truncate">{composerAttachment.name}</span>
              <button
                onClick={() => {
                  setComposerAttachment(null);
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-[40px_minmax(0,1fr)_auto] gap-2 items-end">
            <button
              type="button"
              onClick={() => {
                if (!selectedOrder) {
                  toast.error('Select an order first');
                  return;
                }
                setIsAttachmentLibraryOpen(true);
              }}
              className="h-10 w-10 rounded-xl bg-[#1F2124] border border-white/15 text-white/80 grid place-items-center hover:border-primary/50 hover:text-primary transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={composerMessage}
              onChange={(event) => setComposerMessage(event.target.value)}
              placeholder="Type a message"
              rows={2}
              className="w-full min-w-0 resize-none rounded-xl bg-[#E3C642] text-black placeholder:text-black/70 px-3 py-2.5 text-sm leading-tight focus:outline-none"
            />
            <button
              onClick={() => {
                void handleSendMessage();
              }}
              disabled={actionLoading}
              className="h-10 px-3 sm:px-4 rounded-xl bg-primary text-black border border-primary/70 inline-flex items-center justify-center gap-1.5 disabled:opacity-60 w-full sm:w-auto"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">Send</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-3 md:space-y-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-brand-text uppercase">
            Order <span className="internal-gradient">Management</span>
          </h1>
          <p className="text-brand-text/40 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] md:tracking-[0.3em] mt-1 md:mt-2">
            Realtime Review + Messaging
          </p>
        </div>

        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="relative group min-w-0 flex-1 md:flex-none md:w-[22rem]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search order, customer, payment..."
              className="h-10 md:h-11 w-full bg-white/5 border border-white/10 rounded-xl pl-10 md:pl-11 pr-3.5 md:pr-4 text-[10px] md:text-[11px] font-black tracking-wide focus:outline-none focus:border-primary/50"
            />
          </div>
          {isAdmin ? (
            <button
              onClick={() => {
                void handleDeleteAllOrders();
              }}
              disabled={deletingAllOrders}
              className="h-10 md:h-11 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-accent/35 bg-accent/15 px-3 md:px-3.5 text-[8px] md:text-[9px] font-black uppercase tracking-[0.14em] text-accent hover:bg-accent/20 disabled:opacity-60 whitespace-nowrap"
            >
              {deletingAllOrders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Delete All Orders
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex md:grid md:grid-cols-3 gap-2 md:gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 md:mx-0 md:px-0">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-400/5' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
          { label: 'Rejected', value: stats.rejected, color: 'text-accent', bg: 'bg-accent/5' },
        ].map((stat) => (
          <div key={stat.label} className={`min-w-[130px] md:min-w-0 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5 ${stat.bg}`}>
            <div className={`text-xl md:text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-3.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
              statusFilter === filter.id
                ? 'bg-primary border-primary text-black'
                : 'bg-white/5 border-white/10 text-brand-text/40'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 glass rounded-[1.5rem] md:rounded-[2rem] border border-primary/20 p-3.5 md:p-6 lg:p-7 min-h-[520px] md:min-h-[640px]">
          {!selectedOrder ? (
            <div className="h-full grid place-items-center text-center text-brand-text/40 text-sm font-semibold px-4">
              Pick an order from the right list to open full order details.
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-2xl border border-white/10 bg-[#252525] p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="text-[11px] text-brand-text/45">Ordered Item</div>
                    <h2 className="text-2xl md:text-[2rem] leading-tight font-semibold text-primary break-words">
                      {selectedProductName || 'N/A'}
                    </h2>
                    <div className="text-sm text-brand-text/70 break-words">
                      {selectedPlanName || 'No plan'}
                      {selectedDuration ? ` • ${selectedDuration}` : ''}
                      {selectedPlanType ? ` • ${selectedPlanType}` : ''}
                    </div>
                    <div className="text-xs text-brand-text/55 break-words">
                      Order ID: {getOrderDisplayId(selectedOrder)} • Qty: {getOrderQuantity(selectedOrder)}
                    </div>
                    <div className="text-xs text-brand-text/45">Created: {formatDateTime(selectedOrder.createdAt)}</div>
                  </div>

                  <div className="shrink-0 md:text-right">
                    <div className="text-[10px] uppercase tracking-widest text-brand-text/40">Total Price</div>
                    <div className="text-4xl font-black text-primary">Rs {Number(selectedOrder.totalAmount || 0).toFixed(2)}</div>
                    {selectedDiscountAmount > 0 ? (
                      <div className="mt-1 text-xs text-brand-text/50 space-y-0.5">
                        <div className="line-through">Original: Rs {selectedOriginalTotal.toFixed(2)}</div>
                        <div className="text-emerald-400">Discount: Rs {selectedDiscountAmount.toFixed(2)}</div>
                      </div>
                    ) : null}
                    <div className="mt-2 flex md:justify-end items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-lg bg-[#F6921E] text-black px-3 py-1 text-xs font-semibold">
                        {selectedCoupon ? `Coupon (${selectedCoupon})` : 'No Coupon'}
                      </span>
                      <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold border ${statusStyles(selectedOrder.status)}`}>
                        {formatOrderStatusLabel(selectedOrder.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/15 bg-[#252525] p-4 md:p-5 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-primary">
                  <div className="text-sm md:text-base font-medium break-words">
                    <span className="text-brand-text/55 text-[10px] mr-2 uppercase tracking-widest">User Name:</span>
                    {getOrderCustomerName(selectedOrder) || 'Unknown user'}
                  </div>
                  <div className="text-sm md:text-base font-medium break-all lg:text-right">
                    <span className="text-brand-text/55 text-[10px] mr-2 uppercase tracking-widest">Customer Email:</span>
                    {selectedOrder.userEmail || selectedOrder.email || '-'}
                  </div>
                </div>

                <DataField
                  label="Delivery Email"
                  value={getTargetEmail(selectedOrder)}
                  onCopy={() => {
                    void copyValue(getTargetEmail(selectedOrder), 'Delivery email');
                  }}
                />
                <DataField
                  label="Phone"
                  value={selectedOrder.userPhone || selectedOrder.phone || ''}
                  onCopy={() => {
                    void copyValue(selectedOrder.userPhone || selectedOrder.phone || '', 'Phone');
                  }}
                />
                <DataField
                  label="Payment Method"
                  value={paymentMethodName(selectedOrder)}
                  onCopy={() => {
                    void copyValue(paymentMethodName(selectedOrder), 'Payment method');
                  }}
                  highlight
                />
                <DataField
                  label="Sender Account"
                  value={senderAccount(selectedOrder)}
                  onCopy={() => {
                    void copyValue(senderAccount(selectedOrder), 'Sender account');
                  }}
                />
                <DataField
                  label="Transaction ID"
                  value={transactionValue(selectedOrder)}
                  onCopy={() => {
                    void copyValue(transactionValue(selectedOrder), 'Transaction ID');
                  }}
                />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-white/10 bg-[#696C71] p-4 min-h-[240px]">
                    {selectedScreenshotUrl ? (
                      <button
                        onClick={() => setReceiptViewerUrl(selectedScreenshotUrl)}
                        className="w-full h-full text-left"
                      >
                        <UploadedImage
                          src={selectedScreenshotUrl}
                          fallbackSrc={null}
                          fallbackOnError={false}
                          alt="Payment receipt preview"
                          className="w-full h-full max-h-[320px] object-cover rounded-lg border border-white/20"
                        />
                        <div className="mt-2 text-[11px] text-white/85 inline-flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> Tap to open fullscreen
                        </div>
                      </button>
                    ) : (
                      <div className="w-full h-full rounded-lg bg-[#9FA2A7] text-white/90 grid place-items-center text-center text-xl leading-snug px-4">
                        Image not uploaded
                      </div>
                    )}
                  </div>

                  {renderChatPanel(false)}
                </div>
              </section>

              {error ? (
                <div className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">{error}</div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setStatusModal({ type: 'approve', value: selectedOrder.adminMessage || '' })}
                  disabled={actionLoading || selectedOrderIsFinal}
                  className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Order
                </button>
                <button
                  onClick={() => setStatusModal({ type: 'reject', value: selectedOrder.rejectionReason || '' })}
                  disabled={actionLoading || selectedOrderIsFinal}
                  className="bg-accent/15 text-accent border border-accent/30 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" /> Reject Order
                </button>
              </div>
              {selectedOrderIsFinal ? (
                <div className="text-xs text-brand-text/55 border border-white/10 bg-white/5 rounded-xl px-4 py-3">
                  Final status lock is active. This order is already <span className="text-primary font-semibold">{formatOrderStatusLabel(selectedStatus)}</span> and cannot be changed.
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="xl:col-span-4 glass rounded-[1.5rem] md:rounded-[2rem] border border-white/5 overflow-hidden">
          <div className="p-3.5 md:p-4 border-b border-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-text/40">
            Orders ({filteredOrders.length})
          </div>
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 md:py-20 text-center px-5">
              <div className="text-brand-text/55 text-sm font-semibold">No orders found.</div>
              <div className="text-brand-text/35 text-[11px] mt-1">Try changing the filter or search query.</div>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[520px] md:max-h-[920px] overflow-y-auto no-scrollbar">
              {filteredOrders.map((order) => {
                const primary = getPrimaryItem(order);
                const paymentName = paymentMethodName(order);
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedOrderId(order.id);
                      }
                    }}
                    className={`w-full text-left px-4 py-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      selectedOrderId === order.id ? 'bg-white/10 border-l-2 border-primary' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="text-base font-semibold text-brand-text break-words">
                        {primary?.productTitle || productSummary(order) || 'No item title'}
                      </div>
                      <div className="text-[11px] text-brand-text/65 break-words">
                        {getOrderPlanLabel(order) || 'No plan'}
                        {getOrderDuration(order) ? ` • ${getOrderDuration(order)}` : ''}
                      </div>
                      <div className="text-[11px] text-brand-text/55 break-words">
                        {order.userName || order.userEmail || order.email || 'Customer'}
                      </div>
                      <div className="text-[11px] text-brand-text/45 break-words">{paymentName || 'No payment method'}</div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-primary">Rs {Number(order.totalAmount || 0).toFixed(2)}</div>
                        <div className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-semibold border ${statusStyles(order.status)}`}>
                          {formatOrderStatusLabel(order.status)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="text-[10px] text-brand-text/35">{formatDateTime(order.createdAt)}</div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary text-black text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {chatFullscreen ? (
        <div className="fixed inset-0 z-[125] bg-black/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center">
          {renderChatPanel(true)}
        </div>
      ) : null}

      <MediaLibraryModal
        open={isAttachmentLibraryOpen}
        onClose={() => setIsAttachmentLibraryOpen(false)}
        allowDelete
        onSelect={(media) => {
          if (!user) {
            toast.error('Authentication required');
            return;
          }

          const size = Number(media.sizeBytes || 0);
          if (size > MAX_ATTACHMENT_BYTES) {
            toast.error('Attachment too large', 'Attachment size must be less than 10MB.');
            return;
          }

          setComposerAttachment({
            url: media.url,
            name: media.originalFileName || media.fileName || 'Attachment',
            type: media.mimeType || 'application/octet-stream',
            size,
            media: toStorageMetadataFromLibrary(media, user.uid),
          });
        }}
        folder="chat-attachments"
        title="Order Attachment Library"
        description="Select existing order files or upload from device inside this secure library."
        accept="image/*,application/pdf,text/plain,.doc,.docx"
        relatedType="order_message"
        relatedId={selectedOrder?.id || ''}
        relatedOrderId={selectedOrder?.id || ''}
        relatedUserId={user?.uid || ''}
        fileAccessToken={fileAccessToken}
        filterByRelatedFields
      />

      {receiptViewerUrl ? (
        <div className="fixed inset-0 z-[130] bg-black/90 p-4 md:p-8">
          <button
            onClick={() => setReceiptViewerUrl('')}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-black/55 border border-white/20 text-white hover:border-primary/50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-full h-full grid place-items-center">
            <UploadedImage
              src={receiptViewerUrl}
              fallbackSrc={null}
              fallbackOnError={false}
              alt="Payment receipt"
              className="max-w-full max-h-full object-contain rounded-xl border border-white/15"
            />
          </div>
        </div>
      ) : null}

      {statusModal ? (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0E0E0E] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm font-semibold text-brand-text">
                {statusModal.type === 'approve' ? 'Approve Order' : 'Reject Order'}
              </div>
              <button
                onClick={() => setStatusModal(null)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-brand-text/50 hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-[12px] text-brand-text/50 break-words">
                {selectedOrder ? `Order ${getOrderDisplayId(selectedOrder)} - ${selectedProductName || 'Item'}` : ''}
              </div>
              <textarea
                value={statusModal.value}
                onChange={(event) => setStatusModal((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                placeholder={statusModal.type === 'approve' ? 'Approval message (optional)' : 'Rejection reason (required)'}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setStatusModal(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-brand-text/60"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const success =
                      statusModal.type === 'approve'
                        ? await handleApprove(statusModal.value)
                        : await handleReject(statusModal.value);
                    if (success) {
                      setStatusModal(null);
                    }
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-primary/30 bg-primary text-black text-[11px] font-semibold disabled:opacity-60 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

