'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Copy, HelpCircle, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { PaymentMethod, ProductItem } from '@/lib/types/domain';
import { createOrderPublicId } from '@/lib/order-system';
import { toStorageMetadata, uploadMediaFile } from '@/lib/storage-utils';
import { useToast } from '@/components/ToastProvider';
import UploadedImage from '@/components/UploadedImage';
import {
  getCouponEligibleSubtotal,
  isCouponExpired,
  normalizeCoupon,
  normalizeCouponScope,
  type CouponScope,
} from '@/lib/coupons';

interface CheckoutItem {
  productId: string;
  productSlug?: string;
  slug?: string;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  title: string;
  quantity: number;
  selectedPlanName?: string | null;
  durationLabel?: string | null;
  planType?: string | null;
  unitPrice: number;
  totalPrice: number;
  productType: 'tools' | 'services';
}

interface AppliedCoupon {
  code: string;
  discountPercentage: number;
  scope: CouponScope;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  productId?: string;
  itemId?: string;
  toolId?: string;
  slug?: string;
  productName?: string;
  productSlug?: string;
  eligibleSubtotal: number;
}

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;
const MANUAL_WHATSAPP_NUMBER = '923209310656';
const CHECKOUT_TUTORIAL_DISMISSED_KEY = 'checkout_tutorial_dismissed_v1';

type CheckoutTutorialStep = {
  id: 'order-summary' | 'contact-fields' | 'payment-method' | 'payment-proof' | 'submit-order';
  title: string;
  description: string;
};

function toCurrency(amount: number) {
  return `Rs ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(amount)}`;
}

function toTokenSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

function isManualChatPaymentMethod(method: PaymentMethod | null) {
  if (!method) {
    return false;
  }
  if (method.paymentType === 'manual_chat') {
    return true;
  }
  if (method.paymentType === 'standard') {
    return false;
  }
  return (method.name || '').trim().toLowerCase().includes('manual');
}

function getPaymentMethodDisplayName(method: PaymentMethod) {
  if (isManualChatPaymentMethod(method)) {
    return method.name?.trim() || 'Manual Chat (WhatsApp)';
  }
  return method.name;
}

async function copyText(value: string) {
  const text = (value || '').trim();
  if (!text) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return false;
}

function buildWhatsAppManualOrderMessage({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  paymentMethodName,
  items,
  totalAmount,
  note,
}: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethodName: string;
  items: CheckoutItem[];
  totalAmount: number;
  note: string;
}) {
  const itemLines = items.map((item, index) => {
    return [
      `Item ${index + 1}: ${item.title}`,
      `Plan: ${item.selectedPlanName || 'Standard'}`,
      `Quantity: ${item.quantity}`,
      `Unit Price: ${toCurrency(item.unitPrice)}`,
      `Line Total: ${toCurrency(item.totalPrice)}`,
      item.durationLabel ? `Duration: ${item.durationLabel}` : '',
      item.planType ? `Plan Type: ${item.planType}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
  });

  const lines = [
    'Assalam o Alaikum, I want to place a manual order.',
    '',
    'Order Details:',
    `Order ID: ${orderId}`,
    `Customer Name: ${customerName || 'N/A'}`,
    `Customer Email: ${customerEmail}`,
    `Customer Phone: ${customerPhone}`,
    `Selected Payment Method: ${paymentMethodName}`,
    '',
    'Items:',
    ...itemLines,
    '',
    `Total Amount: ${toCurrency(totalAmount)}`,
  ];

  if (note) {
    lines.push(`Checkout Note: ${note}`);
  }

  return lines.join('\n');
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
  const { user, loading: authLoading } = useAuth();
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
  const [couponCode, setCouponCode] = useState(() => (params.get('coupon') || '').trim());
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(CHECKOUT_TUTORIAL_DISMISSED_KEY) !== '1';
  });
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [mobileSummaryVisible, setMobileSummaryVisible] = useState(true);
  const [mobileSummaryClosed, setMobileSummaryClosed] = useState(false);

  const contactSectionRef = useRef<HTMLElement | null>(null);
  const paymentMethodSectionRef = useRef<HTMLElement | null>(null);
  const paymentProofSectionRef = useRef<HTMLElement | null>(null);
  const orderSummarySectionRef = useRef<HTMLElement | null>(null);
  const mobileSummaryRef = useRef<HTMLDivElement | null>(null);
  const submitOrderButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastMobileScrollYRef = useRef(0);

  const tutorialSteps = useMemo<CheckoutTutorialStep[]>(
    () => [
      {
        id: 'order-summary',
        title: 'Order Summary',
        description: 'Review selected item, plan, quantity, payment method, and final total before submitting.',
      },
      {
        id: 'contact-fields',
        title: 'Delivery Contact',
        description: 'Enter target delivery email and phone number so admin can verify and deliver correctly.',
      },
      {
        id: 'payment-method',
        title: 'Select Payment Method',
        description: 'Choose a payment method and confirm account details or manual WhatsApp checkout.',
      },
      {
        id: 'payment-proof',
        title: 'Payment Proof Details',
        description: 'Add sender account, transaction ID, and optional screenshot proof for quick review.',
      },
      {
        id: 'submit-order',
        title: 'Submit Order',
        description: 'Submit once all required fields are complete. Your order appears in dashboard instantly.',
      },
    ],
    []
  );

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
              const productSlug = toTokenSlug(String(product.slug || getProductTitle(product)));
              const categoryName = String(product.categoryName || product.category || '');
              const categorySlug = toTokenSlug(String((product as any).categorySlug || categoryName));
              return {
                productId: product.id,
                productSlug,
                slug: productSlug,
                categoryId: String(product.categoryId || ''),
                categorySlug,
                categoryName,
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
        const productSlug = toTokenSlug(String(product.slug || getProductTitle(product)));
        const categoryName = String(product.categoryName || product.category || '');
        const categorySlug = toTokenSlug(String((product as any).categorySlug || categoryName));

        if (mounted) {
          setItems([
            {
              productId: product.id,
              productSlug,
              slug: productSlug,
              categoryId: String(product.categoryId || ''),
              categorySlug,
              categoryName,
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

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }
    if (couponCode.trim().toUpperCase() !== appliedCoupon.code.toUpperCase()) {
      setAppliedCoupon(null);
      setCouponFeedback('');
    }
  }, [appliedCoupon, couponCode]);

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }

    const couponForCheck = {
      ...appliedCoupon,
      scope: normalizeCouponScope(appliedCoupon.scope),
    };
    const eligibleSubtotal = getCouponEligibleSubtotal(couponForCheck, items);
    if (eligibleSubtotal <= 0) {
      setAppliedCoupon(null);
      setCouponFeedback('Coupon no longer matches selected items.');
      return;
    }

    if (Math.abs(eligibleSubtotal - Number(appliedCoupon.eligibleSubtotal || 0)) > 0.001) {
      setAppliedCoupon((prev) => (prev ? { ...prev, eligibleSubtotal } : prev));
    }
  }, [appliedCoupon, items]);

  useEffect(() => {
    if (mobileSummaryClosed) {
      return;
    }

    const onScroll = () => {
      if (window.innerWidth >= 1024) {
        return;
      }
      const current = Math.max(0, window.scrollY || 0);
      const delta = current - lastMobileScrollYRef.current;
      if (Math.abs(delta) > 10) {
        setMobileSummaryVisible(delta < 0 || current < 120);
      }
      lastMobileScrollYRef.current = current;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [mobileSummaryClosed]);

  const currentTutorialStep = tutorialSteps[tutorialStepIndex] || tutorialSteps[0];

  useEffect(() => {
    if (!tutorialOpen || !currentTutorialStep) {
      return;
    }

    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    let target: HTMLElement | null = null;
    if (currentTutorialStep.id === 'order-summary') {
      target = isDesktop
        ? orderSummarySectionRef.current
        : (mobileSummaryRef.current || orderSummarySectionRef.current);
    } else if (currentTutorialStep.id === 'contact-fields') {
      target = contactSectionRef.current;
    } else if (currentTutorialStep.id === 'payment-method') {
      target = paymentMethodSectionRef.current;
    } else if (currentTutorialStep.id === 'payment-proof') {
      target = paymentProofSectionRef.current;
    } else if (currentTutorialStep.id === 'submit-order') {
      target = submitOrderButtonRef.current;
    }

    if (target) {
      window.setTimeout(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [tutorialOpen, tutorialStepIndex, currentTutorialStep]);

  function dismissTutorial() {
    setTutorialOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHECKOUT_TUTORIAL_DISMISSED_KEY, '1');
    }
  }

  function handleTutorialNext() {
    if (tutorialStepIndex >= tutorialSteps.length - 1) {
      dismissTutorial();
      return;
    }
    setTutorialStepIndex((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
  }

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethodId) || null,
    [paymentMethods, selectedPaymentMethodId]
  );
  const checkoutPathWithQuery = useMemo(() => {
    const query = params.toString();
    return query ? `/checkout?${query}` : '/checkout';
  }, [params]);
  useEffect(() => {
    if (authLoading || user) {
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(checkoutPathWithQuery)}`);
  }, [authLoading, user, router, checkoutPathWithQuery]);
  const selectedPaymentMethodIsManual = useMemo(
    () => isManualChatPaymentMethod(selectedPaymentMethod),
    [selectedPaymentMethod]
  );

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice, 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) {
      return 0;
    }
    const discountBase = Math.max(0, Number(appliedCoupon.eligibleSubtotal || 0));
    const raw = (discountBase * appliedCoupon.discountPercentage) / 100;
    return Number(raw.toFixed(2));
  }, [appliedCoupon]);
  const finalTotal = useMemo(
    () => Number(Math.max(0, subtotal - discountAmount).toFixed(2)),
    [discountAmount, subtotal]
  );

  async function handleCopyPaymentValue(label: string, value: string) {
    try {
      const success = await copyText(value);
      if (!success) {
        toast.error('Copy failed', `${label} is empty or unavailable.`);
        return;
      }
      toast.success('Copied', `${label} copied.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to copy text.';
      toast.error('Copy failed', message);
    }
  }

  function resolveOrderIdWithoutPreRead() {
    const fromState = (orderId || '').trim();
    if (fromState) {
      return fromState;
    }
    return createOrderPublicId();
  }

  async function uploadPaymentProof(uid: string, finalOrderId: string) {
    if (!proofFile) {
      return null;
    }

    if (!proofFile.type.startsWith('image/')) {
      throw new Error('Payment screenshot must be an image.');
    }

    if (proofFile.size > MAX_PROOF_SIZE_BYTES) {
      throw new Error('Screenshot size must be less than 5MB.');
    }

    return uploadMediaFile({
      file: proofFile,
      folder: 'payment-proofs',
      relatedType: 'order',
      relatedId: finalOrderId,
      relatedOrderId: finalOrderId,
      relatedUserId: uid,
      note: 'checkout-payment-proof',
    });
  }

  async function handleApplyCoupon() {
    const rawCode = couponCode.trim();
    if (!rawCode) {
      setAppliedCoupon(null);
      setCouponFeedback('Enter a coupon code first.');
      return;
    }

    setCouponApplying(true);
    setCouponFeedback('');
    try {
      const normalizedCode = rawCode.toUpperCase();
      const couponQuery = query(
        collection(db, 'coupons'),
        where('code', '==', normalizedCode),
        where('active', '==', true)
      );
      const snapshot = await getDocs(couponQuery);
      if (snapshot.empty) {
        setAppliedCoupon(null);
        setCouponFeedback('Coupon is invalid or inactive.');
        return;
      }

      const couponData = normalizeCoupon(snapshot.docs[0].data() as Record<string, any>, snapshot.docs[0].id);
      const discountPercentage = Math.max(0, Number(couponData.discountPercentage || 0));
      if (!discountPercentage) {
        setAppliedCoupon(null);
        setCouponFeedback('Coupon discount is not configured.');
        return;
      }

      if (isCouponExpired(couponData)) {
        setAppliedCoupon(null);
        setCouponFeedback('Coupon is expired.');
        return;
      }

      const eligibleSubtotal = getCouponEligibleSubtotal(couponData, items);
      if (eligibleSubtotal <= 0) {
        setAppliedCoupon(null);
        if (couponData.scope === 'category') {
          setCouponFeedback('Coupon is not valid for this category.');
        } else if (couponData.scope === 'product') {
          setCouponFeedback('Coupon is not valid for this product.');
        } else {
          setCouponFeedback('Coupon is not valid for selected items.');
        }
        return;
      }

      setAppliedCoupon({
        code: couponData.code || normalizedCode,
        discountPercentage,
        scope: couponData.scope,
        categoryId: couponData.categoryId || '',
        categorySlug: couponData.categorySlug || '',
        categoryName: couponData.categoryName || '',
        productId: couponData.productId || '',
        itemId: couponData.productId || '',
        toolId: couponData.productId || '',
        productName: couponData.productName || '',
        slug: couponData.productSlug || '',
        productSlug: couponData.productSlug || '',
        eligibleSubtotal,
      });
      setCouponFeedback(`Coupon applied: ${discountPercentage}% discount.`);
    } catch (error) {
      console.error('Failed to validate coupon:', error);
      setAppliedCoupon(null);
      setCouponFeedback('Failed to validate coupon. Try again.');
    } finally {
      setCouponApplying(false);
    }
  }

  async function handleSubmit() {
    setErrorMessage('');
    setSuccessMessage('');

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(checkoutPathWithQuery)}`);
      return;
    }

    if (!items.length) {
      setErrorMessage('No order items found.');
      toast.error('No order items found');
      return;
    }

    const emailValue = deliveryEmail.trim();
    const accountEmail = (user.email || '').trim();
    const phoneValue = phone.trim();
    const senderValue = senderAccount.trim();
    const transactionValue = transactionId.trim();
    const normalizedNote = note.trim().slice(0, 1000);
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

    if (!selectedPaymentMethodIsManual && !senderValue) {
      setErrorMessage('Sender number/account is required.');
      toast.error('Sender account is required');
      return;
    }

    if (!selectedPaymentMethodIsManual && !transactionValue) {
      setErrorMessage('Transaction ID is required.');
      toast.error('Transaction ID is required');
      return;
    }

    setSubmitting(true);

    try {
      const finalOrderId = resolveOrderIdWithoutPreRead();
      const proofMedia = selectedPaymentMethodIsManual ? null : await uploadPaymentProof(user.uid, finalOrderId);
      const timestamp = serverTimestamp();
      const roundedSubtotal = Number(subtotal.toFixed(2));
      const roundedDiscount = Number(discountAmount.toFixed(2));
      const roundedFinalTotal = Number(finalTotal.toFixed(2));

      await setDoc(doc(db, 'orders', finalOrderId), {
        orderId: finalOrderId,
        order_id: finalOrderId,
        userId: user.uid,
        user_id: user.uid,
        userName: user.displayName || '',
        userEmail: accountEmail,
        email: accountEmail,
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
        subtotal: roundedSubtotal,
        discountAmount: roundedDiscount,
        totalAmount: roundedFinalTotal,
        originalTotalAmount: roundedSubtotal,
        quantityTotal: totalQuantity,
        currency: 'PKR',
        status: 'pending',
        couponCode: appliedCoupon?.code || '',
        appliedCouponCode: appliedCoupon?.code || '',
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              discountPercentage: appliedCoupon.discountPercentage,
              scope: appliedCoupon.scope,
              categoryId: appliedCoupon.categoryId || '',
              categorySlug: appliedCoupon.categorySlug || '',
              categoryName: appliedCoupon.categoryName || '',
              productId: appliedCoupon.productId || '',
              itemId: appliedCoupon.itemId || appliedCoupon.productId || '',
              toolId: appliedCoupon.toolId || appliedCoupon.productId || '',
              productName: appliedCoupon.productName || '',
              slug: appliedCoupon.slug || appliedCoupon.productSlug || '',
              productSlug: appliedCoupon.productSlug || '',
            }
          : null,

        paymentMethodId: selectedPaymentMethod.id,
        paymentMethodName: selectedPaymentMethod.name,
        paymentMethodSnapshot: {
          name: selectedPaymentMethod.name,
          paymentType: selectedPaymentMethod.paymentType || 'standard',
          accountTitle: selectedPaymentMethod.accountTitle,
          accountNumber: selectedPaymentMethod.accountNumber,
          instructions: selectedPaymentMethod.instructions || '',
        },

        paymentProof: selectedPaymentMethodIsManual
          ? {
              senderAccount: '',
              senderNumber: '',
              transactionId: '',
              screenshotUrl: '',
              screenshotMedia: null,
              note: 'Manual WhatsApp checkout initiated.',
            }
          : {
              senderAccount: senderValue,
              senderNumber: senderValue,
              transactionId: transactionValue,
              screenshotUrl: proofMedia?.url || '',
              screenshotMedia: proofMedia
                ? {
                    ...toStorageMetadata(proofMedia, user.uid),
                    createdAt: timestamp,
                  }
                : null,
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
        note: normalizedNote,
      });

      if (checkoutMode === 'cart') {
        clearCart();
      }

      if (selectedPaymentMethodIsManual) {
        const whatsappMessage = buildWhatsAppManualOrderMessage({
          orderId: finalOrderId,
          customerName: user.displayName || '',
          customerEmail: emailValue,
          customerPhone: phoneValue,
          paymentMethodName: getPaymentMethodDisplayName(selectedPaymentMethod),
          items,
          totalAmount: roundedFinalTotal,
          note: normalizedNote,
        });
        const whatsappUrl = `https://wa.me/${MANUAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
        toast.success('Redirecting to WhatsApp', `Order ${finalOrderId} created. Continue in chat.`);
        window.location.assign(whatsappUrl);
        return;
      }

      setOrderId(createOrderPublicId());
      setSuccessMessage(`Order ${finalOrderId} submitted successfully. Admin will review it soon.`);
      toast.success('Order submitted', `Order ${finalOrderId} is now pending.`);
      setPhone('');
      setSenderAccount('');
      setTransactionId('');
      setProofFile(null);
      setNote('');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponFeedback('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit order.';
      setErrorMessage(message);
      toast.error('Order failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen page-navbar-spacing pb-20 bg-brand-bg">
        <div className="site-container-readable py-20 flex justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="relative min-h-screen page-navbar-spacing pb-20 bg-brand-bg">
      {!loading && items.length > 0 && !mobileSummaryClosed ? (
        <div
          ref={mobileSummaryRef}
          className={`lg:hidden fixed left-3 right-3 top-[calc(var(--user-order-offset)+8px)] z-[96] transition-transform duration-300 ${
            mobileSummaryVisible ? 'translate-y-0' : '-translate-y-[140%]'
          }`}
        >
          <div className="rounded-lg border border-primary/20 bg-[#101010]/95 backdrop-blur-xl px-2.5 py-2 shadow-[0_14px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-primary">Order Summary</div>
                <div className="text-[11px] font-black text-brand-text truncate">{items[0]?.title || 'Item'}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/50">
                  {items[0]?.selectedPlanName || 'Standard'} - Qty {totalQuantity}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/45 truncate">
                  Payment: {selectedPaymentMethod ? getPaymentMethodDisplayName(selectedPaymentMethod) : 'Select one'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileSummaryClosed(true)}
                className="w-6 h-6 rounded-md border border-white/10 bg-white/5 text-brand-text/70 flex items-center justify-center"
                aria-label="Hide mobile order summary"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-brand-text/35">Order ID</div>
                <div className="text-[9px] font-black text-brand-text/60 truncate max-w-[44vw]">{orderId}</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-brand-text/35">Total</div>
                <div className="text-xs font-black text-primary">{toCurrency(finalTotal)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="site-container-readable space-y-8">
        {!loading && items.length > 0 && !mobileSummaryClosed ? <div className="lg:hidden h-20" /> : null}
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
              <section ref={contactSectionRef} className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
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
                      autoComplete="off"
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

              <section ref={paymentMethodSectionRef} className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
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
                          {getPaymentMethodDisplayName(method)}
                        </button>
                      ))}
                    </div>

                    {selectedPaymentMethod ? (
                      selectedPaymentMethodIsManual ? (
                        <div className="space-y-2 py-1">
                          <div className="text-[10px] uppercase tracking-widest font-black text-primary">Manual Chat Checkout</div>
                          <div className="text-sm text-brand-text/75 leading-relaxed">
                            You will be redirected to WhatsApp with your order details already filled in.
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl md:rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[9px] uppercase tracking-widest text-brand-text/35 font-black">Account Title</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyPaymentValue('Account title', selectedPaymentMethod.accountTitle)
                                  }
                                  className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-black text-primary hover:text-primary/80"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                              </div>
                              <div className="text-base font-black text-brand-text mt-1">{selectedPaymentMethod.accountTitle}</div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[9px] uppercase tracking-widest text-brand-text/35 font-black">Account Number</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyPaymentValue('Account number', selectedPaymentMethod.accountNumber)
                                  }
                                  className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-black text-primary hover:text-primary/80"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                              </div>
                              <div className="text-base font-black text-brand-text mt-1">{selectedPaymentMethod.accountNumber}</div>
                            </div>
                          </div>
                          {selectedPaymentMethod.instructions ? (
                            <div className="border-t border-white/10 pt-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[9px] uppercase tracking-widest font-black text-brand-text/35">Details</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyPaymentValue('Payment details', selectedPaymentMethod.instructions || '')
                                  }
                                  className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-black text-primary hover:text-primary/80"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                              </div>
                              <div className="text-xs text-brand-text/65 mt-2 leading-relaxed">
                                {selectedPaymentMethod.instructions}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    ) : null}
                  </>
                )}
              </section>

              <section ref={paymentProofSectionRef} className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-5">
                <h2 className="text-xl font-black uppercase text-brand-text">
                  {selectedPaymentMethodIsManual ? 'Manual WhatsApp Checkout' : 'Payment Proof'}
                </h2>

                {selectedPaymentMethodIsManual ? (
                  <div className="text-sm text-brand-text/70 leading-relaxed">
                    Sender account, transaction ID, and screenshot are skipped for manual chat. On submit, your order is created and you are redirected to WhatsApp with all order details.
                  </div>
                ) : (
                  <>
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
                        <UploadedImage src={proofPreview} alt="Payment proof preview" className="w-full h-auto" />
                      </div>
                    ) : null}
                  </>
                )}

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
                  ref={submitOrderButtonRef}
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={submitting || !paymentMethods.length}
                  className="w-full bg-primary text-black py-4 rounded-xl text-[11px] font-black uppercase tracking-widest border-b-4 border-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {selectedPaymentMethodIsManual ? 'Continue to WhatsApp' : 'Submit Order'}
                </button>
              </section>
            </div>

            <div className="space-y-6">
              <section ref={orderSummarySectionRef} className="glass rounded-2xl md:rounded-[2rem] border border-white/5 p-6 space-y-5 sticky top-28">
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
                    <span className="text-brand-text">{selectedPaymentMethod ? getPaymentMethodDisplayName(selectedPaymentMethod) : 'Select one'}</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="Coupon code"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-brand-text focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={() => {
                        void handleApplyCoupon();
                      }}
                      disabled={couponApplying}
                      className="shrink-0 rounded-xl border border-primary/40 bg-primary/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-60"
                    >
                      {couponApplying ? 'Checking' : 'Apply'}
                    </button>
                  </div>
                  {couponFeedback ? (
                    <div
                      className={`text-[10px] font-black tracking-widest ${
                        appliedCoupon ? 'text-emerald-400' : 'text-accent'
                      }`}
                    >
                      {couponFeedback}
                    </div>
                  ) : null}
                  {appliedCoupon ? (
                    <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/35">
                      Applies to:{' '}
                      {appliedCoupon.scope === 'global'
                        ? 'All items'
                        : appliedCoupon.scope === 'category'
                          ? appliedCoupon.categoryName || 'Selected category'
                          : appliedCoupon.productName || 'Selected product'}
                    </div>
                  ) : null}
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-2 text-[10px] uppercase tracking-widest font-black">
                  <div className="flex justify-between text-brand-text/45">
                    <span>Original Total</span>
                    <span>{toCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-brand-text/45">
                    <span>Discount</span>
                    <span className={appliedCoupon ? 'text-emerald-400' : ''}>
                      {discountAmount > 0 ? `- ${toCurrency(discountAmount)}` : toCurrency(0)}
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between text-brand-text text-sm">
                    <span>Final Total</span>
                    <span className="text-primary">{toCurrency(finalTotal)}</span>
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

      {tutorialOpen && !loading && items.length > 0 ? (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-[110] sm:w-[22rem]">
          <div className="rounded-2xl border border-primary/30 bg-[#0F0F10]/95 backdrop-blur-xl p-4 shadow-[0_18px_46px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-primary">
                <HelpCircle className="w-3 h-3" />
                Step {tutorialStepIndex + 1} of {tutorialSteps.length}
              </div>
              <button
                type="button"
                onClick={dismissTutorial}
                className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-brand-text/70 flex items-center justify-center"
                aria-label="Close checkout tutorial"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-black uppercase tracking-[0.1em] text-brand-text">{currentTutorialStep.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-brand-text/70">{currentTutorialStep.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={dismissTutorial}
                className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-[9px] font-black uppercase tracking-[0.14em] text-brand-text/70"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleTutorialNext}
                className="px-3 py-2 rounded-lg border border-primary/45 bg-primary text-black text-[9px] font-black uppercase tracking-[0.14em]"
              >
                {tutorialStepIndex >= tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen page-navbar-spacing pb-20 bg-brand-bg">
          <div className="site-container-readable py-20 flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </main>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
