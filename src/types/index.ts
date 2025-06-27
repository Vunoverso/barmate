
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
  // icon?: LucideIcon; // Removido, será obtido dinamicamente da categoria
  stock?: number; // Optional: for inventory management
}

export interface OrderItem extends Product {
  quantity: number;
  // Adicionar o nome da categoria e o ícone aqui pode ser útil para exibição,
  // para não precisar buscar toda hora. Mas por enquanto, manteremos simples.
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

export interface CashRegisterStatus {
  status: 'open' | 'closed';
  openingTime?: string; // ISO String
  openingBalance?: number;
}

export interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  type: 'expense' | 'income'; // For now, only 'expense' but can be extended
  timestamp: Date;
}
