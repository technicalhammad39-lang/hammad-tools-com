export type CategoryType = 'tools' | 'services' | 'both';

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  iconUrl?: string;
  imageUrl?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ProductPlan {
  id?: string;
  planName: string;
  ourPrice: number;
  salePrice?: number;
  officialPrice?: number;
  benefits?: string[];
  durationType?: 'fixed_days' | 'fixed_months' | 'fixed_years' | 'custom_expiry' | 'lifetime';
  durationValue?: number | null;
}

export interface ProductItem {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
  description: string;
  longDescription?: string;
  price: number;
  salePrice?: number;
  image?: string;
  thumbnail?: string;
  type?: 'tools' | 'services';
  categoryId?: string;
  categoryName?: string;
  category?: string;
  featured?: boolean;
  active?: boolean;
  sortOrder?: number;
  orderIndex?: number;
  durationType?: 'fixed_days' | 'fixed_months' | 'fixed_years' | 'custom_expiry' | 'lifetime';
  durationValue?: number | null;
  customExpiryAt?: any;
  activationBehavior?: 'activate_on_approval' | 'manual_activation';
  accessType?: 'subscription' | 'one_time_service' | 'renewable_membership' | 'tool_access';
  renewable?: boolean;
  deliveryStatus?: string;
  accessLabel?: string;
  warranty?: string;
  planType?: string;
  checkoutInstructions?: string;
  plans?: ProductPlan[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  accountTitle: string;
  accountNumber: string;
  instructions?: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export type OrderStatus =
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'needs_info'
  | 'completed';

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  items: Array<{
    productId: string;
    productTitle: string;
    productType: 'tools' | 'services';
    categoryId?: string | null;
    categoryName?: string | null;
    quantity: number;
    selectedPlanId?: string | null;
    selectedPlanName?: string | null;
    unitPrice: number;
    totalPrice: number;
    durationType?: string;
    durationValue?: number | null;
    customExpiryAt?: any;
    accessType?: string;
    renewable?: boolean;
    activationBehavior?: string;
    productSnapshot?: Record<string, unknown>;
  }>;
  paymentMethodId: string;
  paymentMethodSnapshot: {
    name: string;
    accountTitle?: string;
    accountNumber?: string;
    instructions?: string;
  };
  paymentProof: {
    senderName: string;
    senderNumber: string;
    transactionId: string;
    screenshotUrl?: string;
    note?: string;
  };
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  statusHistory?: Array<{
    status: string;
    message: string;
    actorRole: string;
    actorId: string;
    createdAt: any;
  }>;
  adminMessage?: string;
  rejectionReason?: string;
  deliveryDetails?: string;
  internalNote?: string;
  messages?: Array<{
    senderRole: 'admin' | 'user';
    senderId: string;
    message: string;
    createdAt: any;
  }>;
  entitlementIds?: string[];
  createdAt?: any;
  updatedAt?: any;
  approvedAt?: any;
  completedAt?: any;
}

export interface EntitlementRecord {
  id: string;
  userId: string;
  orderId: string;
  orderNumber?: string;
  productId?: string;
  productTitle: string;
  productType: 'tools' | 'services';
  planName?: string | null;
  quantity: number;
  status: 'active' | 'expired' | 'pending' | 'revoked';
  activatedAt?: any;
  expiresAt?: any;
  durationType?: string;
  durationValue?: number | null;
  accessType?: string;
  renewable?: boolean;
  deliveryDetails?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface NotificationRecord {
  id: string;
  recipientId: string;
  recipientRole: 'admin' | 'user';
  title: string;
  body: string;
  type: string;
  link?: string;
  imageUrl?: string;
  read: boolean;
  createdAt?: any;
}

