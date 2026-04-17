export type CategoryType = 'tools' | 'services' | 'both';
export type UploadFolderType =
  | 'tools'
  | 'services'
  | 'blogs'
  | 'partners'
  | 'payment-proofs'
  | 'chat-attachments'
  | 'profiles';

export interface StoredFileMetadata {
  mediaId: string;
  fileUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  folder: UploadFolderType;
  access: 'public' | 'protected';
  uploadedBy?: string;
  createdAt?: any;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  iconUrl?: string;
  imageUrl?: string;
  imageMedia?: StoredFileMetadata | null;
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
  imageMedia?: StoredFileMetadata | null;
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
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'pending_verification'
  | 'needs_info'
  | 'completed';

export interface OrderLineItem {
  productId: string;
  productTitle: string;
  productType: 'tools' | 'services';
  quantity: number;
  selectedPlanName?: string | null;
  durationLabel?: string | null;
  planType?: string | null;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderMessageRecord {
  id: string;
  orderId: string;
  senderRole: 'admin' | 'user' | 'system';
  senderId: string;
  senderName?: string;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
  attachmentMedia?: StoredFileMetadata;
  messageType?: 'status' | 'message' | 'rejection' | 'approval';
  createdAt?: any;
}

export interface OrderRecord {
  id: string;
  orderId: string;
  order_id?: string;
  orderNumber?: string;
  userId: string;
  user_id?: string;
  userEmail: string;
  email?: string;
  deliveryEmail?: string;
  targetEmail?: string;
  userPhone: string;
  phone?: string;
  userName?: string;
  items: OrderLineItem[];
  subtotal: number;
  totalAmount: number;
  quantityTotal?: number;
  primaryItemName?: string;
  primaryPlanName?: string | null;
  primaryDuration?: string;
  primaryPlanType?: string;
  primaryQuantity?: number;
  primaryUnitPrice?: number;
  couponCode?: string;
  appliedCouponCode?: string;
  itemSummary?: Array<{
    productId: string;
    productTitle: string;
    selectedPlanName?: string | null;
    durationLabel?: string | null;
    planType?: string | null;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    productType: 'tools' | 'services';
  }>;
  currency?: string;
  selectedPlanName?: string | null;
  status: OrderStatus;
  adminMessage?: string;
  latestMessagePreview?: string;
  latestMessageAt?: any;
  rejectionReason?: string;
  tickerState?: 'new' | 'opened' | 'dismissed';
  tickerOpenedAt?: any;
  tickerDismissedAt?: any;
  openedByAdminId?: string;
  createdAt?: any;
  created_at?: any;
  updatedAt?: any;
  updated_at?: any;
  statusUpdatedAt?: any;
  status_updated_at?: any;

  // Legacy optional fields for backward compatibility with existing docs.
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentMethodSnapshot?: {
    name?: string;
    accountTitle?: string;
    accountNumber?: string;
    instructions?: string;
  };
  paymentProof?: {
    senderAccount?: string;
    senderName?: string;
    senderNumber?: string;
    transactionId?: string;
    screenshotUrl?: string;
    screenshotMedia?: StoredFileMetadata;
    note?: string;
  };
  statusHistory?: Array<{
    status: string;
    message: string;
    actorRole: string;
    actorId: string;
    createdAt: any;
  }>;
  messages?: Array<{
    senderRole: 'admin' | 'user';
    senderId: string;
    message: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
    attachmentSize?: number;
    attachmentMedia?: StoredFileMetadata;
    createdAt: any;
  }>;
  deliveryDetails?: string;
  internalNote?: string;
  entitlementIds?: string[];
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
  orderId?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface MediaFileRecord {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  folder: UploadFolderType;
  access: 'public' | 'protected';
  source: 'hostinger-filesystem' | 'local-hosting';
  fileName: string;
  originalFileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicPath?: string;
  protectedPath?: string;
  fileUrl: string;
  relatedType?: string;
  relatedId?: string;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  note?: string;
  createdAt?: any;
  updatedAt?: any;
}
