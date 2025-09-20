
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, CashAdjustment, OrderItem } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';

// In-memory cache to reduce localStorage reads and improve performance
let productCategoriesCache: ProductCategory[] | null = null;
let productsCache: Product[] | null = null;
let salesCache: Sale[] | null = null;
let financialEntriesCache: FinancialEntry[] | null = null;
let secondaryCashBoxCache: SecondaryCashBox | null = null;
let bankAccountCache: BankAccount | null = null;
let cashRegisterStatusCache: CashRegisterStatus | null = null;
let transactionFeesCache: TransactionFees | null = null;


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
    window.dispatchEvent(new Event('storage'));
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
    window.dispatchEvent(new Event('storage'));
  }
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Débito', value: 'debit', icon: CreditCard },
  { name: 'Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];

// SIMULATION DATA
const saleTotal1 = INITIAL_PRODUCTS[8].price + INITIAL_PRODUCTS[3].price; // X-Burger + Refri = 28 + 7 = 35
const saleTotal2 = INITIAL_PRODUCTS[1].price + INITIAL_PRODUCTS[2].price; // Vinho + Caipirinha = 25 + 18 = 43
const saleTotal3 = (INITIAL_PRODUCTS[0].price * 2) + INITIAL_PRODUCTS[9].price; // 2 Cervejas + Fritas = 24 + 22 = 46

const SIMULATION_SALES: Sale[] = [
  // 1. Venda Balcão (dinheiro)
  {
    id: 'sim-sale-1',
    items: [
      { ...INITIAL_PRODUCTS.find(p=>p.id==='9')!, quantity: 1 }, 
      { ...INITIAL_PRODUCTS.find(p=>p.id==='4')!, quantity: 1 }, 
    ] as OrderItem[],
    originalAmount: 35,
    discountAmount: 1, // Desconto de 1 real
    totalAmount: 34,
    payments: [{ method: 'cash', amount: 34 }],
    cashTendered: 40,
    changeGiven: 6,
    timestamp: new Date(),
    status: 'completed',
  },
  // 2. Venda Comanda (multi-pagamento)
  {
    id: 'sim-sale-2',
    items: [
      { ...INITIAL_PRODUCTS.find(p=>p.id==='1')!, quantity: 5 }, // 5 Cervejas
      { ...INITIAL_PRODUCTS.find(p=>p.id==='10')!, quantity: 1 }, // Pastel
      { ...INITIAL_PRODUCTS.find(p=>p.id==='2')!, quantity: 1 }, // Caipirinha
      { ...INITIAL_PRODUCTS.find(p=>p.id==='4')!, quantity: 1 }, // Suco
    ] as OrderItem[],
    originalAmount: (12*5) + 8 + 18 + 10, // 60 + 8 + 18 + 10 = 96
    discountAmount: 0,
    totalAmount: 96,
    payments: [
        { method: 'pix', amount: 46 },
        { method: 'debit', amount: 50 }
    ],
    timestamp: new Date(),
    status: 'completed',
  },
    // 3. Venda com taxa de cartão
  {
    id: 'sim-sale-3',
    items: [
        { ...INITIAL_PRODUCTS.find(p => p.id === '1')!, quantity: 2 }, // 2 Cervejas = 24
        { ...INITIAL_PRODUCTS.find(p => p.id === '9')!, quantity: 1 }  // 1 X-Burger = 28
    ] as OrderItem[],
    originalAmount: 52,
    discountAmount: 0,
    totalAmount: 52,
    payments: [{ method: 'credit', amount: 52 }],
    timestamp: new Date(),
    status: 'completed',
  },
];


export const SALES_STORAGE_KEY = 'barmate_sales';

export const saveSales = (sales: Sale[]): void => {
  if (typeof window === 'undefined') return;
  salesCache = sales;
  localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
  window.dispatchEvent(new Event('storage'));
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
      const parsedSales = JSON.parse(storedSales);
       // Migration for old sales structure
      const migratedSales = parsedSales.map((s: any) => {
        if (s.paymentMethod && !s.payments) {
          s.payments = [{ method: s.paymentMethod, amount: s.totalAmount }];
          if (s.paymentMethod === 'cash') {
            s.cashTendered = s.amountPaid;
          }
          delete s.paymentMethod;
          if (s.amountPaid) delete s.amountPaid;
        }
        return {
          ...s,
          timestamp: new Date(s.timestamp)
        }
      });
      salesCache = migratedSales;
      // Resave with migrated structure if changes were made
      if (JSON.stringify(parsedSales) !== JSON.stringify(migratedSales)) {
          saveSales(salesCache);
      }
      return salesCache;
    } catch (e) {
      console.error("Failed to parse sales from localStorage", e);
      localStorage.removeItem(SALES_STORAGE_KEY);
      salesCache = [];
      return salesCache;
    }
  }
  // Seed with initial data only if nothing is in storage
  const initialSalesWithDate = SIMULATION_SALES.map(s => ({...s, timestamp: new Date(s.timestamp)}));
  saveSales(initialSalesWithDate);
  return initialSalesWithDate;
};

export const addFinancialEntry = (entry: Omit<FinancialEntry, 'id' | 'timestamp'>): void => {
  if (typeof window === 'undefined') return;
  
  const newEntry: FinancialEntry = {
    ...entry,
    id: `${entry.type.slice(0,3)}-${Date.now()}`,
    timestamp: new Date(),
  };

  const currentEntries = getFinancialEntries();
  saveFinancialEntries([...currentEntries, newEntry]);

  // Handle side-effects on balances
  if (entry.type === 'income') {
    if (entry.source === 'daily_cash') {
      const currentCashStatus = getCashRegisterStatus();
      if (currentCashStatus.status === 'open') {
        const suprimentoAdjustment: CashAdjustment = {
          id: `adj-inc-${newEntry.id}`,
          amount: entry.amount,
          type: 'in' as 'in',
          description: entry.description,
          timestamp: new Date().toISOString()
        };
        const updatedStatus = { ...currentCashStatus, adjustments: [...(currentCashStatus.adjustments || []), suprimentoAdjustment]};
        saveCashRegisterStatus(updatedStatus);
      }
    } else if (entry.source === 'bank_account') {
      const currentAccount = getBankAccount();
      saveBankAccount({ balance: currentAccount.balance + entry.amount });
    } else if (entry.source === 'secondary_cash') {
        const currentSecondaryBox = getSecondaryCashBox();
        saveSecondaryCashBox({ balance: currentSecondaryBox.balance + entry.amount });
    }
  }
  // Note: 'expense' types are handled directly in the components where they are created,
  // because they need to check for sufficient funds before creating the entry.
};


export const addSale = (newSale: Sale): void => {
  if (typeof window === 'undefined') return;

  const currentSales = getSales();
  const updatedSales = [...currentSales, newSale];
  saveSales(updatedSales);

  let bankAccount = getBankAccount();
  const currentFinancialEntries = getFinancialEntries();
  const newFinancialEntries: FinancialEntry[] = [];
  const transactionFees = getTransactionFees();

  newSale.payments.forEach(p => {
    let feeAmount = 0;
    let feeRate = 0;
    
    if (p.method === 'credit') feeRate = transactionFees.creditRate;
    else if (p.method === 'debit') feeRate = transactionFees.debitRate;
    else if (p.method === 'pix') feeRate = transactionFees.pixRate;

    if (feeRate > 0) {
      feeAmount = p.amount * (feeRate / 100);
      bankAccount = { balance: bankAccount.balance + (p.amount - feeAmount) };
      newFinancialEntries.push({
        id: `fee-${newSale.id}-${p.method}`,
        description: `Taxa ${p.method.charAt(0).toUpperCase() + p.method.slice(1)} (Venda #${newSale.id.slice(-6)})`,
        amount: feeAmount,
        type: 'expense',
        source: 'bank_account',
        timestamp: new Date(),
        saleId: newSale.id,
      });
    } else if (p.method !== 'cash') {
       bankAccount = { balance: bankAccount.balance + p.amount };
    }
  });

  saveBankAccount(bankAccount);

  if (newSale.changeGiven && newSale.changeGiven > 0 && newSale.leaveChangeAsCredit) {
    // This logic seems reversed. If change is left as credit, it should be an income to a virtual "credit" account,
    // but for the cash drawer, it's as if the money stayed. The logic in the cash-register-client handles the
    // drawer calculation correctly. Here we just need to record the credit creation if needed.
    // The current implementation of creating a new order for credit is handled in orders-client.
  }


  if (newFinancialEntries.length > 0) {
    saveFinancialEntries([...currentFinancialEntries, ...newFinancialEntries]);
  }
};


export const removeSale = (saleId: string): void => {
  if (typeof window === 'undefined') return;

  const allSales = getSales();
  const saleToDelete = allSales.find(s => s.id === saleId);
  if (!saleToDelete) return;

  // Load current states
  const currentAccount = getBankAccount();
  const currentEntries = getFinancialEntries();
  
  // Revert financial impact
  saleToDelete.payments.forEach(payment => {
    if (payment.method !== 'cash') {
      // Revert from Bank Account
      const feeEntry = currentEntries.find(e => e.saleId === saleId && e.description.toLowerCase().includes(payment.method));
      const feeAmount = feeEntry ? feeEntry.amount : 0;
      const netAmountToReverse = payment.amount - feeAmount;
      currentAccount.balance -= netAmountToReverse;
    }
  });
  
  // Save updated bank account
  saveBankAccount(currentAccount);
  
  // Remove the sale itself, which will cause the cash drawer balance to be recalculated correctly.
  const updatedSales = allSales.filter(s => s.id !== saleId);
  saveSales(updatedSales);
  
  // Remove associated financial entries (like fees and credit income entries)
  const updatedEntries = currentEntries.filter(e => e.saleId !== saleId);
  saveFinancialEntries(updatedEntries);
};


export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};


export const FINANCIAL_ENTRIES_STORAGE_KEY = 'barmate_financialEntries';

const SIMULATION_FINANCIAL_ENTRIES: FinancialEntry[] = [
    // Taxa da Venda 3 (crédito)
    {
        id: `fee-sim-sale-3-credit`,
        description: `Taxa Crédito (Venda #m-sale)`,
        amount: 52 * 0.04, // 4%
        type: 'expense',
        source: 'bank_account',
        timestamp: new Date(),
        saleId: 'sim-sale-3',
    },
    // Despesa
    {
        id: 'sim-exp-1',
        description: 'Compra de gelo',
        amount: 35,
        type: 'expense',
        source: 'daily_cash',
        timestamp: new Date(),
        adjustmentId: 'adj-exp-sim-exp-1',
    }
];

export const saveFinancialEntries = (entries: FinancialEntry[]): void => {
  if (typeof window === 'undefined') return;
  financialEntriesCache = entries;
  localStorage.setItem(FINANCIAL_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event('storage'));
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
  financialEntriesCache = SIMULATION_FINANCIAL_ENTRIES.map(e => ({...e, timestamp: new Date(e.timestamp)}));
  saveFinancialEntries(financialEntriesCache);
  return financialEntriesCache;
};

// --- Caixa 02 ---
export const SECONDARY_CASH_BOX_KEY = 'barmate_secondaryCashBox';
const SIMULATION_SECONDARY_CASH_BOX: SecondaryCashBox = { balance: 2000 - 100 + 150 - 200 }; // 1850

export const getSecondaryCashBox = (): SecondaryCashBox => {
  if (typeof window === 'undefined') {
    return { balance: 0 };
  }
  if (secondaryCashBoxCache !== null) {
    return secondaryCashBoxCache;
  }
  const stored = localStorage.getItem(SECONDARY_CASH_BOX_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed.balance === 'number') {
        secondaryCashBoxCache = parsed;
        return secondaryCashBoxCache;
      }
    } catch (e) {
      console.error("Failed to parse secondary cash box from localStorage", e);
      localStorage.removeItem(SECONDARY_CASH_BOX_KEY);
    }
  }

  secondaryCashBoxCache = SIMULATION_SECONDARY_CASH_BOX;
  localStorage.setItem(SECONDARY_CASH_BOX_KEY, JSON.stringify(secondaryCashBoxCache));
  return secondaryCashBoxCache;
};

export const saveSecondaryCashBox = (box: SecondaryCashBox): void => {
  if (typeof window !== 'undefined') {
    secondaryCashBoxCache = box;
    localStorage.setItem(SECONDARY_CASH_BOX_KEY, JSON.stringify(box));
    window.dispatchEvent(new Event('storage'));
  }
};

// --- Conta Bancária ---
export const BANK_ACCOUNT_KEY = 'barmate_bankAccount';
// 1000 (inicial) + 46 (pix) + 50 (debito) + 52 (credito) - 2.08 (taxa) + 200 (transferencia)
const SIMULATION_BANK_ACCOUNT: BankAccount = { balance: 1000 + 46 + 50 + (52 - (52*0.04)) + 200 }; 

export const getBankAccount = (): BankAccount => {
  if (typeof window === 'undefined') return { balance: 0 };
  if (bankAccountCache !== null) return bankAccountCache;

  const stored = localStorage.getItem(BANK_ACCOUNT_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed.balance === 'number') {
        bankAccountCache = parsed;
        return bankAccountCache;
      }
    } catch (e) {
      console.error("Failed to parse bank account from localStorage", e);
      localStorage.removeItem(BANK_ACCOUNT_KEY);
    }
  }
  
  bankAccountCache = SIMULATION_BANK_ACCOUNT;
  localStorage.setItem(BANK_ACCOUNT_KEY, JSON.stringify(bankAccountCache));
  return bankAccountCache;
};

export const saveBankAccount = (account: BankAccount): void => {
  if (typeof window !== 'undefined') {
    bankAccountCache = account;
    localStorage.setItem(BANK_ACCOUNT_KEY, JSON.stringify(account));
    window.dispatchEvent(new Event('storage'));
  }
};

// --- Status do Caixa Diário ---
const CASH_REGISTER_STATUS_KEY = 'barmate_cashRegisterStatus';

const SIMULATION_CASH_STATUS: CashRegisterStatus = {
    status: 'open',
    openingBalance: 100,
    openingTime: new Date().toISOString(),
    adjustments: [
        // 1. Suprimento
        { id: 'sim-adj-1', amount: 50, type: 'in', description: 'Reforço de troco', timestamp: new Date().toISOString() },
        // 2. Sangria
        { id: 'sim-adj-2', amount: 150, type: 'out', description: 'Retirada para Caixa 02', destination: 'secondary_cash', timestamp: new Date().toISOString() },
        // 3. Despesa (gerada a partir da financial entry)
        { id: 'adj-exp-sim-exp-1', amount: 35, type: 'out', description: 'Despesa: Compra de gelo', timestamp: new Date().toISOString() }
    ],
};

export const getCashRegisterStatus = (): CashRegisterStatus => {
  if (typeof window === 'undefined') return { status: 'closed', adjustments: [] };
  if (cashRegisterStatusCache !== null) return cashRegisterStatusCache;
  
  const storedStatus = localStorage.getItem(CASH_REGISTER_STATUS_KEY);
  if (storedStatus) {
    try {
      const parsedStatus = JSON.parse(storedStatus);
      cashRegisterStatusCache = { adjustments: [], ...parsedStatus };
      return cashRegisterStatusCache;
    } catch (e) {
      cashRegisterStatusCache = { status: 'closed', adjustments: [] };
      return cashRegisterStatusCache;
    }
  }

  cashRegisterStatusCache = SIMULATION_CASH_STATUS;
  saveCashRegisterStatus(cashRegisterStatusCache);
  return cashRegisterStatusCache;
}

export const saveCashRegisterStatus = (status: CashRegisterStatus): void => {
  if (typeof window !== 'undefined') {
    cashRegisterStatusCache = status;
    localStorage.setItem(CASH_REGISTER_STATUS_KEY, JSON.stringify(status));
    window.dispatchEvent(new Event('storage'));
  }
}

// --- Transaction Fees ---
export const TRANSACTION_FEES_KEY = 'barmate_transactionFees';
const SIMULATION_TRANSACTION_FEES: TransactionFees = { debitRate: 2, creditRate: 4, pixRate: 1 };

export const getTransactionFees = (): TransactionFees => {
    if (typeof window === 'undefined') {
        return { debitRate: 0, creditRate: 0, pixRate: 0 };
    }
    if (transactionFeesCache !== null) {
        return transactionFeesCache;
    }
    const stored = localStorage.getItem(TRANSACTION_FEES_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (typeof parsed.debitRate === 'number' && typeof parsed.creditRate === 'number') {
                if (typeof parsed.pixRate !== 'number') {
                  parsed.pixRate = 0;
                }
                transactionFeesCache = parsed;
                return transactionFeesCache;
            }
        } catch (e) {
            console.error("Failed to parse transaction fees from localStorage", e);
            localStorage.removeItem(TRANSACTION_FEES_KEY);
        }
    }

    transactionFeesCache = SIMULATION_TRANSACTION_FEES;
    localStorage.setItem(TRANSACTION_FEES_KEY, JSON.stringify(transactionFeesCache));
    return transactionFeesCache;
};

export const saveTransactionFees = (fees: TransactionFees): void => {
    if (typeof window !== 'undefined') {
        transactionFeesCache = fees;
        localStorage.setItem(TRANSACTION_FEES_KEY, JSON.stringify(fees));
        window.dispatchEvent(new Event('storage'));
    }
};




    