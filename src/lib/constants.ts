
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, CashAdjustment, OrderItem, ActiveOrder } from '@/types';
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
  if (!supabase) {
    return getFromLocalStorage('barmate_product_categories', INITIAL_PRODUCT_CATEGORIES);
  }

  try {
    const { data, error } = await supabase.from('product_categories').select('*');
    if (error) throw error;
    
    if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from('product_categories').insert(INITIAL_PRODUCT_CATEGORIES);
      if (insertError) throw insertError;
      productCategoriesCache = INITIAL_PRODUCT_CATEGORIES;
      return INITIAL_PRODUCT_CATEGORIES;
    }
    
    productCategoriesCache = data;
    return data;
  } catch (error) {
    console.error("Error fetching product categories:", error);
    // Fallback to local storage if Supabase fails
    return getFromLocalStorage('barmate_product_categories', INITIAL_PRODUCT_CATEGORIES);
  }
};

export const saveProductCategories = async (categories: ProductCategory[]): Promise<void> => {
  productCategoriesCache = categories; // Update cache immediately for UI responsiveness
  window.dispatchEvent(new Event('storage'));

  if (!supabase) {
    saveToLocalStorage('barmate_product_categories', categories);
    return;
  }
  try {
    const { error } = await supabase.from('product_categories').upsert(categories, { onConflict: 'id' });
    if (error) throw error;

    const {data: existingCategories} = await supabase.from('product_categories').select('id');
    const oldIds = existingCategories?.map(c => c.id) || [];
    const newIds = categories.map(c => c.id);
    const idsToDelete = oldIds.filter(id => !newIds.includes(id));

    if(idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('product_categories').delete().in('id', idsToDelete);
        if(deleteError) throw deleteError;
    }
  } catch (error) {
    console.error("Error saving product categories:", error);
  }
};


export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cerveja Pilsen Long Neck', price: 12.00, categoryId: 'cat_alcoolicas', stock: 100 },
  { id: '2', name: 'Taça de Vinho Tinto Seco', price: 25.00, categoryId: 'cat_alcoolicas', stock: 50 },
  { id: '3', name: 'Caipirinha de Limão', price: 18.00, categoryId: 'cat_alcoolicas', stock: 70 },
  { id: '4', name: 'Refrigerante Lata', price: 7.00, categoryId: 'cat_nao_alcoolicas', stock: 150 },
  { id: '5', name: 'Suco Natural Laranja', price: 10.00, categoryId: 'cat_nao_alcoolicas', stock: 80 },
];

export const getProducts = async (): Promise<Product[]> => {
  if (productsCache) return productsCache;
  if (!supabase) {
      return getFromLocalStorage('barmate_products', INITIAL_PRODUCTS);
  }

  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
     if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from('products').insert(INITIAL_PRODUCTS.map(p => ({ 
        id: p.id,
        name: p.name,
        price: p.price,
        categoryId: p.categoryId,
        stock: p.stock,
        is_combo: p.isCombo,
        combo_items: p.comboItems
      })));
      if (insertError) throw insertError;
      productsCache = INITIAL_PRODUCTS;
      return INITIAL_PRODUCTS;
    }
    productsCache = data.map(p => ({ ...p, isCombo: p.is_combo, comboItems: p.combo_items })) as Product[];
    return productsCache;
  } catch (error) {
    console.error("Error fetching products:", error);
    return getFromLocalStorage('barmate_products', []);
  }
};

export const saveProducts = async (products: Product[]): Promise<void> => {
  productsCache = products;
  window.dispatchEvent(new Event('storage'));

  if (!supabase) {
    saveToLocalStorage('barmate_products', products);
    return;
  }
  try {
    const productsToSave = products.map(p => ({ 
        id: p.id,
        name: p.name,
        price: p.price,
        categoryId: p.categoryId,
        stock: p.stock,
        is_combo: p.isCombo,
        combo_items: p.comboItems,
    }));
    const { error } = await supabase.from('products').upsert(productsToSave, { onConflict: 'id' });
    if (error) throw error;
    
    const {data: existingProducts} = await supabase.from('products').select('id');
    const oldIds = existingProducts?.map(p => p.id) || [];
    const newIds = products.map(p => p.id);
    const idsToDelete = oldIds.filter(id => !newIds.includes(id));

    if(idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('products').delete().in('id', idsToDelete);
        if (deleteError) throw deleteError;
    }
  } catch (error) {
    console.error("Error saving products:", error);
  }
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Débito', value: 'debit', icon: CreditCard },
  { name: 'Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];


export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};


// Generic function to get data from local storage as a fallback
const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    const data = localStorage.getItem(key);
    try {
        return data ? JSON.parse(data) : defaultValue;
    } catch {
        return defaultValue;
    }
};

// Generic function to save data to local storage as a fallback
const saveToLocalStorage = <T>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
};

// --- Open Orders ---
export const getOpenOrders = async (): Promise<ActiveOrder[]> => {
    if (!supabase) return getFromLocalStorage('barmate_openOrders', []);
    try {
        const { data, error } = await supabase.from('active_orders').select('*');
        if (error) throw error;
        return (data || []).map(o => ({
            ...o,
            createdAt: new Date(o.created_at),
        })) as ActiveOrder[];
    } catch(e) {
        console.error("Error getting open orders:", e);
        return [];
    }
}
export const saveOpenOrders = async (orders: ActiveOrder[]) => {
    if (!supabase) {
        saveToLocalStorage('barmate_openOrders', orders);
        return;
    }
    try {
        const ordersToSave = orders.map(o => ({
            id: o.id,
            name: o.name,
            items: o.items as any,
            created_at: o.createdAt.toISOString(),
            status: o.status
        }));

        const { error } = await supabase.from('active_orders').upsert(ordersToSave, { onConflict: 'id' });
        if (error) throw error;

        const currentOrderIds = orders.map(o => o.id);
        const { data: existingOrders } = await supabase.from('active_orders').select('id');
        const idsToDelete = existingOrders?.filter(o => !currentOrderIds.includes(o.id)).map(o => o.id) || [];
        
        if (idsToDelete.length > 0) {
            await supabase.from('active_orders').delete().in('id', idsToDelete);
        }
    } catch (e) {
        console.error("Error saving open orders:", e);
    } finally {
       window.dispatchEvent(new Event('storage'));
    }
}

// ---- SALES ----
export const getSales = async (): Promise<Sale[]> => {
    if (!supabase) return getFromLocalStorage('barmate_sales', []);
    try {
        const { data, error } = await supabase.from('sales').select('*');
        if (error) throw error;
        return (data || []).map(s => ({
            ...s,
            timestamp: new Date(s.timestamp),
            totalAmount: s.total_amount,
            originalAmount: s.original_amount,
            discountAmount: s.discount_amount,
            cashTendered: s.cash_tendered,
            changeGiven: s.change_given,
            leaveChangeAsCredit: s.leave_change_as_credit,
        })) as Sale[];
    } catch(e) {
        console.error("Error getting sales:", e);
        return [];
    }
};

export const addSale = async (newSale: Omit<Sale, 'id'> & {id?: string}): Promise<void> => {
    const saleWithId: Sale = { ...newSale, id: newSale.id || `sale-${Date.now()}` };

    if (!supabase) {
        const sales = getFromLocalStorage('barmate_sales', []);
        saveToLocalStorage('barmate_sales', [...sales, saleWithId]);
    } else {
       try {
            const { error } = await supabase.from('sales').insert([{
                id: saleWithId.id,
                items: saleWithId.items as any,
                total_amount: saleWithId.totalAmount,
                original_amount: saleWithId.originalAmount,
                discount_amount: saleWithId.discountAmount,
                payments: saleWithId.payments as any,
                cash_tendered: saleWithId.cashTendered,
                change_given: saleWithId.changeGiven,
                timestamp: saleWithId.timestamp.toISOString(),
                status: saleWithId.status,
                leave_change_as_credit: saleWithId.leaveChangeAsCredit
            }]);
            if (error) throw error;
       } catch (e) {
            console.error("Error adding sale:", e);
       }
    }
    
    // Add financial entries for card/pix fees and revenue
    const fees = getTransactionFees();
    
    for (const p of saleWithId.payments) {
        let feeAmount = 0;
        let feeDescription = '';

        if (p.method === 'credit' && fees.creditRate > 0) {
            feeAmount = p.amount * (fees.creditRate / 100);
            feeDescription = `Taxa Crédito (Venda #${saleWithId.id.slice(-6)})`;
        } else if (p.method === 'debit' && fees.debitRate > 0) {
            feeAmount = p.amount * (fees.debitRate / 100);
            feeDescription = `Taxa Débito (Venda #${saleWithId.id.slice(-6)})`;
        } else if (p.method === 'pix' && fees.pixRate > 0) {
            feeAmount = p.amount * (fees.pixRate / 100);
            feeDescription = `Taxa PIX (Venda #${saleWithId.id.slice(-6)})`;
        }

        // Register revenue and deduct fee
        if (p.method !== 'cash') {
            await addFinancialEntry({ 
                description: `Receita Venda (${p.method}) #${saleWithId.id.slice(-6)}`, amount: p.amount, type: 'income', source: 'bank_account', timestamp: new Date(), saleId: saleWithId.id 
            });
            if (feeAmount > 0) {
                await addFinancialEntry({ description: feeDescription, amount: feeAmount, type: 'expense', source: 'bank_account', timestamp: new Date(), saleId: saleWithId.id });
            }
        }
    }
    window.dispatchEvent(new Event('storage'));
};

export const removeSale = async (saleId: string) => {
    if (!supabase) {
        const sales = getFromLocalStorage('barmate_sales', []).filter((s: Sale) => s.id !== saleId);
        saveToLocalStorage('barmate_sales', sales);
        const entries = getFromLocalStorage('barmate_financialEntries', []).filter((e: FinancialEntry) => e.saleId !== saleId);
        saveToLocalStorage('barmate_financialEntries', entries);
        window.dispatchEvent(new Event('storage'));
        return;
    }

    try {
        await supabase.from('sales').delete().eq('id', saleId);
        await supabase.from('financial_entries').delete().eq('saleId', saleId);
    } catch (e) {
        console.error("Error removing sale:", e);
    } finally {
        window.dispatchEvent(new Event('storage'));
    }
};


// ---- FINANCIAL ENTRIES ----
export const getFinancialEntries = async (): Promise<FinancialEntry[]> => {
    if (!supabase) return getFromLocalStorage('barmate_financialEntries', []);
    try {
        const { data, error } = await supabase.from('financial_entries').select('*');
        if (error) throw error;
        return (data || []).map(e => ({ ...e, timestamp: new Date(e.timestamp) })) as FinancialEntry[];
    } catch (e) {
        console.error("Error getting financial entries:", e);
        return [];
    }
};

export const addFinancialEntry = async (entry: Omit<FinancialEntry, 'id'> & {id?:string}): Promise<void> => {
    const entryWithId: FinancialEntry = { ...entry, id: entry.id || `entry-${Date.now()}` } as FinancialEntry;
    if (!supabase) {
        const entries = getFromLocalStorage('barmate_financialEntries', []);
        saveToLocalStorage('barmate_financialEntries', [...entries, entryWithId]);
    } else {
        try {
            await supabase.from('financial_entries').insert([{ ...entryWithId, timestamp: entryWithId.timestamp.toISOString() }]);
        } catch(e) {
             console.error("Error adding financial entry:", e);
        }
    }
    // Don't dispatch storage event here to avoid loops with addSale
};

export const removeFinancialEntry = async (entryId: string) => {
    if(!supabase) {
        const entries = getFromLocalStorage('barmate_financialEntries', []).filter((e: FinancialEntry) => e.id !== entryId);
        saveToLocalStorage('barmate_financialEntries', entries);
        window.dispatchEvent(new Event('storage'));
        return;
    }
    try {
        await supabase.from('financial_entries').delete().eq('id', entryId);
    } catch(e) {
        console.error("Error removing financial entry:", e);
    } finally {
        window.dispatchEvent(new Event('storage'));
    }
}


// --- Balances (Caixa 02, Bank Account) are stored in one table ---
export const getSecondaryCashBox = async (): Promise<SecondaryCashBox> => {
    if(!supabase) return getFromLocalStorage('barmate_secondaryCashBox', { balance: 0 });
    try {
        const { data, error } = await supabase.from('balances').select('balance').eq('id', 'secondary_cash').single();
        // If no row is found (error code PGRST116), create it.
        if (error && error.code === 'PGRST116') {
          console.log('No secondary_cash balance found, creating one...');
          await supabase.from('balances').insert({ id: 'secondary_cash', balance: 0 });
          return { balance: 0 };
        }
        if (error) throw error;
        
        return { balance: data.balance };
    } catch (e) {
        console.error("Error getting secondary cash box:", e);
        return { balance: 0 };
    }
};

export const saveSecondaryCashBox = async (box: SecondaryCashBox) => {
    if (!supabase) {
        saveToLocalStorage('barmate_secondaryCashBox', box);
        return;
    }
    try {
        await supabase.from('balances').upsert({ id: 'secondary_cash', balance: box.balance });
    } catch(e) {
        console.error("Error saving secondary cash box:", e);
    } finally {
       window.dispatchEvent(new Event('storage'));
    }
};

export const getBankAccount = async (): Promise<BankAccount> => {
     if(!supabase) return getFromLocalStorage('barmate_bankAccount', { balance: 0 });
    try {
        const { data, error } = await supabase.from('balances').select('balance').eq('id', 'bank_account').single();
        // If no row is found (error code PGRST116), create it.
        if (error && error.code === 'PGRST116') {
          console.log('No bank_account balance found, creating one...');
          await supabase.from('balances').insert({ id: 'bank_account', balance: 0 });
          return { balance: 0 };
        }
        if (error) throw error;

        return { balance: data.balance };
    } catch (e) {
        console.error("Error getting bank account:", e);
        return { balance: 0 };
    }
};

export const saveBankAccount = async (account: BankAccount) => {
    if (!supabase) {
        saveToLocalStorage('barmate_bankAccount', account);
        return;
    }
    try {
        await supabase.from('balances').upsert({ id: 'bank_account', balance: account.balance });
    } catch(e) {
        console.error("Error saving bank account:", e);
    } finally {
       window.dispatchEvent(new Event('storage'));
    }
};

// --- Cash Register Status (always local) ---
export const getCashRegisterStatus = (): CashRegisterStatus => {
    return getFromLocalStorage('barmate_cashRegisterStatus_v2', { status: 'closed', adjustments: [] });
};

export const saveCashRegisterStatus = (status: CashRegisterStatus) => {
    saveToLocalStorage('barmate_cashRegisterStatus_v2', status);
};

// --- Transaction Fees (always local) ---
export const getTransactionFees = (): TransactionFees => {
    return getFromLocalStorage('barmate_transactionFees_v2', { debitRate: 2, creditRate: 4, pixRate: 1 });
};

export const saveTransactionFees = (fees: TransactionFees) => {
    saveToLocalStorage('barmate_transactionFees_v2', fees);
};
