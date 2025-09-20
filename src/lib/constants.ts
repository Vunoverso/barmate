
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, CashAdjustment, OrderItem } from '@/types';
import { Beer, Wine, Martini, Coffee, UtensilsCrossed, CakeSlice, CircleDollarSign, CreditCard, QrCode, Package, Banknote, type LucideIcon, Wallet } from 'lucide-react';
import { getFirestore, collection, doc, getDocs, setDoc, writeBatch, deleteDoc, getDoc } from "firebase/firestore";
import { db } from './firebase';


// In-memory cache to reduce Firestore reads and improve performance
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

const PRODUCT_CATEGORIES_COLLECTION = 'productCategories';

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  if (productCategoriesCache) return productCategoriesCache;

  try {
    const querySnapshot = await getDocs(collection(db, PRODUCT_CATEGORIES_COLLECTION));
    if (querySnapshot.empty) {
      // First time setup: Populate Firestore with initial data
      const batch = writeBatch(db);
      INITIAL_PRODUCT_CATEGORIES.forEach(category => {
        const docRef = doc(db, PRODUCT_CATEGORIES_COLLECTION, category.id);
        batch.set(docRef, category);
      });
      await batch.commit();
      productCategoriesCache = INITIAL_PRODUCT_CATEGORIES;
      return INITIAL_PRODUCT_CATEGORIES;
    }
    const categories = querySnapshot.docs.map(doc => doc.data() as ProductCategory);
    productCategoriesCache = categories;
    return categories;
  } catch (error) {
    console.error("Error fetching product categories from Firestore:", error);
    return INITIAL_PRODUCT_CATEGORIES; // Fallback
  }
};

export const saveProductCategories = async (categories: ProductCategory[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    categories.forEach(category => {
      const docRef = doc(db, PRODUCT_CATEGORIES_COLLECTION, category.id);
      batch.set(docRef, category);
    });
    await batch.commit();
    productCategoriesCache = categories;
  } catch (error) {
    console.error("Error saving product categories to Firestore:", error);
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

export const PRODUCTS_COLLECTION = 'products';

export const getProducts = async (): Promise<Product[]> => {
  if (productsCache) return productsCache;

  try {
    const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
     if (querySnapshot.empty) {
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach(p => {
        const docRef = doc(db, PRODUCTS_COLLECTION, p.id);
        batch.set(docRef, p);
      });
      await batch.commit();
      productsCache = INITIAL_PRODUCTS;
      return INITIAL_PRODUCTS;
    }
    const products = querySnapshot.docs.map(doc => doc.data() as Product);
    productsCache = products;
    return products;
  } catch (error) {
    console.error("Error fetching products from Firestore:", error);
    return [];
  }
};

export const saveProducts = async (products: Product[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    products.forEach(p => {
      const docRef = doc(db, PRODUCTS_COLLECTION, p.id);
      batch.set(docRef, p);
    });
    // To handle deletions, we need to compare with the cached state
    const initialIds = (await getProducts()).map(p => p.id);
    const newIds = products.map(p => p.id);
    const idsToDelete = initialIds.filter(id => !newIds.includes(id));
    idsToDelete.forEach(id => {
        const docRef = doc(db, PRODUCTS_COLLECTION, id);
        batch.delete(docRef);
    });

    await batch.commit();
    productsCache = products;
  } catch (error) {
    console.error("Error saving products to Firestore:", error);
  }
};

export const PAYMENT_METHODS: { name: string; value: PaymentMethod; icon: LucideIcon }[] = [
  { name: 'Dinheiro', value: 'cash', icon: Banknote },
  { name: 'Débito', value: 'debit', icon: CreditCard },
  { name: 'Crédito', value: 'credit', icon: CreditCard },
  { name: 'PIX', value: 'pix', icon: QrCode },
];


export const SALES_COLLECTION = 'sales';

export const saveSales = async (sales: Sale[]): Promise<void> => {
   try {
    const batch = writeBatch(db);
    sales.forEach(s => {
      const docRef = doc(db, SALES_COLLECTION, s.id);
      // Convert Date objects to Timestamps for Firestore
      batch.set(docRef, { ...s, timestamp: s.timestamp });
    });
    await batch.commit();
    salesCache = sales;
  } catch (error) {
    console.error("Error saving sales to Firestore:", error);
  }
};

export const getSales = async (): Promise<Sale[]> => {
  if (salesCache) return salesCache;
  try {
    const querySnapshot = await getDocs(collection(db, SALES_COLLECTION));
    const sales = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to JS Date object
        return { ...data, timestamp: (data.timestamp as any).toDate() } as Sale;
    });
    salesCache = sales;
    return sales;
  } catch (error) {
    console.error("Error fetching sales from Firestore:", error);
    return [];
  }
};

export const addFinancialEntry = async (entry: Omit<FinancialEntry, 'id' | 'timestamp'>): Promise<void> => {
  const newEntry: FinancialEntry = {
    ...entry,
    id: `${entry.type.slice(0,3)}-${Date.now()}`,
    timestamp: new Date(),
  };

  try {
    await setDoc(doc(db, FINANCIAL_ENTRIES_COLLECTION, newEntry.id), { ...newEntry, timestamp: newEntry.timestamp });
    financialEntriesCache = null; // Invalidate cache

    // Handle side-effects on balances
    if (entry.type === 'income') {
      if (entry.source === 'daily_cash') {
        const currentCashStatus = await getCashRegisterStatus();
        if (currentCashStatus.status === 'open') {
          const suprimentoAdjustment: CashAdjustment = {
            id: `adj-inc-${newEntry.id}`,
            amount: entry.amount,
            type: 'in' as 'in',
            description: entry.description,
            timestamp: new Date().toISOString()
          };
          const updatedStatus = { ...currentCashStatus, adjustments: [...(currentCashStatus.adjustments || []), suprimentoAdjustment]};
          await saveCashRegisterStatus(updatedStatus);
        }
      } else if (entry.source === 'bank_account') {
        const currentAccount = await getBankAccount();
        await saveBankAccount({ balance: currentAccount.balance + entry.amount });
      } else if (entry.source === 'secondary_cash') {
          const currentSecondaryBox = await getSecondaryCashBox();
          await saveSecondaryCashBox({ balance: currentSecondaryBox.balance + entry.amount });
      }
    }
  } catch(error) {
      console.error("Error adding financial entry:", error);
  }
};


export const addSale = async (newSale: Sale): Promise<void> => {
  try {
    const saleRef = doc(db, SALES_COLLECTION, newSale.id);
    
    let bankAccount = await getBankAccount();
    const newFinancialEntries: FinancialEntry[] = [];
    const transactionFees = await getTransactionFees();

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

    const batch = writeBatch(db);
    batch.set(saleRef, { ...newSale, timestamp: newSale.timestamp });
    
    newFinancialEntries.forEach(entry => {
        const entryRef = doc(db, FINANCIAL_ENTRIES_COLLECTION, entry.id);
        batch.set(entryRef, { ...entry, timestamp: entry.timestamp });
    });

    await saveBankAccount(bankAccount, batch);
    await batch.commit();

    salesCache = null; // Invalidate cache
    financialEntriesCache = null;

  } catch(error) {
      console.error("Error adding sale:", error);
  }
};


export const removeSale = async (saleId: string): Promise<void> => {
  const saleDocRef = doc(db, SALES_COLLECTION, saleId);
  
  try {
    const saleSnapshot = await getDoc(saleDocRef);
    if (!saleSnapshot.exists()) return;
    const saleToDelete = { ...saleSnapshot.data(), timestamp: (saleSnapshot.data().timestamp as any).toDate() } as Sale;

    const currentAccount = await getBankAccount();
    const querySnapshot = await getDocs(collection(db, FINANCIAL_ENTRIES_COLLECTION));
    const allEntries = querySnapshot.docs.map(doc => doc.data() as FinancialEntry);
    
    let balanceReversal = 0;

    saleToDelete.payments.forEach(payment => {
        if (payment.method !== 'cash') {
            const feeEntry = allEntries.find(e => e.saleId === saleId && e.description.toLowerCase().includes(payment.method));
            const feeAmount = feeEntry ? feeEntry.amount : 0;
            balanceReversal += (payment.amount - feeAmount);
        }
    });

    const batch = writeBatch(db);
    
    // Update bank account
    if (balanceReversal !== 0) {
        await saveBankAccount({ balance: currentAccount.balance - balanceReversal }, batch);
    }
    
    // Delete the sale
    batch.delete(saleDocRef);
    
    // Delete associated financial entries
    const entriesToDelete = allEntries.filter(e => e.saleId === saleId);
    entriesToDelete.forEach(entry => {
        const entryRef = doc(db, FINANCIAL_ENTRIES_COLLECTION, entry.id);
        batch.delete(entryRef);
    });

    await batch.commit();

    salesCache = null; // Invalidate cache
    financialEntriesCache = null;

  } catch (error) {
      console.error("Error removing sale:", error);
  }
};


export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};


export const FINANCIAL_ENTRIES_COLLECTION = 'financialEntries';

export const saveFinancialEntries = async (entries: FinancialEntry[]): Promise<void> => {
   try {
    const batch = writeBatch(db);
    entries.forEach(entry => {
      const docRef = doc(db, FINANCIAL_ENTRIES_COLLECTION, entry.id);
      batch.set(docRef, { ...entry, timestamp: entry.timestamp });
    });
    await batch.commit();
    financialEntriesCache = entries;
  } catch (error) {
    console.error("Error saving financial entries to Firestore:", error);
  }
};

export const getFinancialEntries = async (): Promise<FinancialEntry[]> => {
  if (financialEntriesCache) return financialEntriesCache;

  try {
    const querySnapshot = await getDocs(collection(db, FINANCIAL_ENTRIES_COLLECTION));
    const entries = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, timestamp: (data.timestamp as any).toDate() } as FinancialEntry;
    });
    financialEntriesCache = entries;
    return entries;
  } catch (error) {
    console.error("Error fetching financial entries from Firestore:", error);
    return [];
  }
};

// --- Singleton documents ---
const SINGLETON_DOCS_COLLECTION = 'singletons';

const getSingletonDoc = async <T>(docId: string, defaultValue: T): Promise<T> => {
    try {
        const docRef = doc(db, SINGLETON_DOCS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as T;
        } else {
            await setDoc(docRef, defaultValue);
            return defaultValue;
        }
    } catch(error) {
        console.error(`Error fetching singleton doc ${docId}:`, error);
        return defaultValue;
    }
}

const saveSingletonDoc = async <T>(docId: string, data: T, batch?: any): Promise<void> => {
    const docRef = doc(db, SINGLETON_DOCS_COLLECTION, docId);
    if (batch) {
        batch.set(docRef, data);
    } else {
       await setDoc(docRef, data);
    }
}


// --- Caixa 02 ---
const SECONDARY_CASH_BOX_ID = 'secondaryCashBox';
export const getSecondaryCashBox = async (): Promise<SecondaryCashBox> => {
  if (secondaryCashBoxCache) return secondaryCashBoxCache;
  const box = await getSingletonDoc<SecondaryCashBox>(SECONDARY_CASH_BOX_ID, { balance: 0 });
  secondaryCashBoxCache = box;
  return box;
};

export const saveSecondaryCashBox = async (box: SecondaryCashBox, batch?: any): Promise<void> => {
  await saveSingletonDoc(SECONDARY_CASH_BOX_ID, box, batch);
  secondaryCashBoxCache = box;
};

// --- Conta Bancária ---
const BANK_ACCOUNT_ID = 'bankAccount';
export const getBankAccount = async (): Promise<BankAccount> => {
  if (bankAccountCache) return bankAccountCache;
  const account = await getSingletonDoc<BankAccount>(BANK_ACCOUNT_ID, { balance: 0 });
  bankAccountCache = account;
  return account;
};

export const saveBankAccount = async (account: BankAccount, batch?: any): Promise<void> => {
  await saveSingletonDoc(BANK_ACCOUNT_ID, account, batch);
  bankAccountCache = account;
};

// --- Status do Caixa Diário ---
const CASH_REGISTER_STATUS_ID = 'cashRegisterStatus';
export const getCashRegisterStatus = async (): Promise<CashRegisterStatus> => {
    if (cashRegisterStatusCache) return cashRegisterStatusCache;
    const status = await getSingletonDoc<CashRegisterStatus>(CASH_REGISTER_STATUS_ID, { status: 'closed', adjustments: [] });
    cashRegisterStatusCache = status;
    return status;
}

export const saveCashRegisterStatus = async (status: CashRegisterStatus, batch?:any): Promise<void> => {
    await saveSingletonDoc(CASH_REGISTER_STATUS_ID, status, batch);
    cashRegisterStatusCache = status;
}

// --- Transaction Fees ---
const TRANSACTION_FEES_ID = 'transactionFees';
export const getTransactionFees = async (): Promise<TransactionFees> => {
    if (transactionFeesCache) return transactionFeesCache;
    const fees = await getSingletonDoc<TransactionFees>(TRANSACTION_FEES_ID, { debitRate: 2, creditRate: 4, pixRate: 1 });
    transactionFeesCache = fees;
    return fees;
};

export const saveTransactionFees = async (fees: TransactionFees, batch?:any): Promise<void> => {
    await saveSingletonDoc(TRANSACTION_FEES_ID, fees, batch);
    transactionFeesCache = fees;
};

    