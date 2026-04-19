'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  ShoppingBag,
  Bell,
  Settings,
  LogOut,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  ChevronsUpDown,
  Paperclip,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { NotificationRecord, OrderRecord } from '@/lib/types/domain';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { formatDateTime, formatOrderStatusLabel, getOrderDisplayId, normalizeOrderStatus } from '@/lib/order-system';
import { toStorageMetadata, uploadMediaFile, withProtectedFileToken } from '@/lib/storage-utils';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function statusClass(status: string) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'approved') {
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  }
  if (normalized === 'rejected') {
    return 'bg-accent/10 border-accent/20 text-accent';
  }
  return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
}

function getPrimaryItem(order: OrderRecord) {
  const explicit = (order as any).itemSummary?.[0];
  if (explicit) {
    return explicit;
  }
  return (order.items || [])[0] || null;
}

function getOrderProductName(order: OrderRecord) {
  const primary = getPrimaryItem(order);
  if (primary?.productTitle) {
    return primary.productTitle;
  }
  if (order.primaryItemName) {
    return order.primaryItemName;
  }
  const fallback = (order.items || []).map((item) => item.productTitle).filter(Boolean);
  return fallback.join(', ') || 'Unknown item';
}

function getOrderPlan(order: OrderRecord) {
  const primary = getPrimaryItem(order) as any;
  return primary?.selectedPlanName || order.primaryPlanName || order.selectedPlanName || 'Standard';
}

function getOrderQuantity(order: OrderRecord) {
  if (typeof order.quantityTotal === 'number' && order.quantityTotal > 0) {
    return order.quantityTotal;
  }
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function getOrderDeliveryEmail(order: OrderRecord) {
  const anyOrder = order as any;
  return anyOrder.deliveryEmail || anyOrder.targetEmail || order.userEmail || order.email || '-';
}

function getOrderPhone(order: OrderRecord) {
  return order.userPhone || order.phone || '-';
}

function getPaymentMethod(order: OrderRecord) {
  const anyOrder = order as any;
  return order.paymentMethodSnapshot?.name || anyOrder.paymentMethodName || '-';
}

function getSenderAccount(order: OrderRecord) {
  const proof = order.paymentProof as any;
  return proof?.senderAccount || proof?.senderNumber || '-';
}

function getTransactionId(order: OrderRecord) {
  const proof = order.paymentProof as any;
  return proof?.transactionId || '-';
}

function getScreenshotUrl(order: OrderRecord) {
  const proof = order.paymentProof as any;
  return proof?.screenshotMedia?.fileUrl || proof?.screenshotUrl || '';
}

function getMessageAttachment(entry: any) {
  const url = entry?.attachmentUrl || entry?.attachmentMedia?.fileUrl || '';
  if (!url) {
    return null;
  }

  const name = entry?.attachmentName || entry?.attachmentMedia?.fileName || 'Attachment';
  const mimeType = entry?.attachmentType || entry?.attachmentMedia?.mimeType || '';
  return { url, name, mimeType };
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

function isUserOutgoingMessage(entry: any, userId: string) {
  const senderId = typeof entry?.senderId === 'string' ? entry.senderId.trim() : '';
  if (senderId && senderId === userId) {
    return true;
  }

  const senderRole = typeof entry?.senderRole === 'string' ? entry.senderRole.toLowerCase() : '';
  return senderRole === 'user' || senderRole === 'customer' || senderRole === 'member';
}

function DashboardPageContent() {
  const params = useSearchParams();
  const requestedOrder = params.get('order');
  const { user, profile, logout, loading: authLoading } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'messages' | 'notifications' | 'settings'>(
    'overview'
  );
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [manualSelectedOrderId, setManualSelectedOrderId] = useState<string | null>(null);
  const [fileAccessToken, setFileAccessToken] = useState('');
  const [receiptViewerUrl, setReceiptViewerUrl] = useState('');
  const [orderSelectorOpen, setOrderSelectorOpen] = useState(false);
  const [expandedOrderDetails, setExpandedOrderDetails] = useState<Record<string, boolean>>({});
  const [composerMessage, setComposerMessage] = useState('');
  const [composerAttachment, setComposerAttachment] = useState<File | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const primaryOrdersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const legacyOrdersQuery = query(collection(db, 'orders'), where('user_id', '==', user.uid));
    const notificationsQuery = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));
    let primaryOrders: OrderRecord[] = [];
    let legacyOrders: OrderRecord[] = [];

    const mergeOrders = () => {
      const byId = new Map<string, OrderRecord>();
      [...primaryOrders, ...legacyOrders].forEach((entry) => {
        byId.set(entry.id, entry);
      });
      const merged = Array.from(byId.values()).sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      });
      setOrders(merged);
    };

    const unsubPrimaryOrders = onSnapshot(
      primaryOrdersQuery,
      (snapshot) => {
        primaryOrders = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<OrderRecord, 'id'>),
        }));
        mergeOrders();
        setLoadingData(false);
      },
      (snapshotError) => {
        console.error('Failed to load primary orders:', snapshotError);
        toast.error('Failed to load orders');
        setLoadingData(false);
      }
    );

    const unsubLegacyOrders = onSnapshot(
      legacyOrdersQuery,
      (snapshot) => {
        legacyOrders = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<OrderRecord, 'id'>),
        }));
        mergeOrders();
        setLoadingData(false);
      },
      (snapshotError) => {
        console.error('Failed to load legacy orders:', snapshotError);
        setLoadingData(false);
      }
    );

    const unsubNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((snap) => ({ id: snap.id, ...(snap.data() as Omit<NotificationRecord, 'id'>) }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
            return bTime - aTime;
          });
        setNotifications(data);
      },
      (snapshotError) => {
        console.error('Failed to load notifications:', snapshotError);
        toast.error('Failed to load notifications');
      }
    );

    return () => {
      unsubPrimaryOrders();
      unsubLegacyOrders();
      unsubNotifications();
    };
  }, [user, toast]);

  useEffect(() => {
    let mounted = true;
    async function refreshToken() {
      if (!user) {
        if (mounted) {
          setFileAccessToken('');
        }
        return;
      }
      const token = await user.getIdToken();
      if (mounted) {
        setFileAccessToken(token);
      }
    }

    void refreshToken();
    return () => {
      mounted = false;
    };
  }, [user]);

  const selectedOrderId = useMemo(() => {
    if (requestedOrder && orders.some((order) => order.id === requestedOrder)) {
      return requestedOrder;
    }

    if (manualSelectedOrderId && orders.some((order) => order.id === manualSelectedOrderId)) {
      return manualSelectedOrderId;
    }

    return orders[0]?.id || null;
  }, [manualSelectedOrderId, orders, requestedOrder]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const selectedOrderDetailsExpanded = selectedOrder ? Boolean(expandedOrderDetails[selectedOrder.id]) : false;

  const messages = useMemo(() => {
    if (!selectedOrder?.messages || !Array.isArray(selectedOrder.messages)) {
      return [] as Array<{ senderRole: string; senderId: string; message: string; createdAt: any }>;
    }

    return [...selectedOrder.messages].sort((a, b) => {
      const aTime = (a.createdAt as any)?.toDate?.()?.getTime?.() || new Date(a.createdAt || 0).getTime() || 0;
      const bTime = (b.createdAt as any)?.toDate?.()?.getTime?.() || new Date(b.createdAt || 0).getTime() || 0;
      return aTime - bTime;
    });
  }, [selectedOrder]);

  useEffect(() => {
    setOrderSelectorOpen(false);
  }, [selectedOrderId]);

  useEffect(() => {
    if (!chatScrollRef.current) {
      return;
    }
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages, selectedOrderId]);

  const pendingOrders = useMemo(
    () => orders.filter((order) => normalizeOrderStatus(order.status) === 'pending').length,
    [orders]
  );
  const approvedOrders = useMemo(
    () => orders.filter((order) => normalizeOrderStatus(order.status) === 'approved').length,
    [orders]
  );
  const rejectedOrders = useMemo(
    () => orders.filter((order) => normalizeOrderStatus(order.status) === 'rejected').length,
    [orders]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-accent font-black uppercase tracking-widest">
        Please login to access dashboard
      </div>
    );
  }

  async function markNotificationRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to update notification');
    }
  }

  async function markAllNotificationsRead() {
    const unread = notifications.filter((notification) => !notification.read);
    if (!unread.length) {
      return;
    }

    try {
      const batch = writeBatch(db);
      unread.forEach((notification) => {
        batch.update(doc(db, 'notifications', notification.id), {
          read: true,
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  }

  async function uploadUserMessageAttachment(orderId: string, file: File) {
    if (!user) {
      throw new Error('You must be logged in to upload attachments.');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error('Attachment size must be less than 10MB.');
    }

    const media = await uploadMediaFile({
      file,
      folder: 'chat-attachments',
      relatedType: 'order_message',
      relatedId: orderId,
      relatedOrderId: orderId,
      relatedUserId: user.uid,
      note: 'user-order-chat-attachment',
    });

    return {
      url: media.url,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      media: toStorageMetadata(media, user.uid),
    };
  }

  async function handleSendOrderMessage() {
    if (!selectedOrder || !user) {
      return;
    }

    const trimmed = composerMessage.trim();
    if (!trimmed && !composerAttachment) {
      toast.error('Message or attachment is required');
      return;
    }

    setSendingMessage(true);
    try {
      let attachmentPayload:
        | {
            url: string;
            name: string;
            type: string;
            size: number;
            media: ReturnType<typeof toStorageMetadata>;
          }
        | null = null;

      if (composerAttachment) {
        setAttachmentUploading(true);
        attachmentPayload = await uploadUserMessageAttachment(selectedOrder.id, composerAttachment);
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/orders/${encodeURIComponent(selectedOrder.id)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          attachment: attachmentPayload,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to send message');
      }

      setComposerMessage('');
      setComposerAttachment(null);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      toast.success('Message sent');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast.error('Message failed', message);
    } finally {
      setSendingMessage(false);
      setAttachmentUploading(false);
    }
  }

  function renderMessageContent(entry: any, isOutgoing: boolean) {
    const attachment = getMessageAttachment(entry);
    const attachmentUrl = attachment
      ? withProtectedFileToken(attachment.url, fileAccessToken)
      : '';
    const attachmentIsImage = attachment ? isImageAttachment(attachment) : false;

    return (
      <>
        {entry.message ? <div>{entry.message}</div> : null}
        {attachment ? (
          attachmentIsImage ? (
            <button
              onClick={() => setReceiptViewerUrl(attachmentUrl)}
              className="mt-2 block w-full text-left"
            >
              <img
                src={attachmentUrl}
                alt={attachment.name}
                className="w-full max-h-[220px] object-cover rounded-xl border border-white/20"
              />
              <div className={`mt-1 text-[10px] ${isOutgoing ? 'text-black/70' : 'text-brand-text/60'}`}>
                {attachment.name}
              </div>
            </button>
          ) : (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-flex items-center gap-1.5 underline ${
                isOutgoing ? 'text-black/80' : 'text-brand-text/85'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              {attachment.name}
            </a>
          )
        ) : null}
      </>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'messages', label: 'Order Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <main className="min-h-screen pt-24 pb-40 md:pb-12 px-4 bg-brand-bg">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        <aside className="lg:w-72 flex-shrink-0 hidden lg:block">
          <div className="glass rounded-[2rem] p-6 border border-white/5 sticky top-28 bg-brand-soft/10 backdrop-blur-3xl overflow-hidden">
            <div className="mb-8 pb-8 border-b border-white/5">
              <div className="font-black text-lg text-brand-text uppercase">{profile?.displayName || 'Member'}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mt-1">Realtime Dashboard</div>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === item.id
                      ? 'bg-primary text-brand-bg shadow-lg shadow-primary/10'
                      : 'text-brand-text/40 hover:bg-white/5 hover:text-brand-text'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === 'notifications' && unreadNotifications.length > 0 ? (
                    <span className="ml-auto text-[9px] bg-black/30 px-2 py-1 rounded-md">{unreadNotifications.length}</span>
                  ) : null}
                </button>
              ))}

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent/60 hover:bg-accent/10 hover:text-accent transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </nav>
          </div>
        </aside>

        <div className="flex-1 space-y-8">
          <div className="lg:hidden h-1" />

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black text-brand-text">
                    Welcome, <span className="text-primary">{profile?.displayName?.split(' ')[0] || 'User'}</span>
                  </h2>
                  <p className="text-brand-text/40 text-xs uppercase tracking-[0.2em] font-black mt-2">
                    Realtime orders, messages, and notifications
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Pending', value: pendingOrders, icon: Clock },
                    { label: 'Approved', value: approvedOrders, icon: CheckCircle2 },
                    { label: 'Rejected', value: rejectedOrders, icon: XCircle },
                    { label: 'Unread Alerts', value: unreadNotifications.length, icon: Bell },
                  ].map((stat) => (
                    <div key={stat.label} className="glass p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                          <stat.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xl font-black text-brand-text leading-none">{stat.value}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 mt-1">
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-black uppercase text-brand-text">Recent Orders</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {loadingData ? (
                      <div className="p-10 text-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                        No orders yet.
                      </div>
                    ) : (
                      orders.slice(0, 5).map((order) => (
                        <button
                          key={order.id}
                          onClick={() => {
                            setManualSelectedOrderId(order.id);
                            setActiveTab('messages');
                          }}
                          className="w-full text-left p-6 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-brand-text break-words">{getOrderProductName(order)}</div>
                              <div className="text-[10px] font-semibold text-brand-text/45 mt-1 break-words">
                                {getOrderDisplayId(order)} • {getOrderPlan(order)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                                Rs {Number(order.totalAmount || 0).toFixed(2)}
                              </div>
                              <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusClass(order.status)}`}>
                                {formatOrderStatusLabel(order.status)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-3xl font-black uppercase text-brand-text">My Orders</h2>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  <div className="xl:col-span-4 glass rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                      Orders
                    </div>
                    <div className="divide-y divide-white/5 max-h-[660px] overflow-y-auto">
                      {orders.length === 0 ? (
                        <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                          No orders found.
                        </div>
                      ) : (
                        orders.map((order) => (
                          <div
                            key={order.id}
                            className={`p-4 space-y-2 ${
                              selectedOrderId === order.id ? 'bg-white/5 border-l-2 border-primary' : ''
                            }`}
                          >
                            <div className="text-sm font-semibold text-brand-text break-words">{getOrderProductName(order)}</div>
                            <div className="text-[10px] text-brand-text/45">{formatDateTime(order.createdAt)}</div>
                            <div className="flex items-center justify-between gap-2">
                              <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${statusClass(order.status)}`}>
                                {formatOrderStatusLabel(order.status)}
                              </div>
                              <button
                                onClick={() => setManualSelectedOrderId(order.id)}
                                className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary text-black text-[10px] font-black uppercase tracking-widest"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="xl:col-span-8 glass rounded-2xl border border-white/5 p-4 md:p-5 space-y-4">
                    {!selectedOrder ? (
                      <div className="h-full min-h-[220px] grid place-items-center text-sm text-brand-text/40">
                        Select an order to view full details.
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                          <div className="text-xl md:text-2xl font-semibold text-primary break-words">
                            {getOrderProductName(selectedOrder)}
                          </div>
                          <div className="text-sm text-brand-text/65 break-words">
                            Plan: {getOrderPlan(selectedOrder)} • Qty: {getOrderQuantity(selectedOrder)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-sm font-semibold text-primary">
                              Rs {Number(selectedOrder.totalAmount || 0).toFixed(2)}
                            </div>
                            <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${statusClass(selectedOrder.status)}`}>
                              {formatOrderStatusLabel(selectedOrder.status)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="text-[11px] text-brand-text/45">
                              Order ID: {getOrderDisplayId(selectedOrder)} • {formatDateTime(selectedOrder.createdAt)}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderDetails((prev) => ({
                                  ...prev,
                                  [selectedOrder.id]: !prev[selectedOrder.id],
                                }))
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black hover:bg-primary transition-colors"
                            >
                              {selectedOrderDetailsExpanded ? 'Hide Details' : 'View Details'}
                            </button>
                          </div>
                        </div>

                        {selectedOrderDetailsExpanded ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-brand-text/35">Delivery Email</div>
                                <div className="text-brand-text break-all mt-1">{getOrderDeliveryEmail(selectedOrder)}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-brand-text/35">Phone</div>
                                <div className="text-brand-text break-words mt-1">{getOrderPhone(selectedOrder)}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-brand-text/35">Payment Method</div>
                                <div className="text-brand-text break-words mt-1">{getPaymentMethod(selectedOrder)}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-brand-text/35">Sender Account</div>
                                <div className="text-brand-text break-words mt-1">{getSenderAccount(selectedOrder)}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 md:col-span-2">
                                <div className="text-[10px] uppercase tracking-widest text-brand-text/35">Transaction ID</div>
                                <div className="text-brand-text break-words mt-1">{getTransactionId(selectedOrder)}</div>
                              </div>
                            </div>

                            {getScreenshotUrl(selectedOrder) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setReceiptViewerUrl(
                                    withProtectedFileToken(getScreenshotUrl(selectedOrder), fileAccessToken)
                                  )
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left"
                              >
                                <img
                                  src={withProtectedFileToken(getScreenshotUrl(selectedOrder), fileAccessToken)}
                                  alt="Payment proof"
                                  className="w-full max-h-[280px] object-cover rounded-lg"
                                />
                                <div className="mt-2 text-[11px] text-brand-text/55">Tap to view fullscreen receipt</div>
                              </button>
                            ) : (
                              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-sm text-brand-text/45">
                                Image not uploaded
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-brand-text/60">
                            Order payment and receipt details are hidden. Click <span className="text-primary font-semibold">View Details</span> to open them.
                          </div>
                        )}

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 min-h-[440px] flex flex-col">
                          <div className="mb-3 text-[10px] uppercase tracking-widest text-brand-text/35">Message Thread</div>
                          <div className="flex-1 space-y-2 min-h-[240px] max-h-[420px] overflow-y-auto pr-1">
                            {messages.length === 0 ? (
                              <div className="h-full min-h-[200px] grid place-items-center text-sm text-brand-text/40">
                                No messages yet. Start conversation below.
                              </div>
                            ) : (
                              messages.map((entry, index) => {
                                const isOutgoing = isUserOutgoingMessage(entry, user.uid);
                                return (
                                  <div
                                    key={`${entry.senderId}-${index}`}
                                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                                        isOutgoing ? 'bg-[#E3B80D] text-black' : 'bg-white/15 text-brand-text'
                                      }`}
                                    >
                                      {renderMessageContent(entry, isOutgoing)}
                                      <div className={`mt-1 text-[10px] ${isOutgoing ? 'text-black/60' : 'text-brand-text/45'}`}>
                                        {formatDateTime(entry.createdAt)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="mt-3 border-t border-white/10 pt-3">
                            {composerAttachment ? (
                              <div className="mb-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-brand-text flex items-center justify-between gap-2">
                                <span className="truncate">{composerAttachment.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComposerAttachment(null);
                                    if (attachmentInputRef.current) {
                                      attachmentInputRef.current.value = '';
                                    }
                                  }}
                                  className="text-brand-text/70 hover:text-brand-text"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : null}

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                              <button
                                type="button"
                                onClick={() => attachmentInputRef.current?.click()}
                                disabled={!selectedOrder || sendingMessage || attachmentUploading}
                                className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/15 text-brand-text/75 grid place-items-center hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                                title="Attach file"
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <input
                                ref={attachmentInputRef}
                                type="file"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0] || null;
                                  setComposerAttachment(file);
                                }}
                              />
                              <textarea
                                value={composerMessage}
                                onChange={(event) => setComposerMessage(event.target.value)}
                                placeholder={selectedOrder ? 'Type your message for admin' : 'Select an order first'}
                                rows={2}
                                disabled={!selectedOrder || sendingMessage || attachmentUploading}
                                className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-primary/50 disabled:opacity-50"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  void handleSendOrderMessage();
                                }}
                                disabled={!selectedOrder || sendingMessage || attachmentUploading}
                                className="shrink-0 rounded-xl bg-primary px-4 py-3 text-black text-[11px] font-black uppercase tracking-widest border-b-2 border-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {sendingMessage || attachmentUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'messages' && (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <h2 className="text-3xl font-black uppercase text-brand-text">Order Messages</h2>

                <div className="glass rounded-2xl border border-white/5 p-4 md:p-5 min-h-[70vh] flex flex-col gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setOrderSelectorOpen((prev) => !prev)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/35">Select Order</div>
                        <div className="text-sm font-semibold text-brand-text truncate">
                          {selectedOrder ? `${getOrderProductName(selectedOrder)} (${getOrderDisplayId(selectedOrder)})` : 'Choose an order'}
                        </div>
                      </div>
                      <ChevronsUpDown className="w-4 h-4 text-brand-text/55 shrink-0" />
                    </button>

                    {orderSelectorOpen ? (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-white/10 bg-[#111111] shadow-2xl overflow-hidden">
                        <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                          {orders.length === 0 ? (
                            <div className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                              No orders found.
                            </div>
                          ) : (
                            orders.map((order) => (
                              <button
                                key={order.id}
                                onClick={() => {
                                  setManualSelectedOrderId(order.id);
                                  setOrderSelectorOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                                  selectedOrderId === order.id ? 'bg-white/10' : ''
                                }`}
                              >
                                <div className="text-sm font-semibold text-brand-text break-words">{getOrderProductName(order)}</div>
                                <div className="text-[10px] text-brand-text/45 mt-1 break-words">
                                  {getOrderDisplayId(order)} - {formatOrderStatusLabel(order.status)}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                      {selectedOrder ? `Chat - ${getOrderDisplayId(selectedOrder)}` : 'Select an order to start'}
                    </div>

                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                      {!selectedOrder ? (
                        <div className="h-full min-h-[220px] grid place-items-center text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                          Select an order from top.
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full min-h-[220px] grid place-items-center text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                          No messages yet. Start the chat below.
                        </div>
                      ) : (
                        messages.map((entry, index) => {
                          const isOutgoing = isUserOutgoingMessage(entry, user.uid);
                          return (
                            <div key={`${entry.senderId}-${index}`} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                  isOutgoing ? 'bg-[#E3B80D] text-black' : 'bg-white/15 text-brand-text'
                                }`}
                              >
                                {renderMessageContent(entry, isOutgoing)}
                                <div className={`mt-1 text-[10px] ${isOutgoing ? 'text-black/60' : 'text-brand-text/45'}`}>
                                  {formatDateTime(entry.createdAt)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-white/10 p-3">
                      {composerAttachment ? (
                        <div className="mb-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-brand-text flex items-center justify-between gap-2">
                          <span className="truncate">{composerAttachment.name}</span>
                          <button
                            onClick={() => {
                              setComposerAttachment(null);
                              if (attachmentInputRef.current) {
                                attachmentInputRef.current.value = '';
                              }
                            }}
                            className="text-brand-text/70 hover:text-brand-text"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : null}

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                        <button
                          type="button"
                          onClick={() => attachmentInputRef.current?.click()}
                          disabled={!selectedOrder || sendingMessage || attachmentUploading}
                          className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/15 text-brand-text/75 grid place-items-center hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                          title="Attach file"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setComposerAttachment(file);
                          }}
                        />
                        <textarea
                          value={composerMessage}
                          onChange={(event) => setComposerMessage(event.target.value)}
                          placeholder={selectedOrder ? 'Type your message for admin' : 'Select an order first'}
                          rows={2}
                          disabled={!selectedOrder || sendingMessage || attachmentUploading}
                          className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-primary/50 disabled:opacity-50"
                        />
                        <button
                          onClick={() => {
                            void handleSendOrderMessage();
                          }}
                          disabled={!selectedOrder || sendingMessage || attachmentUploading}
                          className="shrink-0 rounded-xl bg-primary px-4 py-3 text-black text-[11px] font-black uppercase tracking-widest border-b-2 border-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {sendingMessage || attachmentUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-3xl font-black uppercase text-brand-text">Notifications</h2>
                  <button
                    onClick={() => {
                      void markAllNotificationsRead();
                    }}
                    className="px-5 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest border-b-2 border-secondary"
                  >
                    Mark All Read
                  </button>
                </div>

                <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            void markNotificationRead(notification.id);
                            if (notification.orderId) {
                              setManualSelectedOrderId(notification.orderId);
                              setActiveTab('messages');
                            }
                          }}
                          className="w-full text-left p-6 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-black text-brand-text whitespace-pre-wrap break-words">
                                {notification.title}
                              </div>
                              <div className="text-[11px] font-medium text-brand-text/55 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                                {notification.body}
                              </div>
                              <div className="text-[9px] font-black tracking-widest text-brand-text/30 mt-2">
                                {formatDateTime(notification.createdAt)}
                              </div>
                            </div>
                            {!notification.read ? <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" /> : null}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-3xl font-black uppercase text-brand-text">Settings</h2>
                <div className="glass rounded-2xl border border-white/5 p-8 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Account Email</div>
                  <div className="text-sm font-semibold text-brand-text break-all">{user.email || 'N/A'}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Display Name</div>
                  <div className="text-sm font-semibold text-brand-text">{profile?.displayName || 'N/A'}</div>
                  <button
                    onClick={logout}
                    className="lg:hidden mt-4 w-full py-3 rounded-xl border border-accent/30 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {receiptViewerUrl ? (
        <div className="fixed inset-0 z-[95] bg-black/90 p-4 md:p-8">
          <button
            onClick={() => setReceiptViewerUrl('')}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/55 border border-white/20 text-white"
          >
            <XCircle className="w-5 h-5" />
          </button>
          <div className="w-full h-full grid place-items-center">
            <img
              src={receiptViewerUrl}
              alt="Payment receipt"
              className="max-w-full max-h-full object-contain rounded-xl border border-white/20"
            />
          </div>
        </div>
      ) : null}

      <div className="lg:hidden fixed bottom-0 left-0 w-full z-[85] bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-3 pb-safe">
        <div className="grid grid-cols-5 gap-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 ${
                activeTab === item.id ? 'text-primary bg-primary/15' : 'text-brand-text/40'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">{item.label.replace('Order ', '')}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}

