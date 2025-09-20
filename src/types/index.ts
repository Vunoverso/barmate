
import type { LucideIcon } from 'lucide-react';
import type { Database } from './supabase';

export type { Database } from './supabase';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export interface ProductCategory extends Tables<'product_categories'> {}

export interface Product extends Tables<'products'> {
  isCombo?: boolean;
  comboItems?: number;
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

export interface Sale {
  id: string;
  items: OrderItem[];
  totalAmount: number; 
  originalAmount: number; 
  discountAmount: number; 
  payments: Payment[];
  cashTendered?: number; 
  changeGiven?: number; 
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
  leaveChangeAsCredit?: boolean;
}

export interface ActiveOrder {
  id: string;
  name:string;
  items: OrderItem[];
  createdAt: Date;
  status?: 'paid';
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
  balance: number;
}

export interface BankAccount {
  balance: number;
}

export interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  type: 'expense' | 'income'; 
  source: 'daily_cash' | 'secondary_cash' | 'bank_account';
  timestamp: Date;
  adjustmentId?: string;
  saleId?: string;
  isAdjustment?: boolean; 
}

export interface TransactionFees {
  debitRate: number;
  creditRate: number;
  pixRate: number;
}
