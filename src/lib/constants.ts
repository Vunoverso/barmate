import type { Product, Sale, PaymentMethod } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode } from 'lucide-react';

export const PRODUCT_CATEGORIES = [
  { name: 'Bebidas Alcoólicas', icon: Beer },
  { name: 'Bebidas Não Alcoólicas', icon: Martini },
  { name: 'Cafés', icon: Coffee },
  { name: 'Lanches', icon: UtensilsCrossed },
  { name: 'Sobremesas', icon: CakeSlice },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cerveja Pilsen Long Neck', price: 12.00, category: 'Bebidas Alcoólicas', icon: Beer, stock: 100 },
  { id: '2', name: 'Taça de Vinho Tinto Seco', price: 25.00, category: 'Bebidas Alcoólicas', icon: Wine, stock: 50 },
  { id: '3', name: 'Caipirinha de Limão', price: 18.00, category: 'Bebidas Alcoólicas', icon: Martini, stock: 70 },
  { id: '4', name: 'Refrigerante Lata', price: 7.00, category: 'Bebidas Não Alcoólicas', icon: Martini, stock: 150 },
  { id: '5', name: 'Suco Natural Laranja', price: 10.00, category: 'Bebidas Não Alcoólicas', icon: Martini, stock: 80 },
  { id: '6', name: 'Água Mineral com Gás', price: 5.00, category: 'Bebidas Não Alcoólicas', icon: Martini, stock: 200 },
  { id: '7', name: 'Café Espresso', price: 6.00, category: 'Cafés', icon: Coffee, stock: 100 },
  { id: '8', name: 'Cappuccino', price: 9.00, category: 'Cafés', icon: Coffee, stock: 90 },
  { id: '9', name: 'X-Burger Clássico', price: 28.00, category: 'Lanches', icon: UtensilsCrossed, stock: 60 },
  { id: '10', name: 'Porção de Batata Frita', price: 22.00, category: 'Lanches', icon: UtensilsCrossed, stock: 75 },
  { id: '11', name: 'Pastel de Queijo (unidade)', price: 8.00, category: 'Lanches', icon: UtensilsCrossed, stock: 120 },
  { id: '12', name: 'Petit Gâteau', price: 20.00, category: 'Sobremesas', icon: CakeSlice, stock: 40 },
  { id: '13', name: 'Mousse de Maracujá', price: 15.00, category: 'Sobremesas', icon: CakeSlice, stock: 50 },
];

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: CircleDollarSign },
  { name: 'Cartão', value: 'card', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale1',
    items: [
      { ...INITIAL_PRODUCTS[0], quantity: 2 }, // 2 Cervejas Pilsen
      { ...INITIAL_PRODUCTS[8], quantity: 1 }, // 1 X-Burger
    ],
    totalAmount: (INITIAL_PRODUCTS[0].price * 2) + INITIAL_PRODUCTS[8].price,
    paymentMethod: 'card',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'completed',
  },
  {
    id: 'sale2',
    items: [
      { ...INITIAL_PRODUCTS[3], quantity: 3 }, // 3 Refrigerantes
    ],
    totalAmount: INITIAL_PRODUCTS[3].price * 3,
    paymentMethod: 'cash',
    amountPaid: 25.00,
    changeGiven: 25.00 - (INITIAL_PRODUCTS[3].price * 3),
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    status: 'completed',
  },
  {
    id: 'sale3',
    items: [
      { ...INITIAL_PRODUCTS[6], quantity: 1 }, // 1 Café Espresso
      { ...INITIAL_PRODUCTS[11], quantity: 1 }, // 1 Petit Gateau
    ],
    totalAmount: INITIAL_PRODUCTS[6].price + INITIAL_PRODUCTS[11].price,
    paymentMethod: 'pix',
    timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000), // 30 minutes ago
    status: 'completed',
  },
];

export const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
