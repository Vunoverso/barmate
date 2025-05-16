import type { LucideIcon } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  icon?: LucideIcon; // Optional: for display in product lists
  stock?: number; // Optional: for inventory management
}

export interface OrderItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'pix';

export interface Sale {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid?: number; // For cash transactions
  changeGiven?: number; // For cash transactions
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}
