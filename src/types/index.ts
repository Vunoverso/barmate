
import type { LucideIcon } from 'lucide-react';
import type { Database } from './supabase';

export type { Database } from './supabase';

export type ProductCategory = Tables<'product_categories'>;

export interface Product extends Omit<Tables<'products'>, 'is_combo' | 'combo_items'> {
  isCombo?: boolean | null;
  comboItems?: number | null;
}

export interface OrderItem extends Product {
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

export interface Sale extends Omit<Tables<'sales'>, 'total_amount' | 'original_amount' | 'discount_amount' | 'cash_tendered' | 'change_given' | 'leave_change_as_credit' | 'timestamp' | 'items' | 'payments'> {
  timestamp: Date;
  items: OrderItem[];
  payments: Payment[];
  totalAmount: number;
  originalAmount: number;
  discountAmount: number;
  cashTendered?: number | null;
  changeGiven?: number | null;
  leaveChangeAsCredit?: boolean | null;
}


export interface ActiveOrder extends Omit<Tables<'active_orders'>, 'created_at' | 'items'> {
  createdAt: Date;
  items: OrderItem[];
}

export interface CashAdjustment {
  id: string;
  amount: number;
  type: 'in' | 'out'; // 'in' for suprimento, 'out' for sangria
  description: string;
  timestamp: string; // ISO String
  source?: 'secondary_cash' | 'bank_account'; // For 'in' types that are transfers
  destination?: 'secondary_cash' | 'bank_account'; // For 'out' types that are transfers
  isCorrection?: boolean; // To hide manual balance corrections from the UI
}

export interface CashRegisterStatus {
  status: 'open' | 'closed';
  openingTime?: string; // ISO String
  openingBalance?: number;
  adjustments?: CashAdjustment[];
}

export interface SecondaryCashBox {
  balance: number;
}

export interface BankAccount {
  balance: number;
}


export interface FinancialEntry extends Omit<Tables<'financial_entries'>, 'timestamp'> {
    timestamp: Date;
}

export interface TransactionFees {
  debitRate: number;
  creditRate: number;
  pixRate: number;
}


// Helper for getting table row types
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
