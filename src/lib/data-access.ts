
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder, Client, CashAdjustment, GuestRequest } from '@/types';
import {
    DATA_KEYS,
    INITIAL_PRODUCT_CATEGORIES,
    INITIAL_PRODUCTS,
    INITIAL_SALES,
    INITIAL_OPEN_ORDERS,
    INITIAL_ARCHIVED_ORDERS,
    INITIAL_GUEST_REQUESTS,
    INITIAL_CLIENTS,
    INITIAL_FINANCIAL_ENTRIES,
    INITIAL_CASH_REGISTER_STATUS,
    INITIAL_SECONDARY_CASH_BOX,
    INITIAL_BANK_ACCOUNT,
    INITIAL_TRANSACTION_FEES,
    KEY_PRODUCT_CATEGORIES,
    KEY_PRODUCTS,
    KEY_SALES,
    KEY_OPEN_ORDERS,
    KEY_ARCHIVED_ORDERS,
    KEY_CLIENTS,
    KEY_FINANCIAL_ENTRIES,
    KEY_CASH_REGISTER_STATUS,
    KEY_TRANSACTION_FEES,
    KEY_GUEST_REQUESTS,
    KEY_GUEST_SESSION,
    KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES,
    KEY_VISUALLY_REMOVED_ADJUSTMENTS,
    KEY_SECONDARY_CASH_BOX,
    KEY_BANK_ACCOUNT,
    KEY_CLOSED_SESSIONS,
} from './constants';


// --- LocalStorage Helper Functions ---
const saveToLocalStorage = <T,>(key: string, value: T, options?: { silent?: boolean }) => {
  if (typeof window !== 'undefined') {
    try {
      const serializedValue = JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
      if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }
};

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null || storedValue === 'undefined') {
      return defaultValue;
    }
    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    saveToLocalStorage(key, defaultValue);
    return defaultValue;
  }
};

// --- SessionStorage Helper Functions ---
const saveToSessionStorage = <T,>(key: string, value: T) => {
  if (typeof window !== 'undefined') {
    try {
      const serializedValue = JSON.stringify(value);
      window.sessionStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Error saving to sessionStorage key "${key}":`, error);
    }
  }
};

const getFromSessionStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const storedValue = window.sessionStorage.getItem(key);
    if (storedValue === null || storedValue === 'undefined') {
      return defaultValue;
    }
    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Error parsing sessionStorage key "${key}":`, error);
    return defaultValue;
  }
};

// --- Data Migration ---
const MIGRATION_FLAG_KEY = 'barmate_migration_v2_completed_final';

export function migrateOldData() {
    if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_FLAG_KEY)) {
        return;
    }

    const migrateKey = (oldKey: string, newKey: string) => {
        const oldDataRaw = localStorage.getItem(oldKey);
        if (oldDataRaw) {
            localStorage.setItem(newKey, oldDataRaw);
            localStorage.removeItem(oldKey);
        }
    };
    
    const oldKeys = [
        'barmate_productCategories', 'barmate_productCategories_v2',
        'barmate_products', 'barmate_products_v2',
        'barmate_sales', 'barmate_sales_v2',
        'barmate_openOrders', 'barmate_openOrders_v2',
        'barmate_clients', 'barmate_clients_v2',
        'barmate_financialEntries', 'barmate_financialEntries_v2',
        'barmate_cashRegisterStatus', 'barmate_cashRegisterStatus_v2',
        'barmate_transactionFees', 'barmate_transactionFees_v2',
        'barmate_counterSaleOrderItems', 'barmate_counterSaleOrderItems_v2'
    ];
    
    const uniqueOldKeys = [...new Set(oldKeys)];

    uniqueOldKeys.forEach(oldKey => {
        const newKey = `barmate_${oldKey.split('_')[1]}_v2`;
        if (oldKey !== newKey) {
            migrateKey(oldKey, newKey);
        }
    });
    
    window.dispatchEvent(new Event('storage')); 
};


// --- Data Accessor Functions ---

export function getProductCategories(): ProductCategory[] {
    return getFromLocalStorage(KEY_PRODUCT_CATEGORIES, INITIAL_PRODUCT_CATEGORIES);
}
export function saveProductCategories(categories: ProductCategory[]) {
    saveToLocalStorage(KEY_PRODUCT_CATEGORIES, categories);
}

export function getProducts(): Product[] {
    return getFromLocalStorage(KEY_PRODUCTS, INITIAL_PRODUCTS);
}
export function saveProducts(products: Product[]) {
    saveToLocalStorage(KEY_PRODUCTS, products);
}

export function getSales(): Sale[] {
    const sales = getFromLocalStorage<Sale[]>(KEY_SALES, INITIAL_SALES);
    return sales.map(sale => ({
        ...sale,
        payments: sale.payments || [],
        items: sale.items || [],
    }));
}
export function saveSales(sales: Sale[]) {
    saveToLocalStorage(KEY_SALES, sales);
}

export function getOpenOrders(): ActiveOrder[] {
    return getFromLocalStorage(KEY_OPEN_ORDERS, INITIAL_OPEN_ORDERS);
}
export function saveOpenOrders(orders: ActiveOrder[]) {
    saveToLocalStorage(KEY_OPEN_ORDERS, orders);
}

export function getArchivedOrders(): ActiveOrder[] {
    return getFromLocalStorage(KEY_ARCHIVED_ORDERS, INITIAL_ARCHIVED_ORDERS);
}
export function saveArchivedOrders(orders: ActiveOrder[]) {
    saveToLocalStorage(KEY_ARCHIVED_ORDERS, orders);
}

export function getClients(): Client[] {
    return getFromLocalStorage(KEY_CLIENTS, INITIAL_CLIENTS);
}
export function saveClients(clients: Client[]) {
    saveToLocalStorage(KEY_CLIENTS, clients);
}

export function getFinancialEntries(): FinancialEntry[] {
    return getFromLocalStorage(KEY_FINANCIAL_ENTRIES, INITIAL_FINANCIAL_ENTRIES);
}
export function saveFinancialEntries(entries: FinancialEntry[]) {
    saveToLocalStorage(KEY_FINANCIAL_ENTRIES, entries);
}

export function getCashRegisterStatus(): CashRegisterStatus {
    return getFromLocalStorage(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
}
export function saveCashRegisterStatus(status: CashRegisterStatus, options?: { silent?: boolean }) {
    saveToLocalStorage(KEY_CASH_REGISTER_STATUS, status, options);
}

export function getTransactionFees(): TransactionFees {
    return getFromLocalStorage(KEY_TRANSACTION_FEES, INITIAL_TRANSACTION_FEES);
}
export function saveTransactionFees(fees: TransactionFees, options?: { silent?: boolean }) {
    saveToLocalStorage(KEY_TRANSACTION_FEES, fees, options);
}

export function getGuestRequests(): GuestRequest[] {
    return getFromLocalStorage(KEY_GUEST_REQUESTS, INITIAL_GUEST_REQUESTS);
}
export function saveGuestRequests(requests: GuestRequest[]) {
    saveToLocalStorage(KEY_GUEST_REQUESTS, requests);
}

export function getGuestSession(): { guestRequestId: string } | null {
    return getFromLocalStorage(KEY_GUEST_SESSION, null);
}
export function saveGuestSession(session: { guestRequestId: string } | null) {
    saveToLocalStorage(KEY_GUEST_SESSION, session, { silent: true });
}

export function getVisuallyRemovedFinancialEntries(): string[] {
    return getFromSessionStorage(KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES, []);
}
export function saveVisuallyRemovedFinancialEntries(ids: string[]) {
    saveToSessionStorage(KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES, ids);
}

export function getVisuallyRemovedAdjustments(): string[] {
    return getFromSessionStorage(KEY_VISUALLY_REMOVED_ADJUSTMENTS, []);
}
export function saveVisuallyRemovedAdjustments(ids: string[]) {
    saveToSessionStorage(KEY_VISUALLY_REMOVED_ADJUSTMENTS, ids);
}


// --- Business Logic Functions ---

export function addSale(sale: Sale | (Omit<Sale, 'id' | 'timestamp'> & { name: string, timestamp?: Date })) {
  const newSale: Sale = {
    id: `sale-${Date.now()}`,
    timestamp: new Date(),
    ...sale,
    payments: 'payments' in sale ? (sale.payments || []) : [], // Ensure payments is an array
  };

  const currentSales = getSales();
  const updatedSales = [...currentSales, newSale];
  saveSales(updatedSales);

  const fees = getTransactionFees();
  const newFinancialEntries: Omit<FinancialEntry, 'id'|'timestamp'>[] = [];

  const saleName = 'name' in sale ? sale.name : `Venda #${newSale.id.slice(-6)}`;
  
  newSale.payments.forEach((p: Payment) => {
    if (p.amount <= 0) return;

    if (['debit', 'credit', 'pix'].includes(p.method)) {
      let feeRate = 0;
      if (p.method === 'debit') feeRate = fees.debitRate;
      if (p.method === 'credit') feeRate = fees.creditRate;
      if (p.method === 'pix') feeRate = fees.pixRate;

      const feeAmount = p.amount * (feeRate / 100);
      
      newFinancialEntries.push({
        description: `${saleName} via ${p.method}`,
        amount: p.amount,
        type: 'income',
        source: 'bank_account',
        saleId: newSale.id,
        adjustmentId: null
      });

      if (feeAmount > 0) {
        newFinancialEntries.push({
          description: `Taxa ${p.method} ${saleName}`,
          amount: feeAmount,
          type: 'expense',
          source: 'bank_account',
          saleId: newSale.id,
          adjustmentId: null
        });
      }
    } else if (p.method === 'cash') {
        const netCash = p.amount - (newSale.changeGiven || 0);
        if(netCash > 0) {
          newFinancialEntries.push({
             description: `${saleName} em dinheiro`,
             amount: netCash,
             type: 'income',
             source: 'daily_cash',
             saleId: newSale.id,
             adjustmentId: null,
          });
        }
    }
  });

  if (newFinancialEntries.length > 0) {
    addFinancialEntry(newFinancialEntries);
  }
};

export function removeSale(saleId: string) {
  const currentSales = getSales();
  const updatedSales = currentSales.filter(s => s.id !== saleId);
  saveSales(updatedSales);
  
  // Find all financial entries related to this saleId and remove them
  const allEntries = getFinancialEntries();
  const entriesToKeep = allEntries.filter(e => e.saleId !== saleId);
  saveFinancialEntries(entriesToKeep);
}

export function addFinancialEntry(entry: Omit<FinancialEntry, 'id' | 'timestamp'> | Omit<FinancialEntry, 'id' | 'timestamp'>[]) {
    const currentEntries = getFinancialEntries();
    const entriesToAdd = Array.isArray(entry) ? entry : [entry];

    const newEntries: FinancialEntry[] = entriesToAdd.map((e, i) => ({
        ...e,
        id: `fin-${Date.now()}-${i}`,
        timestamp: new Date()
    }));

    const allEntries = [...currentEntries, ...newEntries];
    saveFinancialEntries(allEntries);
};


export function clearFinancialData() {
    if (typeof window !== 'undefined') {
        saveToLocalStorage(KEY_SALES, []);
        saveToLocalStorage(KEY_FINANCIAL_ENTRIES, []);
        saveToLocalStorage(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
        saveToLocalStorage(KEY_CLOSED_SESSIONS, []);
        saveToLocalStorage(KEY_SECONDARY_CASH_BOX, INITIAL_SECONDARY_CASH_BOX);
        saveToLocalStorage(KEY_BANK_ACCOUNT, INITIAL_BANK_ACCOUNT);
        window.dispatchEvent(new Event('storage'));
    }
};

// Dummy function to satisfy type checker, will not be used in local mode
export function getFromSupabase() {
  return Promise.resolve({ data: [], error: null });
}
