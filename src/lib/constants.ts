
import type { Product, Sale, PaymentMethod, ProductCategory } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, type LucideIcon } from 'lucide-react';

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Beer,
  Wine,
  Martini,
  Coffee,
  UtensilsCrossed,
  CakeSlice,
  CircleDollarSign,
  CreditCard,
  QrCode,
};

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_alcoolicas', name: 'Bebidas Alcoólicas', iconName: 'Beer' },
  { id: 'cat_nao_alcoolicas', name: 'Bebidas Não Alcoólicas', iconName: 'Martini' },
  { id: 'cat_cafes', name: 'Cafés', iconName: 'Coffee' },
  { id: 'cat_lanches', name: 'Lanches', iconName: 'UtensilsCrossed' },
  { id: 'cat_sobremesas', name: 'Sobremesas', iconName: 'CakeSlice' },
  { id: 'cat_outros', name: 'Outros', iconName: 'Package' } // Adicionando Package como um ícone possível
];

const PRODUCT_CATEGORIES_STORAGE_KEY = 'barmate_productCategories';

export const getProductCategories = (): ProductCategory[] => {
  if (typeof window !== 'undefined') {
    const storedCategories = localStorage.getItem(PRODUCT_CATEGORIES_STORAGE_KEY);
    if (storedCategories) {
      try {
        const parsed = JSON.parse(storedCategories);
        // Validação simples para garantir que é um array e tem os campos esperados
        if (Array.isArray(parsed) && parsed.every(cat => cat.id && cat.name && cat.iconName)) {
          return parsed;
        }
      } catch (e) {
        console.error("Erro ao parsear categorias do localStorage", e);
        // Se der erro, remove o item corrompido e retorna o padrão
        localStorage.removeItem(PRODUCT_CATEGORIES_STORAGE_KEY);
      }
    }
    // Se não houver nada ou se deu erro, salva e retorna o padrão
    localStorage.setItem(PRODUCT_CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCT_CATEGORIES));
    return INITIAL_PRODUCT_CATEGORIES;
  }
  return INITIAL_PRODUCT_CATEGORIES; // Fallback para SSR ou ambiente sem window
};

export const saveProductCategories = (categories: ProductCategory[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PRODUCT_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    // Disparar um evento para que outras partes da UI possam reagir se necessário
    window.dispatchEvent(new Event('productCategoriesChanged'));
  }
};


export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cerveja Pilsen Long Neck', price: 12.00, categoryId: 'cat_alcoolicas', stock: 100 },
  { id: '2', name: 'Taça de Vinho Tinto Seco', price: 25.00, categoryId: 'cat_alcoolicas', stock: 50 },
  { id: '3', name: 'Caipirinha de Limão', price: 18.00, categoryId: 'cat_alcoolicas', stock: 70 },
  { id: '4', name: 'Refrigerante Lata', price: 7.00, categoryId: 'cat_nao_alcoolicas', stock: 150 },
  { id: '5', name: 'Suco Natural Laranja', price: 10.00, categoryId: 'cat_nao_alcoolicas', stock: 80 },
  { id: '6', name: 'Água Mineral com Gás', price: 5.00, categoryId: 'cat_nao_alcoolicas', stock: 200 },
  { id: '7', name: 'Café Espresso', price: 6.00, categoryId: 'cat_cafes', stock: 100 },
  { id: '8', name: 'Cappuccino', price: 9.00, categoryId: 'cat_cafes', stock: 90 },
  { id: '9', name: 'X-Burger Clássico', price: 28.00, categoryId: 'cat_lanches', stock: 60 },
  { id: '10', name: 'Porção de Batata Frita', price: 22.00, categoryId: 'cat_lanches', stock: 75 },
  { id: '11', name: 'Pastel de Queijo (unidade)', price: 8.00, categoryId: 'cat_lanches', stock: 120 },
  { id: '12', name: 'Petit Gâteau', price: 20.00, categoryId: 'cat_sobremesas', stock: 40 },
  { id: '13', name: 'Mousse de Maracujá', price: 15.00, categoryId: 'cat_sobremesas', stock: 50 },
];

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: CircleDollarSign },
  { name: 'Cartão', value: 'card', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

// Mantendo INITIAL_SALES para relatórios, mas os produtos referenciados são os de INITIAL_PRODUCTS.
// Se INITIAL_PRODUCTS mudar muito, estas sales podem ficar inconsistentes.
// Para um sistema real, sales seriam gravadas com snapshots dos itens.
export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale1',
    items: [
      { ...INITIAL_PRODUCTS.find(p=>p.id==='1')!, quantity: 2 }, 
      { ...INITIAL_PRODUCTS.find(p=>p.id==='9')!, quantity: 1 }, 
    ],
    totalAmount: (INITIAL_PRODUCTS.find(p=>p.id==='1')!.price * 2) + INITIAL_PRODUCTS.find(p=>p.id==='9')!.price,
    paymentMethod: 'card',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), 
    status: 'completed',
  },
  {
    id: 'sale2',
    items: [
      { ...INITIAL_PRODUCTS.find(p=>p.id==='4')!, quantity: 3 },
    ],
    totalAmount: INITIAL_PRODUCTS.find(p=>p.id==='4')!.price * 3,
    paymentMethod: 'cash',
    amountPaid: 25.00,
    changeGiven: 25.00 - (INITIAL_PRODUCTS.find(p=>p.id==='4')!.price * 3),
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), 
    status: 'completed',
  },
];

export const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
