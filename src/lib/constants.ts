
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, Package, Banknote, CreditCard, QrCode, Wallet, type LucideIcon } from 'lucide-react';

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
    return defaultValue;
  }
};


// --- DATA KEYS ---
export const DATA_KEYS = [
    'barmate_productCategories_v2',
    'barmate_products_v2',
    'barmate_sales_v2',
    'barmate_openOrders_v2',
    'barmate_financialEntries_v2',
    'barmate_cashRegisterStatus_v2',
    'barmate_secondaryCashBox_v2',
    'barmate_bankAccount_v2',
    'barmate_transactionFees_v2',
    'barmate_counterSaleOrderItems_v2',
    'barName'
];
const KEY_PRODUCT_CATEGORIES = 'barmate_productCategories_v2';
const KEY_PRODUCTS = 'barmate_products_v2';
const KEY_SALES = 'barmate_sales_v2';
const KEY_OPEN_ORDERS = 'barmate_openOrders_v2';
const KEY_FINANCIAL_ENTRIES = 'barmate_financialEntries_v2';
const KEY_CASH_REGISTER_STATUS = 'barmate_cashRegisterStatus_v2';
const KEY_SECONDARY_CASH_BOX = 'barmate_secondaryCashBox_v2';
const KEY_BANK_ACCOUNT = 'barmate_bankAccount_v2';
const KEY_TRANSACTION_FEES = 'barmate_transactionFees_v2';
const KEY_COUNTER_SALE_ITEMS = 'barmate_counterSaleOrderItems_v2';


// --- INITIAL DATA (CLEAN STATE) ---
export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_OPEN_ORDERS: ActiveOrder[] = [];
export const INITIAL_FINANCIAL_ENTRIES: FinancialEntry[] = [];
export const INITIAL_CASH_REGISTER_STATUS: CashRegisterStatus = { status: 'closed', adjustments: [] };
export const INITIAL_SECONDARY_CASH_BOX: SecondaryCashBox = { balance: 0 };
export const INITIAL_BANK_ACCOUNT: BankAccount = { balance: 0 };
export const INITIAL_TRANSACTION_FEES: TransactionFees = { debitRate: 0, creditRate: 0, pixRate: 0 };

// --- Data Migration ---
const MIGRATION_FLAG_KEY = 'barmate_migration_v2_completed';

export const migrateOldData = () => {
    if (typeof window === 'undefined') {
        return;
    }

    if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
        return;
    }

    console.log("Checking for old data to migrate...");

    const migrateKey = (oldKey: string, newKey: string) => {
        const oldData = localStorage.getItem(oldKey);
        if (oldData) {
            try {
                localStorage.setItem(newKey, oldData);
                console.log(`Successfully migrated: ${oldKey} -> ${newKey}`);
                localStorage.removeItem(oldKey); 
            } catch (e) {
                console.error(`Failed to migrate ${oldKey}:`, e);
            }
        }
    };
    
    const oldKeys = [
        'barmate_productCategories',
        'barmate_products',
        'barmate_sales',
        'barmate_openOrders',
        'barmate_financialEntries',
        'barmate_cashRegisterStatus',
        'barmate_secondaryCashBox',
        'barmate_bankAccount',
        'barmate_transactionFees',
        'barmate_counterSaleOrderItems'
    ];
    
    const newKeys = [
        KEY_PRODUCT_CATEGORIES,
        KEY_PRODUCTS,
        KEY_SALES,
        KEY_OPEN_ORDERS,
        KEY_FINANCIAL_ENTRIES,
        KEY_CASH_REGISTER_STATUS,
        KEY_SECONDARY_CASH_BOX,
        KEY_BANK_ACCOUNT,
        KEY_TRANSACTION_FEES,
        KEY_COUNTER_SALE_ITEMS
    ];

    for (let i = 0; i < oldKeys.length; i++) {
        migrateKey(oldKeys[i], newKeys[i]);
    }
    
    const barName = localStorage.getItem('barName');
    if (barName) {
        console.log("Bar name preserved.");
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    console.log("Data migration check completed.");
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

export const getFinancialEntries = (): FinancialEntry[] => getFromLocalStorage(KEY_FINANCIAL_ENTRIES, INITIAL_FINANCIAL_ENTRIES);
export const saveFinancialEntries = (entries: FinancialEntry[]) => saveToLocalStorage(KEY_FINANCIAL_ENTRIES, entries);

export const getCashRegisterStatus = (): CashRegisterStatus => getFromLocalStorage(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
export const saveCashRegisterStatus = (status: CashRegisterStatus, options?: { silent?: boolean }) => saveToLocalStorage(KEY_CASH_REGISTER_STATUS, status, options);

export const getSecondaryCashBox = (): SecondaryCashBox => getFromLocalStorage(KEY_SECONDARY_CASH_BOX, INITIAL_SECONDARY_CASH_BOX);
export const saveSecondaryCashBox = (box: SecondaryCashBox, options?: { silent?: boolean }) => saveToLocalStorage(KEY_SECONDARY_CASH_BOX, box, options);

export const getBankAccount = (): BankAccount => getFromLocalStorage(KEY_BANK_ACCOUNT, INITIAL_BANK_ACCOUNT);
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

  newSale.payments.forEach(p => {
    const isBankTransaction = ['debit', 'credit', 'pix'].includes(p.method);

    if (isBankTransaction) {
      // Add the income from the sale to the bank account
      newFinancialEntries.push({
        description: `Venda #${newSale.id.slice(-6)} via ${p.method}`,
        amount: p.amount,
        type: 'income',
        source: 'bank_account',
        saleId: newSale.id,
        adjustmentId: null
      });

      // Add the transaction fee as an expense from the bank account
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
    }
  });

  if (newFinancialEntries.length > 0) {
    addFinancialEntry(newFinancialEntries);
  }
};

export const removeSale = (saleId: string) => {
  const currentSales = getSales();
  const saleToRemove = currentSales.find(s => s.id === saleId);
  if (!saleToRemove) return;

  const updatedSales = currentSales.filter(s => s.id !== saleId);
  saveSales(updatedSales);

  const currentFinancials = getFinancialEntries();
  const entriesFromThisSale = currentFinancials.filter(e => e.saleId === saleId);
  const otherEntries = currentFinancials.filter(e => e.saleId !== saleId);

  // Revert balance changes from this sale
  let currentBank = getBankAccount();
  let bankBalanceChanged = false;
  
  entriesFromThisSale.forEach(entry => {
    if (entry.source === 'bank_account') {
        currentBank.balance = entry.type === 'income' 
            ? currentBank.balance - entry.amount 
            : currentBank.balance + entry.amount;
        bankBalanceChanged = true;
    }
  });

  if (bankBalanceChanged) {
      saveBankAccount(currentBank);
  }

  saveFinancialEntries(otherEntries);
}

export const addFinancialEntry = (entry: Omit<FinancialEntry, 'id' | 'timestamp'> | Omit<FinancialEntry, 'id' | 'timestamp'>[]) => {
    const currentEntries = getFinancialEntries();
    const entriesToAdd = Array.isArray(entry) ? entry : [entry];

    const newEntries: FinancialEntry[] = entriesToAdd.map(e => ({
        ...e,
        id: `fin-${Date.now()}-${Math.random()}`,
        timestamp: new Date()
    }));

    // Update balances based on the new entries
    let currentBank = getBankAccount();
    let bankBalanceChanged = false;

    newEntries.forEach(e => {
        if (e.source === 'bank_account') {
            currentBank.balance = e.type === 'income' 
                ? currentBank.balance + e.amount 
                : currentBank.balance - e.amount;
            bankBalanceChanged = true;
        }
    });

    if(bankBalanceChanged){
        saveBankAccount(currentBank);
    }
    
    saveFinancialEntries([...currentEntries, ...newEntries]);
};

export const removeFinancialEntry = (entryId: string) => {
  const currentEntries = getFinancialEntries();
  const entryToRemove = currentEntries.find(e => e.id === entryId);
  if (!entryToRemove) return;

  const updatedEntries = currentEntries.filter(e => e.id !== entryId);
  saveFinancialEntries(updatedEntries);

  // Revert balance changes upon deletion
  if (entryToRemove.source === 'bank_account') {
    const currentAccount = getBankAccount();
    const newBalance = entryToRemove.type === 'income'
        ? currentAccount.balance - entryToRemove.amount // Revert income by subtracting
        : currentAccount.balance + entryToRemove.amount; // Revert expense by adding
    saveBankAccount({ balance: newBalance });
  } else if (entryToRemove.source === 'secondary_cash' && entryToRemove.type === 'expense') {
     const currentBox = getSecondaryCashBox();
     saveSecondaryCashBox({ balance: currentBox.balance + entryToRemove.amount });
  } else if (entryToRemove.source === 'daily_cash' && entryToRemove.type === 'expense') {
    const cashStatus = getCashRegisterStatus();
    if(cashStatus.status === 'open') {
        const adjustment: CashAdjustment = {
            id: `adj-revert-${Date.now()}`,
            amount: entryToRemove.amount,
            type: 'in', // Revert an expense by adding money back
            description: `Estorno despesa: ${entryToRemove.description}`,
            timestamp: new Date().toISOString(),
            isCorrection: true, // Mark as a system correction
        };
        saveCashRegisterStatus({...cashStatus, adjustments: [...(cashStatus.adjustments || []), adjustment]});
    }
  }
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

// Dummy function to satisfy type checker, will not be used in local mode
export function getFromSupabase() {
  return Promise.resolve({ data: [], error: null });
}
