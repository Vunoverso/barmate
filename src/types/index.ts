
import type { LucideIcon } from 'lucide-react';

export interface ProductCategory {
  id: string; // Identificador único e estável
  name: string; // Nome de exibição, editável
  iconName: string; // Nome da string do ícone Lucide para mapeamento dinâmico
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string; // Referencia ProductCategory.id
  stock?: number; // Optional: for inventory management
  isCombo?: boolean;
  comboItems?: number;
}

export interface OrderItem extends Product {
  quantity: number;
  categoryName?: string; 
  categoryIconName?: string;
  claimedQuantity?: number; // Para controlar itens de combo entregues
  isClaim?: boolean; // Para marcar um item como uma liberação de combo
  claimedFromId?: string; // ID do item do combo original
}

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  items: OrderItem[];
  totalAmount: number; // This is the final amount after discount
  originalAmount: number; // The pre-discount total
  discountAmount: number; // The discount amount
  payments: Payment[];
  cashTendered?: number; // Total cash provided by customer
  changeGiven?: number; // For cash transactions
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
  type: 'expense' | 'income'; // For now, only 'expense' but can be extended
  source: 'daily_cash' | 'secondary_cash' | 'bank_account';
  timestamp: Date;
  adjustmentId?: string;
  saleId?: string;
  isAdjustment?: boolean; // Flag to link financial entry to a cash adjustment
}

export interface TransactionFees {
  debitRate: number;
  creditRate: number;
  pixRate: number;
}
