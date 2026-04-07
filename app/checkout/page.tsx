'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { auth, db } from '@/firebase';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import type { PaymentMethod, ProductItem } from '@/lib/types/domain';
import { uploadFile } from '@/lib/storage-utils';
import { useToast } from '@/components/ToastProvider';

interface CheckoutItem {
  productId: string;
  title: string;
  quantity: number;
  selectedPlanName?: string | null;
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
    return Number(product.salePrice ?? product.price ?? 0);
  }

  const normalized = (selectedPlanName || '').trim().toLowerCase();
  const match = plans.find((plan) => (plan.planName || '').trim().toLowerCase() === normalized) || plans[0];
  return Number(match.salePrice ?? match.ourPrice ?? product.salePrice ?? match.officialPrice ?? product.price ?? 0);
}

function CheckoutPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const checkoutMode = params.get('mode') || 'single';
  const productId = params.get('productId');
  const quantityParam = Number(params.get('quantity') || 1);
  const selectedPlanName = params.get('plan');

  useEffect(() => {
    const q = query(collection(db, 'payment_methods'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const methods = snapshot.docs
        .map((snap) => ({ id: snap.id, ...(snap.data() as Omit<PaymentMethod, 'id'>) }));
      setPaymentMethods(methods);
      if (!selectedPaymentMethodId && methods.length) {
        setSelectedPaymentMethodId(methods[0].id);
      }
    }, (error) => {
      console.error('Failed to load payment methods:', error);
    });

    return () => unsubscribe();
  }, [selectedPaymentMethodId]);

  useEffect(() => {
    let mounted = true;

    async function hydrateItems() {
      try {
        if (checkoutMode === 'cart') {
          if (!cart.length) {
            setItems([]);
            return;
          }

          const docs = await Promise.all(
            cart.map(async (cartItem) => {
              const snap = await getDoc(doc(db, 'services', cartItem.id));
              if (!snap.exists()) {
                return null;
              }
              const product = { id: snap.id, ...(snap.data() as Omit<ProductItem, 'id'>) };
              const unitPrice = Number(product.salePrice ?? product.price ?? cartItem.price ?? 0);
              return {
                productId: product.id,
                title: getProductTitle(product),
                quantity: cartItem.quantity,
                unitPrice,
                totalPrice: unitPrice * cartItem.quantity,
                selectedPlanName: null,
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

    hydrateItems();

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

    return () => URL.revokeObjectURL(previewUrl);
  }, [proofFile]);

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethodId) || null,
    [paymentMethods, selectedPaymentMethodId]
  );

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice, 0), [items]);

  async function copyText(value: string) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
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

    if (!selectedPaymentMethodId) {
      setErrorMessage('Select a payment method.');
      toast.error('Select a payment method');
      return;
    }

    if (!senderName.trim() || !senderNumber.trim() || !transactionId.trim()) {
      setErrorMessage('Sender details and transaction ID are required.');
      toast.error('Missing payment details', 'Sender name, number, and transaction ID are required.');
      return;
    }

    if (proofFile) {
      if (!proofFile.type.startsWith('image/')) {
        setErrorMessage('Payment proof must be an image file.');
        toast.error('Invalid proof format', 'Payment proof must be an image.');
        return;
      }

      if (proofFile.size > MAX_PROOF_SIZE_BYTES) {
        setErrorMessage('Image size must be less than 5MB.');
        toast.error('Image too large', 'Max size is 5MB.');
        return;
      }
    }

    setSubmitting(true);

    try {
      let proofUrl = '';
      if (proofFile) {
        const extension = proofFile.name.split('.').pop() || 'png';
        proofUrl = await uploadFile(
          proofFile,
          `payment-proofs/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        );
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Unable to verify your session. Please login again.');
      }

      let idToken = await currentUser.getIdToken(true);
      if (!idToken) {
        throw new Error('Unable to verify your session. Please login again.');
      }

      const payloadBody = JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedPlanName: item.selectedPlanName,
        })),
        paymentMethodId: selectedPaymentMethodId,
        paymentProof: {
          senderName: senderName.trim(),
          senderNumber: senderNumber.trim(),
          transactionId: transactionId.trim(),
          screenshotUrl: proofUrl || '',
          note: note.trim(),
        },
        note: note.trim(),
      });

      let response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: payloadBody,
      });

      if (response.status === 401) {
        idToken = await currentUser.getIdToken(true);
        response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: payloadBody,
        });
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to place order');
      }

      if (checkoutMode === 'cart') {
        clearCart();
      }

      setSuccessMessage(`Order ${payload.orderNumber} submitted successfully. It can be activated within 30 minutes.`);
      toast.success('Order submitted', `Order ${payload.orderNumber} is pending verification.`);
      setProofFile(null);
      setSenderName('');
      setSenderNumber('');
      setTransactionId('');
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
          <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest mt-4">Please login to complete your order securely.</p>
          <Link href="/" className="inline-flex mt-8 bg-primary text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary">
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
          <h1 className="text-4xl md:text-5xl font-black uppercase text-brand-text">Secure <span className="text-primary">Checkout</span></h1>
          <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Payment Proof + Admin Verification</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl border border-white/5 p-10 text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">
            No checkout item found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
                <h2 className="text-xl font-black uppercase text-brand-text">Payment Method</h2>

                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethodId(method.id)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedPaymentMethodId === method.id ? 'bg-primary text-black border-primary' : 'bg-white/5 text-brand-text/40 border-white/10 hover:border-primary/30'}`}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>

                {!selectedPaymentMethod ? (
                  <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/30">No active payment methods configured.</div>
                ) : (
                  <div className="bg-black/20 rounded-xl md:rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-brand-text/30 font-black">Account Title</div>
                        <div className="text-base md:text-lg font-black text-brand-text flex items-center gap-2 mt-2">
                          {selectedPaymentMethod.accountTitle}
                          <button onClick={() => copyText(selectedPaymentMethod.accountTitle)} className="text-primary text-[10px] uppercase">Copy</button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-brand-text/30 font-black">Account Number</div>
                        <div className="text-base md:text-lg font-black text-brand-text flex items-center gap-2 mt-2">
                          {selectedPaymentMethod.accountNumber}
                          <button onClick={() => copyText(selectedPaymentMethod.accountNumber)} className="text-primary text-[10px] uppercase">Copy</button>
                        </div>
                      </div>
                    </div>

                    {selectedPaymentMethod.instructions ? (
                      <div className="text-[11px] font-black uppercase tracking-widest text-brand-text/40 leading-relaxed border-t border-white/10 pt-4">
                        {selectedPaymentMethod.instructions}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
                <h2 className="text-xl font-black uppercase text-brand-text">Payment Proof</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={senderName}
                    onChange={(event) => setSenderName(event.target.value)}
                    placeholder="Sender name"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={senderNumber}
                    onChange={(event) => setSenderNumber(event.target.value)}
                    placeholder="Sender number"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value)}
                    placeholder="Transaction ID"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <label className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 text-sm flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
                    <span className="text-brand-text/40">Upload screenshot (optional)</span>
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
                </div>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note"
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />

                {proofPreview ? (
                  <div className="border border-white/10 rounded-xl md:rounded-2xl overflow-hidden max-w-sm">
                    <img src={proofPreview} alt="Payment proof preview" className="w-full h-auto" />
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="text-xs font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 rounded-xl md:rounded-2xl px-4 py-3">{errorMessage}</div>
                ) : null}

                {successMessage ? (
                  <div className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl md:rounded-2xl px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {successMessage}
                  </div>
                ) : null}

                <button
                  onClick={handleSubmit}
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase text-brand-text">Totals</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Summary</span>
                </div>
                <div className="space-y-3 border border-white/10 rounded-xl md:rounded-2xl p-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.selectedPlanName || 'default'}`} className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-brand-text">{item.title}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">
                        {item.selectedPlanName ? `Plan: ${item.selectedPlanName}` : 'Standard'} · Qty: {item.quantity}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                        Total: <span className="text-brand-text">{toCurrency(item.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 text-[10px] uppercase tracking-widest font-black">
                  <div className="flex justify-between text-brand-text/40">
                    <span>Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between text-brand-text/40">
                    <span>Quantity</span>
                    <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between text-brand-text text-sm">
                    <span>Total Amount</span>
                    <span className="text-primary">{toCurrency(subtotal)}</span>
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/30 leading-relaxed border-t border-white/5 pt-4">
                  After submission, your order status will be set to <span className="text-primary">pending verification</span>. Activation is typically completed within 30 minutes.
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

