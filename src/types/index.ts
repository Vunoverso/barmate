
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
}

export interface OrderItem extends Product {
  quantity: number;
  categoryName?: string; 
  categoryIconName?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'pix';

export interface Sale {
  id: string;
  items: OrderItem[];
  totalAmount: number; // This is the final amount after discount
  originalAmount: number; // The pre-discount total
  discountAmount: number; // The discount amount
  paymentMethod: PaymentMethod;
  amountPaid?: number; // For cash transactions
  changeGiven?: number; // For cash transactions
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface ActiveOrder {
  id: string;
  name: string;
  items: OrderItem[];
  createdAt: Date;
}

export interface CashAdjustment {
  id: string;
  amount: number;
  type: 'in' | 'out'; // 'in' for suprimento, 'out' for sangria
  description: string;
  timestamp: string; // ISO String
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
}
