

import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder, Client, CashAdjustment } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Banknote, CreditCard, QrCode, Wallet, Users, type LucideIcon } from 'lucide-react';

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
    // If parsing fails, return the default value to prevent app crash
    // And also save the default value to reset the corrupted data
    saveToLocalStorage(key, defaultValue);
    return defaultValue;
  }
};


// --- DATA KEYS ---
export const DATA_KEYS = [
    'barmate_productCategories_v2',
    'barmate_products_v2',
    'barmate_sales_v2',
    'barmate_openOrders_v2',
    'barmate_clients_v2',
    'barmate_financialEntries_v2',
    'barmate_cashRegisterStatus_v2',
    'barmate_secondaryCashBox_v2', // Kept for structure, but balance is now calculated
    'barmate_bankAccount_v2',     // Kept for structure, but balance is now calculated
    'barmate_transactionFees_v2',
    'barmate_counterSaleOrderItems_v2',
    'barName'
];
const KEY_PRODUCT_CATEGORIES = 'barmate_productCategories_v2';
const KEY_PRODUCTS = 'barmate_products_v2';
const KEY_SALES = 'barmate_sales_v2';
const KEY_OPEN_ORDERS = 'barmate_openOrders_v2';
const KEY_CLIENTS = 'barmate_clients_v2';
const KEY_FINANCIAL_ENTRIES = 'barmate_financialEntries_v2';
const KEY_CASH_REGISTER_STATUS = 'barmate_cashRegisterStatus_v2';
const KEY_SECONDARY_CASH_BOX = 'barmate_secondaryCashBox_v2';
const KEY_BANK_ACCOUNT = 'barmate_bankAccount_v2';
const KEY_TRANSACTION_FEES = 'barmate_transactionFees_v2';


// --- INITIAL DATA (CLEAN STATE) ---
export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_cervejas', name: 'Cervejas', iconName: 'Beer' },
  { id: 'cat_vinhos', name: 'Vinhos', iconName: 'Wine' },
  { id: 'cat_destilados', name: 'Drinks', iconName: 'Martini' },
  { id: 'cat_sem_alcool', name: 'Sem Álcool', iconName: 'Coffee' },
  { id: 'cat_porcoes', name: 'Porções', iconName: 'UtensilsCrossed' },
  { id: 'cat_sobremesas', name: 'Sobremesas', iconName: 'CakeSlice' },
  { id: 'cat_outros', name: 'Outros', iconName: 'Package' },
];
export const INITIAL_PRODUCTS: Product[] = [
    // Cervejas
    { id: 'prod_1', name: 'Cerveja Pilsen 600ml', price: 12.00, categoryId: 'cat_cervejas', stock: 100 },
    { id: 'prod_2', name: 'Cerveja IPA Long Neck', price: 15.00, categoryId: 'cat_cervejas', stock: 50 },
    { id: 'prod_3', name: 'Cerveja de Trigo 500ml', price: 18.00, categoryId: 'cat_cervejas', stock: 40 },
    { id: 'prod_22', name: 'Balde com 6 Pilsen Long Neck', price: 60.00, categoryId: 'cat_cervejas', stock: 20, isCombo: true, comboItems: 6},

    // Vinhos
    { id: 'prod_4', name: 'Taça de Vinho Tinto Seco', price: 25.00, categoryId: 'cat_vinhos', stock: null },
    { id: 'prod_5', name: 'Garrafa de Vinho Branco Suave', price: 80.00, categoryId: 'cat_vinhos', stock: 10 },

    // Drinks
    { id: 'prod_6', name: 'Caipirinha de Limão', price: 18.00, categoryId: 'cat_destilados', stock: null },
    { id: 'prod_7', name: 'Gin Tônica', price: 28.00, categoryId: 'cat_destilados', stock: null },
    { id: 'prod_8', name: 'Mojito', price: 22.00, categoryId: 'cat_destilados', stock: null },

    // Sem Álcool
    { id: 'prod_9', name: 'Refrigerante Lata', price: 6.00, categoryId: 'cat_sem_alcool', stock: 200 },
    { id: 'prod_10', name: 'Água com Gás', price: 4.00, categoryId: 'cat_sem_alcool', stock: 150 },
    { id: 'prod_11', name: 'Suco Natural de Laranja', price: 9.00, categoryId: 'cat_sem_alcool', stock: null },
    { id: 'prod_12', name: 'Café Espresso', price: 5.00, categoryId: 'cat_sem_alcool', stock: null },

    // Porções
    { id: 'prod_13', name: 'Batata Frita com Cheddar e Bacon', price: 35.00, categoryId: 'cat_porcoes', stock: null },
    { id: 'prod_14', name: 'Anéis de Cebola', price: 28.00, categoryId: 'cat_porcoes', stock: null },
    { id: 'prod_15', name: 'Frango a Passarinho', price: 45.00, categoryId: 'cat_porcoes', stock: null },
    { id: 'prod_16', name: 'Tábua de Frios', price: 60.00, categoryId: 'cat_porcoes', stock: 20 },

    // Sobremesas
    { id: 'prod_17', name: 'Petit Gâteau', price: 22.00, categoryId: 'cat_sobremesas', stock: 30 },
    { id: 'prod_18', name: 'Pudim de Leite', price: 15.00, categoryId: 'cat_sobremesas', stock: 25 },

    // Outros
    { id: 'prod_19', name: 'Dose de Whisky 12 Anos', price: 30.00, categoryId: 'cat_outros', stock: null },
    { id: 'prod_20', name: 'Couvert Artístico', price: 10.00, categoryId: 'cat_outros', stock: null },
    { id: 'prod_21', name: 'Taxa de Serviço (10%)', price: 0, categoryId: 'cat_outros', stock: null },
];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_OPEN_ORDERS: ActiveOrder[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_FINANCIAL_ENTRIES: FinancialEntry[] = [];
export const INITIAL_CASH_REGISTER_STATUS: CashRegisterStatus = { status: 'closed', adjustments: [] };
export const INITIAL_SECONDARY_CASH_BOX: SecondaryCashBox = { balance: 0 };
export const INITIAL_BANK_ACCOUNT: BankAccount = { balance: 0 };
export const INITIAL_TRANSACTION_FEES: TransactionFees = { debitRate: 1.99, creditRate: 4.99, pixRate: 0.99 };

// --- Data Migration ---
const MIGRATION_FLAG_KEY = 'barmate_migration_v2_completed_final';

export const migrateOldData = () => {
    if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_FLAG_KEY)) {
        return;
    }

    const migrateKey = (oldKey: string, newKey: string) => {
        const oldDataRaw = localStorage.getItem(oldKey);
        if (oldDataRaw) {
            localStorage.setItem(newKey, oldDataRaw);
            localStorage.removeItem(oldKey);
            console.log(`Successfully migrated data from ${oldKey} to ${newKey}`);
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
        'barmate_secondaryCashBox', 'barmate_secondaryCashBox_v2',
        'barmate_bankAccount', 'barmate_bankAccount_v2',
        'barmate_transactionFees', 'barmate_transactionFees_v2',
        'barmate_counterSaleOrderItems', 'barmate_counterSaleOrderItems_v2'
    ];
    
    const uniqueOldKeys = [...new Set(oldKeys)];

    console.log("Checking for old data to migrate...");
    uniqueOldKeys.forEach(oldKey => {
        const newKey = `barmate_${oldKey.split('_')[1]}_v2`;
        if (oldKey !== newKey) {
            migrateKey(oldKey, newKey);
        }
    });
    
    const oldBarName = localStorage.getItem('barName');
    if (oldBarName) {
        console.log("Bar name found, preserved.");
    }
    
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    console.log("Data migration check completed.");
    window.dispatchEvent(new Event('storage')); 
};


// --- Data Accessor Functions ---

export const getProductCategories = (): ProductCategory[] => getFromLocalStorage(KEY_PRODUCT_CATEGORIES, INITIAL_PRODUCT_CATEGORIES);
export const saveProductCategories = (categories: ProductCategory[]) => saveToLocalStorage(KEY_PRODUCT_CATEGORIES, categories);

export const getProducts = (): Product[] => getFromLocalStorage(KEY_PRODUCTS, INITIAL_PRODUCTS);
export const saveProducts = (products: Product[]) => saveToLocalStorage(KEY_PRODUCTS, products);

export const getSales = (): Sale[] => getFromLocalStorage(KEY_SALES, INITIAL_SALES);
export const saveSales = (sales: Sale[]) => saveToLocalStorage(KEY_SALES, sales);

export const getOpenOrders = (): ActiveOrder[] => getFromLocalStorage(KEY_OPEN_ORDERS, INITIAL_OPEN_ORDERS);
export const saveOpenOrders = (orders: ActiveOrder[]) => saveToLocalStorage(KEY_OPEN_ORDERS, orders);

export const getClients = (): Client[] => getFromLocalStorage(KEY_CLIENTS, INITIAL_CLIENTS);
export const saveClients = (clients: Client[]) => saveToLocalStorage(KEY_CLIENTS, clients);

export const getFinancialEntries = (): FinancialEntry[] => getFromLocalStorage(KEY_FINANCIAL_ENTRIES, INITIAL_FINANCIAL_ENTRIES);
export const saveFinancialEntries = (entries: FinancialEntry[]) => saveToLocalStorage(KEY_FINANCIAL_ENTRIES, entries);

export const getCashRegisterStatus = (): CashRegisterStatus => getFromLocalStorage(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
export const saveCashRegisterStatus = (status: CashRegisterStatus, options?: { silent?: boolean }) => saveToLocalStorage(KEY_CASH_REGISTER_STATUS, status, options);

// These functions now only get the structure, not a real balance. Balance is calculated.
export const getSecondaryCashBox = (): SecondaryCashBox => getFromLocalStorage(KEY_SECONDARY_CASH_BOX, INITIAL_SECONDARY_CASH_BOX);
export const getBankAccount = (): BankAccount => getFromLocalStorage(KEY_BANK_ACCOUNT, INITIAL_BANK_ACCOUNT);
// These save functions are now only for maintaining structure, balance is ignored.
export const saveSecondaryCashBox = (box: SecondaryCashBox, options?: { silent?: boolean }) => saveToLocalStorage(KEY_SECONDARY_CASH_BOX, box, options);
export const saveBankAccount = (account: BankAccount, options?: { silent?: boolean }) => saveToLocalStorage(KEY_BANK_ACCOUNT, account, options);


export const getTransactionFees = (): TransactionFees => getFromLocalStorage(KEY_TRANSACTION_FEES, INITIAL_TRANSACTION_FEES);
export const saveTransactionFees = (fees: TransactionFees, options?: { silent?: boolean }) => saveToLocalStorage(KEY_TRANSACTION_FEES, fees, options);


// --- Business Logic Functions ---

export const addSale = (sale: Omit<Sale, 'id' | 'timestamp'> & { timestamp?: Date }) => {
  const newSale: Sale = {
    ...sale,
    id: `sale-${Date.now()}`,
    timestamp: sale.timestamp || new Date(),
  };

  const currentSales = getSales();
  const updatedSales = [...currentSales, newSale];
  saveSales(updatedSales);

  const fees = getTransactionFees();
  const newFinancialEntries: Omit<FinancialEntry, 'id'|'timestamp'>[] = [];
  
  const creditPaidAmount = newSale.items
    .filter(item => item.price < 0)
    .reduce((sum, item) => sum + Math.abs(item.price * item.quantity), 0);

  let remainingPayments = JSON.parse(JSON.stringify(newSale.payments));
  let remainingCreditToApply = creditPaidAmount;

  for (const payment of remainingPayments) {
      if (remainingCreditToApply <= 0) break;
      const amountToDeduct = Math.min(payment.amount, remainingCreditToApply);
      payment.amount -= amountToDeduct;
      remainingCreditToApply -= amountToDeduct;
  }
  
  remainingPayments.filter((p: Payment) => p.amount > 0).forEach((p: Payment) => {
    if (['debit', 'credit', 'pix'].includes(p.method)) {
      let feeRate = 0;
      if (p.method === 'debit') feeRate = fees.debitRate;
      if (p.method === 'credit') feeRate = fees.creditRate;
      if (p.method === 'pix') feeRate = fees.pixRate;

      const feeAmount = p.amount * (feeRate / 100);
      
      newFinancialEntries.push({
        description: `Venda #${newSale.id.slice(-6)} via ${p.method}`,
        amount: p.amount,
        type: 'income',
        source: 'bank_account',
        saleId: newSale.id,
        adjustmentId: null
      });

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
    } else if (p.method === 'cash') {
        newFinancialEntries.push({
           description: `Venda #${newSale.id.slice(-6)} em dinheiro`,
           amount: p.amount,
           type: 'income',
           source: 'daily_cash',
           saleId: newSale.id,
           adjustmentId: null,
        });
    }
  });

  if (newFinancialEntries.length > 0) {
    addFinancialEntry(newFinancialEntries);
  }
};

export const removeSale = (saleId: string) => {
  const currentSales = getSales();
  const updatedSales = currentSales.filter(s => s.id !== saleId);
  saveSales(updatedSales);
  
  removeFinancialEntry(undefined, saleId);
}

export const addFinancialEntry = (entry: Omit<FinancialEntry, 'id' | 'timestamp'> | Omit<FinancialEntry, 'id' | 'timestamp'>[]) => {
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

export const removeFinancialEntry = (entryId?: string | null, saleId?: string | null) => {
  if (!entryId && !saleId) return;

  const currentEntries = getFinancialEntries();
  
  const entriesToKeep = currentEntries.filter(e => {
      if (entryId) return e.id !== entryId;
      if (saleId) return e.saleId !== saleId;
      return true;
  });

  saveFinancialEntries(entriesToKeep);
}


// --- UI Helpers ---

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Wallet, Users
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

// Dummy function to satisfy type checker, will not be used in local mode
export function getFromSupabase() {
  return Promise.resolve({ data: [], error: null });
}

  