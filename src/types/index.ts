
import type { LucideIcon } from 'lucide-react';

// --- Entidades de Plataforma (SaaS) ---

export interface Organization {
  id: string;
  legalName?: string;
  tradeName: string;
  document?: string;
  status: 'active' | 'suspended' | 'trial' | 'past_due';
  ownerId: string;
  planId: 'trial' | 'essential' | 'pro' | 'enterprise';
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
  settings?: {
    barLogo?: string;
    barLogoScale?: number;
    barAddress?: string;
    barCnpj?: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'staff';
  status: 'active' | 'inactive';
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: 'trial' | 'essential' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodEnd: string;
}

export interface SupportTicket {
  id: string;
  organizationId: string;
  userId: string;
  subject: string;
  category: 'technical' | 'billing' | 'feature';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
}

export interface Testimonial {
  id: string;
  organizationId: string;
  barName: string;
  authorName: string;
  content: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface CancellationRequest {
  id: string;
  organizationId: string;
  requestedBy: string;
  reason: string;
  status: 'pending' | 'processed' | 'reversed';
  scheduledEndDate: string;
  createdAt: string;
}

// --- Entidades Operacionais (Com organizationId para Multi-tenancy) ---

export type ProductCategory = {
  id: string;
  organizationId: string;
  name: string;
  iconName: string;
};

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  debtAmount?: number;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  price: number;
  categoryId: string;
  stock?: number | null;
  isCombo?: boolean | null;
  comboItems?: number | null;
}

export interface OrderItem extends Product {
  lineItemId?: string;
  quantity: number;
  categoryName?: string; 
  categoryIconName?: string;
  claimedQuantity?: number; 
  isClaim?: boolean; 
  claimedFromId?: string;
  isDelivered?: boolean;
  isPreparing?: boolean;
  isReady?: boolean;
  addedAt?: string;
  forceKitchenVisible?: boolean;
  isPaid?: boolean;
}

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  organizationId: string;
  timestamp: Date;
  items: OrderItem[];
  payments: Payment[];
  totalAmount: number;
  originalAmount: number;
  discountAmount: number;
  cashTendered?: number | null;
  changeGiven?: number | null;
  status: 'completed' | 'pending';
  leaveChangeAsCredit?: boolean | null;
}

export interface ActiveOrder {
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
  items: OrderItem[];
  status?: 'open' | 'paid';
  clientId?: string | null;
  clientName?: string | null;
  isShared?: boolean;
  viewerCount?: number;
  updatedAt?: string;
}

export interface CashAdjustment {
  id: string;
  organizationId: string;
  amount: number;
  type: 'in' | 'out';
  description: string;
  timestamp: string;
  source?: 'secondary_cash' | 'bank_account';
  destination?: 'secondary_cash' | 'bank_account';
  isCorrection?: boolean;
}

export interface CashRegisterStatus {
  status: 'open' | 'closed';
  openingTime?: string;
  openingBalance?: number;
  adjustments?: CashAdjustment[];
}

export interface FinancialEntry {
    id: string;
    organizationId: string;
    description: string;
    amount: number;
    type: "expense" | "income";
    source: "daily_cash" | "secondary_cash" | "bank_account";
    timestamp: Date;
    saleId: string | null;
    adjustmentId: string | null;
    isCorrection?: boolean;
}

export interface TransactionFees {
  debitRate: number;
  creditRate: number;
  pixRate: number;
}

export interface GuestRequest {
  id: string;
  organizationId: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  associatedOrderId?: string | null;
  intent?: 'create' | 'view';
  requestedAt: any;
}
