
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';
import { supabase } from './supabaseClient';

// --- LocalStorage Helper Functions (for non-critical data) ---
const saveToLocalStorage = <T,>(key: string, value: T, silent = false) => {
    if (typeof window === 'undefined') return;
    try {
        const serializedValue = JSON.stringify(value);
        window.localStorage.setItem(key, serializedValue);
        if (!silent) {
          window.dispatchEvent(new StorageEvent('storage', { key }));
        }
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null || storedValue === 'undefined') {
        saveToLocalStorage(key, defaultValue, true); // Save default silently
        return defaultValue;
    }
    try {
        return JSON.parse(storedValue);
    } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValue;
    }
};

// --- DATA KEYS ---
// Supabase Tables (Cloud)
const TBL_PRODUCT_CATEGORIES = 'product_categories';
const TBL_PRODUCTS = 'products';
const TBL_SALES = 'sales';
const TBL_OPEN_ORDERS = 'active_orders';
const TBL_FINANCIAL_ENTRIES = 'financial_entries';

// LocalStorage Keys (Local)
const LOCAL_CASH_REGISTER_STATUS_KEY = 'barmate_cashRegisterStatus_v2';
const LOCAL_SECONDARY_CASH_BOX_KEY = 'barmate_secondaryCashBox_v2';
const LOCAL_BANK_ACCOUNT_KEY = 'barmate_bankAccount_v2';
const LOCAL_TRANSACTION_FEES_KEY = 'barmate_transactionFees_v2';


// --- Data Accessor Functions ---

// CLOUD (Supabase) - These are async
export const getProductCategories = async (): Promise<ProductCategory[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(TBL_PRODUCT_CATEGORIES).select('*');
    if (error) {
        console.error('Error fetching product categories:', error);
        return [];
    }
    return data || [];
}

export const saveProductCategories = async (categories: ProductCategory[], options?: { silent?: boolean }) => {
    if (!supabase) return;
    const { error } = await supabase.from(TBL_PRODUCT_CATEGORIES).upsert(categories);
    if (error) console.error('Error saving product categories:', error);
    if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key: TBL_PRODUCT_CATEGORIES }));
    }
}

export const getProducts = async (): Promise<Product[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(TBL_PRODUCTS).select('*');
    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data || [];
}

export const saveProducts = async (products: Product[], options?: { silent?: boolean }) => {
    if (!supabase) return;
    const { error } = await supabase.from(TBL_PRODUCTS).upsert(products);
    if (error) console.error('Error saving products:', error);
    if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key: TBL_PRODUCTS }));
    }
}

export const getSales = async (): Promise<Sale[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(TBL_SALES).select('*');
     if (error) {
        console.error('Error fetching sales:', error);
        return [];
    }
    return (data as any) || [];
}

export const saveSales = async (sales: Sale[], options?: { silent?: boolean }) => {
    if (!supabase) return;
    const { error } = await supabase.from(TBL_SALES).upsert(sales as any);
    if (error) console.error('Error saving sales:', error);
    if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key: TBL_SALES }));
    }
}


export const getOpenOrders = async (): Promise<ActiveOrder[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(TBL_OPEN_ORDERS).select('*');
    if (error) {
        console.error('Error fetching open orders:', error);
        return [];
    }
    return (data as any) || [];
};

export const saveOpenOrders = async (orders: ActiveOrder[], options?: { silent?: boolean }) => {
    if (!supabase) return;
    const { error } = await supabase.from(TBL_OPEN_ORDERS).upsert(orders as any);
    if (error) console.error('Error saving open orders:', error);
    if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key: TBL_OPEN_ORDERS }));
    }
};

export const getFinancialEntries = async (): Promise<FinancialEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(TBL_FINANCIAL_ENTRIES).select('*');
    if (error) {
        console.error('Error fetching financial entries:', error);
        return [];
    }
    return (data as any) || [];
};

export const saveFinancialEntries = async (entries: FinancialEntry[], options?: { silent?: boolean }) => {
    if (!supabase) return;
    const { error } = await supabase.from(TBL_FINANCIAL_ENTRIES).upsert(entries as any);
    if (error) console.error('Error saving financial entries:', error);
     if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key: TBL_FINANCIAL_ENTRIES }));
    }
};

// LOCAL (LocalStorage) - These are sync
export const getCashRegisterStatus = (): CashRegisterStatus => getFromLocalStorage(LOCAL_CASH_REGISTER_STATUS_KEY, { status: 'closed', adjustments: [] });
export const saveCashRegisterStatus = (status: CashRegisterStatus, options?: { silent?: boolean }) => saveToLocalStorage(LOCAL_CASH_REGISTER_STATUS_KEY, status, options?.silent);

export const getSecondaryCashBox = (): SecondaryCashBox => getFromLocalStorage(LOCAL_SECONDARY_CASH_BOX_KEY, { balance: 0 });
export const saveSecondaryCashBox = (box: SecondaryCashBox, options?: { silent?: boolean }) => saveToLocalStorage(LOCAL_SECONDARY_CASH_BOX_KEY, box, options?.silent);

export const getBankAccount = (): BankAccount => getFromLocalStorage(LOCAL_BANK_ACCOUNT_KEY, { balance: 0 });
export const saveBankAccount = (account: BankAccount, options?: { silent?: boolean }) => saveToLocalStorage(LOCAL_BANK_ACCOUNT_KEY, account, options?.silent);

export const getTransactionFees = (): TransactionFees => getFromLocalStorage(LOCAL_TRANSACTION_FEES_KEY, { debitRate: 0, creditRate: 0, pixRate: 0 });
export const saveTransactionFees = (fees: TransactionFees, options?: { silent?: boolean }) => saveToLocalStorage(LOCAL_TRANSACTION_FEES_KEY, fees, options?.silent);


// --- Business Logic Functions ---

export const addSale = async (sale: Omit<Sale, 'id' | 'timestamp'> & { timestamp?: Date }) => {
  const newSale: Sale = {
    ...sale,
    id: `sale-${Date.now()}`,
    timestamp: sale.timestamp || new Date(),
  };

  const currentSales = await getSales();
  const updatedSales = [...currentSales, newSale];
  await saveSales(updatedSales);

  const fees = getTransactionFees();
  const newFinancialEntries: Omit<FinancialEntry, 'id'|'timestamp'>[] = [];

  newSale.payments.forEach(p => {
    let feeRate = 0;
    if (p.method === 'debit') feeRate = fees.debitRate;
    if (p.method === 'credit') feeRate = fees.creditRate;
    if (p.method === 'pix') feeRate = fees.pixRate;

    if (feeRate > 0) {
      const feeAmount = p.amount * (feeRate / 100);
      if (feeAmount > 0) {
        newFinancialEntries.push({
          description: `Taxa ${p.method} venda #${newSale.id.slice(-6)}`,
          amount: feeAmount,
          type: 'expense',
          source: 'bank_account',
          saleId: newSale.id,
          adjustmentId: null
        });
      }
    }
  });

  if (newFinancialEntries.length > 0) {
    await addFinancialEntry(newFinancialEntries);
  }
};

export const removeSale = async (saleId: string) => {
  const currentSales = await getSales();
  const updatedSales = currentSales.filter(s => s.id !== saleId);
  await saveSales(updatedSales);

  const currentFinancials = await getFinancialEntries();
  const updatedFinancials = currentFinancials.filter(e => e.saleId !== saleId);
  await saveFinancialEntries(updatedFinancials);
}

export const addFinancialEntry = async (entry: Omit<FinancialEntry, 'id' | 'timestamp'> | Omit<FinancialEntry, 'id' | 'timestamp'>[]) => {
    const currentEntries = await getFinancialEntries();
    const entriesToAdd = Array.isArray(entry) ? entry : [entry];

    const newEntries: FinancialEntry[] = entriesToAdd.map(e => ({
        ...e,
        id: `fin-${Date.now()}-${Math.random()}`,
        timestamp: new Date()
    }));

    await saveFinancialEntries([...currentEntries, ...newEntries]);
};

export const removeFinancialEntry = async (entryId: string) => {
  const currentEntries = await getFinancialEntries();
  const updatedEntries = currentEntries.filter(e => e.id !== entryId);
  await saveFinancialEntries(updatedEntries);
}

// --- UI Helpers ---

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Wallet
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Cartão de Débito', value: 'debit', icon: CreditCard },
  { name: 'Cartão de Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

export const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
