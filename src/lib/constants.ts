
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, CashAdjustment, OrderItem } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';
import { supabase } from './supabaseClient';


// In-memory cache to reduce reads and improve performance
let productCategoriesCache: ProductCategory[] | null = null;
let productsCache: Product[] | null = null;


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

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  if (productCategoriesCache) return productCategoriesCache;
  if (!supabase) return INITIAL_PRODUCT_CATEGORIES;

  try {
    const { data, error } = await supabase.from('product_categories').select('*');
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // First time setup: Populate Supabase with initial data
      const { error: insertError } = await supabase.from('product_categories').insert(INITIAL_PRODUCT_CATEGORIES);
      if (insertError) throw insertError;
      productCategoriesCache = INITIAL_PRODUCT_CATEGORIES;
      return INITIAL_PRODUCT_CATEGORIES;
    }
    
    productCategoriesCache = data;
    return data;
  } catch (error) {
    console.error("Error fetching product categories from Supabase:", error);
    return INITIAL_PRODUCT_CATEGORIES; // Fallback
  }
};

export const saveProductCategories = async (categories: ProductCategory[]): Promise<void> => {
  if (!supabase) return;
  try {
     // Supabase upsert will insert or update based on the primary key 'id'
    const { error } = await supabase.from('product_categories').upsert(categories);
    if (error) throw error;

    // Handle deletions: find categories that are in the cache but not in the new array
    const oldIds = (await getProductCategories()).map(c => c.id);
    const newIds = categories.map(c => c.id);
    const idsToDelete = oldIds.filter(id => !newIds.includes(id));

    if(idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('product_categories').delete().in('id', idsToDelete);
        if(deleteError) throw deleteError;
    }

    productCategoriesCache = categories; // Update cache
  } catch (error) {
    console.error("Error saving product categories to Supabase:", error);
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

export const getProducts = async (): Promise<Product[]> => {
  if (productsCache) return productsCache;
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
     if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from('products').insert(INITIAL_PRODUCTS);
      if (insertError) throw insertError;
      productsCache = INITIAL_PRODUCTS;
      return INITIAL_PRODUCTS;
    }
    productsCache = data;
    return data;
  } catch (error) {
    console.error("Error fetching products from Supabase:", error);
    return [];
  }
};

export const saveProducts = async (products: Product[]): Promise<void> => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('products').upsert(products);
    if (error) throw error;
    
    // Handle deletions
    const oldIds = (await getProducts()).map(p => p.id);
    const newIds = products.map(p => p.id);
    const idsToDelete = oldIds.filter(id => !newIds.includes(id));

    if(idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('products').delete().in('id', idsToDelete);
        if (deleteError) throw deleteError;
    }

    productsCache = products;
  } catch (error) {
    console.error("Error saving products to Supabase:", error);
  }
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Débito', value: 'debit', icon: CreditCard },
  { name: 'Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];


// ---- Get/Set from localStorage ----
// These functions are now wrappers around the new Supabase logic
// For some items, we still use localStorage for non-critical, session-only data or as a fallback.

// ---- SALES ----
export const getSales = (): Sale[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('barmate_sales');
    return data ? JSON.parse(data) : [];
};

export const saveSales = (sales: Sale[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('barmate_sales', JSON.stringify(sales));
    window.dispatchEvent(new Event('storage'));
};

export const addSale = (newSale: Sale) => {
    if (typeof window === 'undefined') return;
    const sales = getSales();
    const updatedSales = [...sales, newSale];
    saveSales(updatedSales);
    
    // Add financial entries for card/pix fees
    const fees = getTransactionFees();
    const entries = getFinancialEntries();
    const newEntries: FinancialEntry[] = [];
    
    newSale.payments.forEach(p => {
        let feeAmount = 0;
        if (p.method === 'credit' && fees.creditRate > 0) {
            feeAmount = p.amount * (fees.creditRate / 100);
        } else if (p.method === 'debit' && fees.debitRate > 0) {
            feeAmount = p.amount * (fees.debitRate / 100);
        } else if (p.method === 'pix' && fees.pixRate > 0) {
            feeAmount = p.amount * (fees.pixRate / 100);
        }
        
        if (feeAmount > 0) {
            newEntries.push({
                id: `fee-${newSale.id}-${p.method}`,
                description: `Taxa ${p.method.charAt(0).toUpperCase() + p.method.slice(1)} (Venda #${newSale.id.slice(-6)})`,
                amount: feeAmount,
                type: 'expense',
                source: 'bank_account',
                timestamp: new Date(),
                saleId: newSale.id
            });

            // Deduct fee from bank account
            const bankAccount = getBankAccount();
            saveBankAccount({ balance: bankAccount.balance - feeAmount });
        }

        if (p.method !== 'cash') {
            const bankAccount = getBankAccount();
            saveBankAccount({ balance: bankAccount.balance + p.amount });
        }
    });

    if (newEntries.length > 0) {
        saveFinancialEntries([...entries, ...newEntries]);
    }
};

export const removeSale = (saleId: string) => {
    if (typeof window === 'undefined') return;
    const sales = getSales();
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    // Revert financial impact
    const fees = getTransactionFees();
    saleToDelete.payments.forEach(p => {
        if (p.method !== 'cash') {
            let feeAmount = 0;
            if (p.method === 'credit' && fees.creditRate > 0) feeAmount = p.amount * (fees.creditRate / 100);
            else if (p.method === 'debit' && fees.debitRate > 0) feeAmount = p.amount * (fees.debitRate / 100);
            else if (p.method === 'pix' && fees.pixRate > 0) feeAmount = p.amount * (fees.pixRate / 100);
            
            const bankAccount = getBankAccount();
            // Add back the amount and the fee
            saveBankAccount({ balance: bankAccount.balance - p.amount + feeAmount });
        }
    });
    
    // Remove the sale and related fee entries
    const updatedSales = sales.filter(s => s.id !== saleId);
    const updatedEntries = getFinancialEntries().filter(e => e.saleId !== saleId);
    
    saveSales(updatedSales);
    saveFinancialEntries(updatedEntries);
};


export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// ---- FINANCIAL ENTRIES ----
export const getFinancialEntries = (): FinancialEntry[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('barmate_financialEntries');
    if (data) {
        return JSON.parse(data).map((e: any) => ({...e, timestamp: new Date(e.timestamp)}));
    }
    return [];
};

export const saveFinancialEntries = (entries: FinancialEntry[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('barmate_financialEntries', JSON.stringify(entries));
    window.dispatchEvent(new Event('storage'));
};

export const addFinancialEntry = (entry: FinancialEntry) => {
    if (typeof window === 'undefined') return;
    const entries = getFinancialEntries();
    saveFinancialEntries([...entries, entry]);
};

// --- Caixa 02 (Secondary Cash Box) ---
export const getSecondaryCashBox = (): SecondaryCashBox => {
    if (typeof window === 'undefined') return { balance: 0 };
    const data = localStorage.getItem('barmate_secondaryCashBox');
    return data ? JSON.parse(data) : { balance: 0 };
};

export const saveSecondaryCashBox = (box: SecondaryCashBox) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('barmate_secondaryCashBox', JSON.stringify(box));
    window.dispatchEvent(new Event('storage'));
};

// --- Bank Account ---
export const getBankAccount = (): BankAccount => {
    if (typeof window === 'undefined') return { balance: 0 };
    const data = localStorage.getItem('barmate_bankAccount');
    return data ? JSON.parse(data) : { balance: 0 };
};

export const saveBankAccount = (account: BankAccount) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('barmate_bankAccount', JSON.stringify(account));
    window.dispatchEvent(new Event('storage'));
};

// --- Cash Register Status ---
export const getCashRegisterStatus = (): CashRegisterStatus => {
    if (typeof window === 'undefined') return { status: 'closed', adjustments: [] };
    const data = localStorage.getItem('barmate_cashRegisterStatus');
    return data ? JSON.parse(data) : { status: 'closed', adjustments: [] };
};

export const saveCashRegisterStatus = (status: CashRegisterStatus) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('barmate_cashRegisterStatus', JSON.stringify(status));
    window.dispatchEvent(new Event('storage'));
};

// --- Transaction Fees ---
export const getTransactionFees = (): TransactionFees => {
    if (typeof window === 'undefined') return { debitRate: 2, creditRate: 4, pixRate: 1 };
    const data = localStorage.getItem('barmate_transactionFees');
    // Provide default fees if not set
    return data ? JSON.parse(data) : { debitRate: 2, creditRate: 4, pixRate: 1 };
};

export const saveTransactionFees = (fees: TransactionFees) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('barmate_transactionFees', JSON.stringify(fees));
    window.dispatchEvent(new Event('storage'));
};
