'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { db } from '@/firebase';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { PaymentMethod, ProductItem } from '@/lib/types/domain';
import { createOrderPublicId } from '@/lib/order-system';
import { uploadFile } from '@/lib/storage-utils';
import { useToast } from '@/components/ToastProvider';

interface CheckoutItem {
  productId: string;
  title: string;
  quantity: number;
  selectedPlanName?: string | null;
  durationLabel?: string | null;
  planType?: string | null;
  unitPrice: number;
  totalPrice: number;
  productType: 'tools' | 'services';
}

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

function toCurrency(amount: number) {
  return `Rs ${amount.toFixed(2)}`;
}

function getProductTitle(product: ProductItem) {
  return product.title || product.name || 'Product';
}

function extractPlanPrice(product: ProductItem, selectedPlanName?: string | null) {
  const plans = Array.isArray(product.plans) ? product.plans : [];
  if (!plans.length) {
    return Number(product.price ?? product.salePrice ?? 0);
  }

  const normalized = (selectedPlanName || '').trim().toLowerCase();
  const match = plans.find((plan) => (plan.planName || '').trim().toLowerCase() === normalized) || plans[0];
  return Number(match.ourPrice ?? match.salePrice ?? product.price ?? product.salePrice ?? 0);
}

function CheckoutPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const toast = useToast();

  const checkoutMode = params.get('mode') || 'single';
  const productId = params.get('productId');
  const quantityParam = Number(params.get('quantity') || 1);
  const selectedPlanName = params.get('plan');
  const requestedOrderId = params.get('orderId')?.trim();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [orderId, setOrderId] = useState(() => requestedOrderId || createOrderPublicId());

  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');

  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setDeliveryEmail(user?.email || '');
  }, [user?.email]);

  useEffect(() => {
    const q = query(collection(db, 'payment_methods'), where('active', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const methods = snapshot.docs
          .map((snap) => ({ id: snap.id, ...(snap.data() as Omit<PaymentMethod, 'id'>) }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        setPaymentMethods(methods);
        if (!methods.find((entry) => entry.id === selectedPaymentMethodId)) {
          setSelectedPaymentMethodId(methods[0]?.id || '');
        }
      },
      (snapshotError) => {
        console.error('Failed to load payment methods:', snapshotError);
      }
    );

    return () => unsubscribe();
  }, [selectedPaymentMethodId]);

  useEffect(() => {
    let mounted = true;

    async function hydrateItems() {
      setLoading(true);
      try {
        if (checkoutMode === 'cart') {
          if (!cart.length) {
            if (mounted) {
              setItems([]);
            }
            return;
          }

          const docs = await Promise.all(
            cart.map(async (cartItem) => {
              const snap = await getDoc(doc(db, 'services', cartItem.id));
              if (!snap.exists()) {
                return null;
              }
              const product = { id: snap.id, ...(snap.data() as Omit<ProductItem, 'id'>) };
              const unitPrice = Number(product.price ?? product.salePrice ?? cartItem.price ?? 0);
              return {
                productId: product.id,
                title: getProductTitle(product),
                quantity: Math.max(1, Number(cartItem.quantity || 1)),
                unitPrice,
                totalPrice: unitPrice * Math.max(1, Number(cartItem.quantity || 1)),
                selectedPlanName: null,
                durationLabel: (product as any).duration || '',
                planType: (product as any).planType || '',
                productType: (product.type || 'tools') as 'tools' | 'services',
              } as CheckoutItem;
            })
          );

          if (mounted) {
            setItems(docs.filter((value): value is CheckoutItem => Boolean(value)));
          }
          return;
        }

        if (!productId) {
          if (mounted) {
            setItems([]);
          }
          return;
        }

        const snap = await getDoc(doc(db, 'services', productId));
        if (!snap.exists()) {
          if (mounted) {
            setItems([]);
          }
          return;
        }

        const product = { id: snap.id, ...(snap.data() as Omit<ProductItem, 'id'>) };
        const quantity = Math.max(1, Number.isFinite(quantityParam) ? quantityParam : 1);
        const unitPrice = extractPlanPrice(product, selectedPlanName);

        if (mounted) {
          setItems([
            {
              productId: product.id,
              title: getProductTitle(product),
              quantity,
              selectedPlanName,
              durationLabel: (product as any).duration || '',
              planType: (product as any).planType || '',
              unitPrice,
              totalPrice: unitPrice * quantity,
              productType: (product.type || 'tools') as 'tools' | 'services',
            },
          ]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void hydrateItems();

    return () => {
      mounted = false;
    };
  }, [checkoutMode, productId, quantityParam, selectedPlanName, cart]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(proofFile);
    setProofPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [proofFile]);

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethodId) || null,
    [paymentMethods, selectedPaymentMethodId]
  );

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice, 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  async function resolveUniqueOrderId() {
    let candidate = orderId || createOrderPublicId();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const snap = await getDoc(doc(db, 'orders', candidate));
      if (!snap.exists()) {
        return candidate;
      }
      candidate = createOrderPublicId();
    }

    throw new Error('Unable to generate a unique order ID. Please try again.');
  }

  async function uploadPaymentProof(uid: string, finalOrderId: string) {
    if (!proofFile) {
      return '';
    }

    if (!proofFile.type.startsWith('image/')) {
      throw new Error('Payment screenshot must be an image.');
    }

    if (proofFile.size > MAX_PROOF_SIZE_BYTES) {
      throw new Error('Screenshot size must be less than 5MB.');
    }

    const extension = proofFile.name.split('.').pop() || 'png';
    return uploadFile(
      proofFile,
      `payment-proofs/${uid}/${finalOrderId}-${Date.now()}.${extension}`
    );
  }

  async function handleSubmit() {
    setErrorMessage('');
    setSuccessMessage('');

    if (!user) {
      setErrorMessage('Please login first to place your order.');
      toast.error('Login required', 'Please login to place your order.');
      return;
    }

    if (!items.length) {
      setErrorMessage('No order items found.');
      toast.error('No order items found');
      return;
    }

    const emailValue = (deliveryEmail || user.email || '').trim().toLowerCase();
    const phoneValue = phone.trim();
    const senderValue = senderAccount.trim();
    const transactionValue = transactionId.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue || !emailPattern.test(emailValue)) {
      setErrorMessage('A valid target email is required for delivery.');
      toast.error('Valid delivery email is required');
      return;
    }

    if (!phoneValue || phoneValue.length < 7 || !/[0-9]/.test(phoneValue)) {
      setErrorMessage('A valid phone/contact number is required.');
      toast.error('Phone number is required');
      return;
    }

    if (!selectedPaymentMethod) {
      setErrorMessage('Please select a payment method.');
      toast.error('Payment method required');
      return;
    }

    if (!senderValue) {
      setErrorMessage('Sender number/account is required.');
      toast.error('Sender account is required');
      return;
    }

    if (!transactionValue) {
      setErrorMessage('Transaction ID is required.');
      toast.error('Transaction ID is required');
      return;
    }

    setSubmitting(true);

    try {
      const finalOrderId = await resolveUniqueOrderId();
      const proofUrl = await uploadPaymentProof(user.uid, finalOrderId);
      const timestamp = serverTimestamp();

      await setDoc(doc(db, 'orders', finalOrderId), {
        orderId: finalOrderId,
        order_id: finalOrderId,
        userId: user.uid,
        user_id: user.uid,
        userName: user.displayName || '',
        userEmail: emailValue,
        email: emailValue,
        deliveryEmail: emailValue,
        targetEmail: emailValue,
        userPhone: phoneValue,
        phone: phoneValue,
        items,
        itemSummary: items.map((item) => ({
          productId: item.productId,
          productTitle: item.title,
          selectedPlanName: item.selectedPlanName || null,
          durationLabel: item.durationLabel || null,
          planType: item.planType || null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          productType: item.productType,
        })),
        primaryItemName: items[0]?.title || '',
        primaryPlanName: items[0]?.selectedPlanName || selectedPlanName || null,
        primaryDuration: items[0]?.durationLabel || '',
        primaryPlanType: items[0]?.planType || '',
        primaryQuantity: items[0]?.quantity || 1,
        primaryUnitPrice: items[0]?.unitPrice || 0,
        selectedPlanName: selectedPlanName || null,
        subtotal,
        totalAmount: Number(subtotal.toFixed(2)),
        quantityTotal: totalQuantity,
        currency: 'PKR',
        status: 'pending',

        paymentMethodId: selectedPaymentMethod.id,
        paymentMethodName: selectedPaymentMethod.name,
        paymentMethodSnapshot: {
          name: selectedPaymentMethod.name,
          accountTitle: selectedPaymentMethod.accountTitle,
          accountNumber: selectedPaymentMethod.accountNumber,
          instructions: selectedPaymentMethod.instructions || '',
        },

        paymentProof: {
          senderAccount: senderValue,
          senderNumber: senderValue,
          transactionId: transactionValue,
          screenshotUrl: proofUrl || '',
        },

        adminMessage: '',
        rejectionReason: '',
        latestMessagePreview: 'Order submitted and pending review.',
        latestMessageAt: timestamp,
        tickerState: 'new',
        createdAt: timestamp,
        created_at: timestamp,
        updatedAt: timestamp,
        updated_at: timestamp,
        statusUpdatedAt: timestamp,
        status_updated_at: timestamp,
        note: note.trim().slice(0, 1000),
      });

      if (checkoutMode === 'cart') {
        clearCart();
      }

      setOrderId(createOrderPublicId());
      setSuccessMessage(`Order ${finalOrderId} submitted successfully. Admin will review it soon.`);
      toast.success('Order submitted', `Order ${finalOrderId} is now pending.`);
      setPhone('');
      setSenderAccount('');
      setTransactionId('');
      setProofFile(null);
      setNote('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit order.';
      setErrorMessage(message);
      toast.error('Order failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen pt-32 pb-20 px-4 bg-brand-bg">
        <div className="max-w-2xl mx-auto glass rounded-[2rem] border border-white/5 p-10 text-center">
          <h1 className="text-3xl font-black uppercase text-brand-text">Login Required</h1>
          <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest mt-4">
            Please login to complete your order securely.
          </p>
          <Link
            href="/"
            className="inline-flex mt-8 bg-primary text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary"
          >
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-4 bg-brand-bg">
      <div className="max-w-6xl mx-auto space-y-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-brand-text/40 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-brand-text">
            Secure <span className="text-primary">Checkout</span>
          </h1>
          <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Payment Method + Proof + Realtime Admin Review
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl border border-white/5 p-10 text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">
            No checkout item found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black uppercase text-brand-text">Delivery Email / Contact Number</h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Required</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-gradient-to-r from-white via-[#FFF3B8] to-primary p-[1px]">
                    <input
                      type="email"
                      value={deliveryEmail}
                      onChange={(event) => setDeliveryEmail(event.target.value)}
                      placeholder="Target / delivery email"
                      required
                      className="w-full rounded-2xl bg-[#0B0B0B] border border-white/10 px-4 py-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-primary/55"
                    />
                  </div>

                  <div className="rounded-2xl bg-gradient-to-r from-white via-[#FFF3B8] to-primary p-[1px]">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Phone number"
                      required
                      className="w-full rounded-2xl bg-[#0B0B0B] border border-white/10 px-4 py-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-primary/55"
                    />
                  </div>
                </div>
              </section>

              <section className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
                <h2 className="text-xl font-black uppercase text-brand-text">Payment Method</h2>

                {paymentMethods.length === 0 ? (
                  <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/30">
                    No active payment methods configured by admin.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPaymentMethodId(method.id)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            selectedPaymentMethodId === method.id
                              ? 'bg-primary text-black border-primary'
                              : 'bg-white/5 text-brand-text/50 border-white/10 hover:border-primary/40'
                          }`}
                        >
                          {method.name}
                        </button>
                      ))}
                    </div>

                    {selectedPaymentMethod ? (
                      <div className="rounded-xl md:rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-[9px] uppercase tracking-widest text-brand-text/35 font-black">Account Title</div>
                            <div className="text-base font-black text-brand-text mt-1">{selectedPaymentMethod.accountTitle}</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-widest text-brand-text/35 font-black">Account Number</div>
                            <div className="text-base font-black text-brand-text mt-1">{selectedPaymentMethod.accountNumber}</div>
                          </div>
                        </div>
                        {selectedPaymentMethod.instructions ? (
                          <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/45 border-t border-white/10 pt-4">
                            {selectedPaymentMethod.instructions}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              <section className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
                <h2 className="text-xl font-black uppercase text-brand-text">Payment Proof</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-gradient-to-r from-white via-[#FFF3B8] to-primary p-[1px]">
                    <input
                      type="text"
                      value={senderAccount}
                      onChange={(event) => setSenderAccount(event.target.value)}
                      placeholder="Sender number / sender account"
                      required
                      className="w-full rounded-2xl bg-[#0B0B0B] border border-white/10 px-4 py-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-primary/55"
                    />
                  </div>

                  <div className="rounded-2xl bg-gradient-to-r from-white via-[#FFF3B8] to-primary p-[1px]">
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(event) => setTransactionId(event.target.value)}
                      placeholder="Transaction ID"
                      required
                      className="w-full rounded-2xl bg-[#0B0B0B] border border-white/10 px-4 py-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-primary/55"
                    />
                  </div>
                </div>

                <label className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 text-sm flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
                  <span className="text-brand-text/45 font-black uppercase tracking-widest text-[10px]">
                    Upload screenshot proof (optional)
                  </span>
                  <Upload className="w-4 h-4 text-primary" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setProofFile(file);
                    }}
                  />
                </label>

                {proofPreview ? (
                  <div className="border border-white/10 rounded-xl md:rounded-2xl overflow-hidden max-w-sm">
                    <img src={proofPreview} alt="Payment proof preview" className="w-full h-auto" />
                  </div>
                ) : null}

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note for admin"
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />

                {errorMessage ? (
                  <div className="text-xs font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 rounded-xl md:rounded-2xl px-4 py-3">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl md:rounded-2xl px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {successMessage}
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={submitting || !paymentMethods.length}
                  className="w-full bg-primary text-black py-4 rounded-xl text-[11px] font-black uppercase tracking-widest border-b-4 border-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Submit Order
                </button>
              </section>
            </div>

            <div className="space-y-6">
              <section className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 space-y-5 sticky top-28">
                <h3 className="text-lg font-black uppercase text-brand-text">Order Summary</h3>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.selectedPlanName || 'default'}`} className="space-y-2">
                      <div className="text-base font-black text-brand-text whitespace-pre-wrap break-words">{item.title}</div>
                      <div className="text-[10px] font-black tracking-widest text-brand-text/45">
                        Plan: {item.selectedPlanName || 'Standard'} - Qty: {item.quantity}
                      </div>
                      <div className="text-lg font-black text-primary">
                        {toCurrency(item.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-2 text-[10px] uppercase tracking-widest font-black">
                  <div className="flex justify-between text-brand-text/40">
                    <span>Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between text-brand-text/40">
                    <span>Quantity</span>
                    <span>{totalQuantity}</span>
                  </div>
                  <div className="flex justify-between text-brand-text/40">
                    <span>Payment Method</span>
                    <span className="text-brand-text">{selectedPaymentMethod?.name || 'Select one'}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between text-brand-text text-sm">
                    <span>Total Amount</span>
                    <span className="text-primary">{toCurrency(subtotal)}</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-1">
                  <div className="text-[9px] uppercase tracking-widest font-black text-brand-text/35">Order ID</div>
                  <div className="text-[10px] font-black text-brand-text/60 break-all">{orderId}</div>
                </div>

                <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/30 leading-relaxed border-t border-white/5 pt-4">
                  Admin verifies payment proof, sender account, and transaction before approval.
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-28 pb-20 px-4 bg-brand-bg">
          <div className="max-w-6xl mx-auto py-20 flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </main>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
