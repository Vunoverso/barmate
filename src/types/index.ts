

import type { LucideIcon } from 'lucide-react';
import type { Database } from './supabase';

export type { Database } from './supabase';

export type ProductCategory = {
  id: string;
  name: string;
  iconName: string;
};

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  debtAmount?: number;
}

export interface Product {
  id: string;
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
}

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
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
  name: string;
  createdAt: Date;
  items: OrderItem[];
  status?: 'open' | 'paid';
  clientId?: string | null;
  clientName?: string | null;
  user_id?: string;
}

export interface CashAdjustment {
  id: string;
  amount: number;
  type: 'in' | 'out'; // 'in' for suprimento, 'out' for sangria
  description: string;
  timestamp: string; // ISO String
  source?: 'secondary_cash' | 'bank_account'; // For 'in' types that are transfers
  destination?: 'secondary_cash' | 'bank_account'; // For 'out' types that are transfers
  isCorrection?: boolean;
}

export interface CashRegisterStatus {
  status: 'open' | 'closed';
  openingTime?: string; // ISO String
  openingBalance?: number;
  adjustments?: CashAdjustment[];
}

export interface SecondaryCashBox {
  baseBalance?: number;
}

export interface BankAccount {
  baseBalance?: number;
}


export interface FinancialEntry {
    id: string;
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
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  associatedOrderId?: string | null;
  requestedAt: string;
}


// Helper for getting table row types
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
