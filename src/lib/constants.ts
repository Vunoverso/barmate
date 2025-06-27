
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';

// In-memory cache to reduce localStorage reads and improve performance
let productCategoriesCache: ProductCategory[] | null = null;
let productsCache: Product[] | null = null;
let salesCache: Sale[] | null = null;
let financialEntriesCache: FinancialEntry[] | null = null;


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
  Package,
  Banknote,
  Wallet,
};

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_alcoolicas', name: 'Bebidas Alcoólicas', iconName: 'Beer' },
  { id: 'cat_nao_alcoolicas', name: 'Bebidas Não Alcoólicas', iconName: 'Martini' },
  { id: 'cat_cafes', name: 'Cafés', iconName: 'Coffee' },
  { id: 'cat_lanches', name: 'Lanches', iconName: 'UtensilsCrossed' },
  { id: 'cat_sobremesas', name: 'Sobremesas', iconName: 'CakeSlice' },
  { id: 'cat_outros', name: 'Outros', iconName: 'Package' }
];

const PRODUCT_CATEGORIES_STORAGE_KEY = 'barmate_productCategories';

export const getProductCategories = (): ProductCategory[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  if (productCategoriesCache !== null) {
    return productCategoriesCache;
  }
  const storedCategories = localStorage.getItem(PRODUCT_CATEGORIES_STORAGE_KEY);
  if (storedCategories) {
    try {
      const parsed = JSON.parse(storedCategories);
      if (Array.isArray(parsed) && parsed.every(cat => cat.id && cat.name && cat.iconName)) {
        productCategoriesCache = parsed;
        return productCategoriesCache;
      }
    } catch (e) {
      console.error("Erro ao parsear categorias do localStorage", e);
      localStorage.removeItem(PRODUCT_CATEGORIES_STORAGE_KEY);
    }
  }
  localStorage.setItem(PRODUCT_CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCT_CATEGORIES));
  productCategoriesCache = INITIAL_PRODUCT_CATEGORIES;
  return productCategoriesCache;
};

export const saveProductCategories = (categories: ProductCategory[]): void => {
  if (typeof window !== 'undefined') {
    productCategoriesCache = categories;
    localStorage.setItem(PRODUCT_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
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

export const PRODUCTS_STORAGE_KEY = 'barmate_products';

export const getProducts = (): Product[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  if (productsCache !== null) {
    return productsCache;
  }
  const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (storedProducts) {
    try {
      const parsed = JSON.parse(storedProducts);
      if (Array.isArray(parsed)) {
         productsCache = parsed;
         return productsCache;
      }
    } catch (e) {
      console.error("Failed to parse products from localStorage", e);
      localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    }
  }
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  productsCache = INITIAL_PRODUCTS;
  return productsCache;
};

export const saveProducts = (products: Product[]): void => {
  if (typeof window !== 'undefined') {
    productsCache = products;
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('productsChanged'));
  }
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: CircleDollarSign },
  { name: 'Cartão', value: 'card', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

const INITIAL_SALES: Sale[] = [
  {
    id: 'sale1',
    items: [
      { ...INITIAL_PRODUCTS.find(p=>p.id==='1')!, quantity: 2 }, 
      { ...INITIAL_PRODUCTS.find(p=>p.id==='9')!, quantity: 1 }, 
    ],
    originalAmount: (INITIAL_PRODUCTS.find(p=>p.id==='1')!.price * 2) + INITIAL_PRODUCTS.find(p=>p.id==='9')!.price,
    discountAmount: 0,
    totalAmount: (INITIAL_PRODUCTS.find(p=>p.id==='1')!.price * 2) + INITIAL_PRODUCTS.find(p=>p.id==='9')!.price,
    paymentMethod: 'card',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'completed',
  },
  {
    id: 'sale2',
    items: [
      { ...INITIAL_PRODUCTS.find(p=>p.id==='4')!, quantity: 3 },
    ],
    originalAmount: INITIAL_PRODUCTS.find(p=>p.id==='4')!.price * 3,
    discountAmount: 0,
    totalAmount: INITIAL_PRODUCTS.find(p=>p.id==='4')!.price * 3,
    paymentMethod: 'cash',
    amountPaid: 25.00,
    changeGiven: 25.00 - (INITIAL_PRODUCTS.find(p=>p.id==='4')!.price * 3),
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'completed',
  },
];


export const SALES_STORAGE_KEY = 'barmate_sales';

export const saveSales = (sales: Sale[]): void => {
  if (typeof window === 'undefined') return;
  salesCache = sales;
  localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
  window.dispatchEvent(new Event('salesChanged'));
};

export const getSales = (): Sale[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  if (salesCache !== null) {
    return salesCache;
  }
  const storedSales = localStorage.getItem(SALES_STORAGE_KEY);
  if (storedSales) {
    try {
      salesCache = JSON.parse(storedSales).map((s: Sale) => ({
        ...s,
        timestamp: new Date(s.timestamp)
      }));
      return salesCache;
    } catch (e) {
      console.error("Failed to parse sales from localStorage", e);
      localStorage.removeItem(SALES_STORAGE_KEY);
      salesCache = [];
      return salesCache;
    }
  }
  // Seed with initial data only if nothing is in storage
  const initialSalesWithDate = INITIAL_SALES.map(s => ({...s, timestamp: new Date(s.timestamp)}));
  saveSales(initialSalesWithDate);
  return initialSalesWithDate;
};

export const addSale = (newSale: Sale): void => {
  if (typeof window === 'undefined') return;
  const currentSales = getSales();
  const updatedSales = [...currentSales, newSale];
  saveSales(updatedSales);
};


export const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


export const FINANCIAL_ENTRIES_STORAGE_KEY = 'barmate_financialEntries';

export const saveFinancialEntries = (entries: FinancialEntry[]): void => {
  if (typeof window === 'undefined') return;
  financialEntriesCache = entries;
  localStorage.setItem(FINANCIAL_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event('financialEntriesChanged'));
};

export const getFinancialEntries = (): FinancialEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  if (financialEntriesCache !== null) {
    return financialEntriesCache;
  }
  const storedEntries = localStorage.getItem(FINANCIAL_ENTRIES_STORAGE_KEY);
  if (storedEntries) {
    try {
      const parsed = JSON.parse(storedEntries);
      if (Array.isArray(parsed)) {
        financialEntriesCache = parsed.map((e: FinancialEntry) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
        return financialEntriesCache;
      }
    } catch (e) {
      console.error("Failed to parse financial entries from localStorage", e);
      localStorage.removeItem(FINANCIAL_ENTRIES_STORAGE_KEY);
    }
  }
  financialEntriesCache = [];
  return financialEntriesCache;
};
