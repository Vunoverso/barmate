
import type { 
  Product, 
  Sale, 
  ProductCategory, 
  FinancialEntry, 
  CashRegisterStatus, 
  TransactionFees, 
  ActiveOrder, 
  Client
} from '@/types';
import { db } from './firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
    INITIAL_PRODUCT_CATEGORIES,
    INITIAL_PRODUCTS,
    INITIAL_SALES,
    INITIAL_OPEN_ORDERS,
    INITIAL_ARCHIVED_ORDERS,
    INITIAL_CLIENTS,
    INITIAL_FINANCIAL_ENTRIES,
    INITIAL_CASH_REGISTER_STATUS,
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
    KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES,
    KEY_VISUALLY_REMOVED_ADJUSTMENTS,
} from './constants';

export function getCurrentOrgId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('barmate_current_org_id');
}

function getRequiredOrgId(): string {
    const orgId = getCurrentOrgId();
    if (!orgId) throw new Error("Nenhuma organização selecionada. Faça login novamente.");
    return orgId;
}

const saveToLocalStorage = <T,>(key: string, value: T, options?: { silent?: boolean }) => {
  if (typeof window !== 'undefined') {
    try {
      const serializedValue = JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
      if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  }
};

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null || storedValue === 'undefined') return defaultValue;
    return JSON.parse(storedValue);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Cloud Sync Engine Otimizado
 * Garante que apenas dados necessários subam para a nuvem
 */
const syncToCloud = (collectionPath: string, id: string, data: any) => {
    if (!db) return;
    const orgId = getCurrentOrgId();
    if (!orgId) return;

    // Remove campos nulos/undefined para economizar bytes e evitar erros no Firestore
    const cleanData = JSON.parse(JSON.stringify({ 
        ...data, 
        organizationId: orgId, 
        updatedAt: new Date().toISOString() 
    }, (k, v) => v === undefined ? null : v));

    const docRef = doc(db, 'organizations', orgId, collectionPath, id);
    
    setDoc(docRef, cleanData, { merge: true })
        .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'write',
                requestResourceData: cleanData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export function getProductCategories(): ProductCategory[] {
    const orgId = getCurrentOrgId();
    const data = getFromLocalStorage(KEY_PRODUCT_CATEGORIES, INITIAL_PRODUCT_CATEGORIES);
    return data.map(c => ({ ...c, organizationId: orgId || 'default' }));
}
export function saveProductCategories(categories: ProductCategory[]) {
    saveToLocalStorage(KEY_PRODUCT_CATEGORIES, categories);
    syncToCloud('config', 'categories', { items: categories });
}

export function getProducts(): Product[] {
    const orgId = getCurrentOrgId();
    const data = getFromLocalStorage(KEY_PRODUCTS, INITIAL_PRODUCTS);
    // Lógica de Isolamento: Se for um novo bar, ele começa limpo.
    if (orgId && !orgId.startsWith('demo_') && !orgId.startsWith('master_') && !localStorage.getItem(`init_${orgId}`)) {
        localStorage.setItem(`init_${orgId}`, 'true');
        return []; 
    }
    return data;
}
export function saveProducts(products: Product[]) {
    saveToLocalStorage(KEY_PRODUCTS, products);
    syncToCloud('config', 'products', { items: products });
}

export function getSales(): Sale[] {
    return getFromLocalStorage<Sale[]>(KEY_SALES, INITIAL_SALES);
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
    syncToCloud('config', 'clients', { items: clients });
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
    syncToCloud('config', 'fees', fees);
}

export function getVisuallyRemovedFinancialEntries(): string[] {
    return getFromLocalStorage(KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES, []);
}
export function saveVisuallyRemovedFinancialEntries(ids: string[]) {
    saveToLocalStorage(KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES, ids);
}

export function getVisuallyRemovedAdjustments(): string[] {
    return getFromLocalStorage(KEY_VISUALLY_REMOVED_ADJUSTMENTS, []);
}
export function saveVisuallyRemovedAdjustments(ids: string[]) {
    saveToLocalStorage(KEY_VISUALLY_REMOVED_ADJUSTMENTS, ids);
}

/**
 * Função de Bootstrap: Carrega dados essenciais da nuvem ao iniciar
 */
export async function loadEssentialDataFromCloud() {
    if (!db) return;
    const orgId = getCurrentOrgId();
    if (!orgId) return;

    try {
        const orgRef = doc(db, 'organizations', orgId);
        
        // Sincroniza Categorias
        const catRef = doc(orgRef, 'config', 'categories');
        const catSnap = await getDoc(catRef).catch(() => null);
        if (catSnap?.exists()) saveToLocalStorage(KEY_PRODUCT_CATEGORIES, catSnap.data().items, { silent: true });

        // Sincroniza Produtos
        const prodRef = doc(orgRef, 'config', 'products');
        const prodSnap = await getDoc(prodRef).catch(() => null);
        if (prodSnap?.exists()) saveToLocalStorage(KEY_PRODUCTS, prodSnap.data().items, { silent: true });

        // Sincroniza Clientes
        const clientRef = doc(orgRef, 'config', 'clients');
        const clientSnap = await getDoc(clientRef).catch(() => null);
        if (clientSnap?.exists()) saveToLocalStorage(KEY_CLIENTS, clientSnap.data().items, { silent: true });

        // Sincroniza Taxas
        const feeRef = doc(orgRef, 'config', 'fees');
        const feeSnap = await getDoc(feeRef).catch(() => null);
        if (feeSnap?.exists()) saveToLocalStorage(KEY_TRANSACTION_FEES, feeSnap.data() as TransactionFees, { silent: true });

        window.dispatchEvent(new Event('storage'));
    } catch (err) {
        console.error("Cloud boot error:", err);
    }
}

export function addSale(sale: any) {
  const orgId = getRequiredOrgId();
  const newSale: Sale = {
    id: `sale-${Date.now()}`,
    organizationId: orgId,
    timestamp: new Date(),
    ...sale,
    payments: sale.payments || [], 
  };

  const currentSales = getSales();
  saveSales([...currentSales, newSale]);

  const fees = getTransactionFees();
  const entries: any[] = [];
  const saleName = sale.name || `Venda #${newSale.id.slice(-6)}`;
  
  newSale.payments.forEach((p) => {
    if (p.amount <= 0) return;
    if (['debit', 'credit', 'pix'].includes(p.method)) {
      const feeRate = p.method === 'debit' ? fees.debitRate : (p.method === 'credit' ? fees.creditRate : fees.pixRate);
      const feeAmount = p.amount * (feeRate / 100);
      
      entries.push({ organizationId: orgId, description: `${saleName} via ${p.method}`, amount: p.amount, type: 'income', source: 'bank_account', saleId: newSale.id, adjustmentId: null });
      if (feeAmount > 0) {
        entries.push({ organizationId: orgId, description: `Taxa ${p.method} ${saleName}`, amount: feeAmount, type: 'expense', source: 'bank_account', saleId: newSale.id, adjustmentId: null });
      }
    } else if (p.method === 'cash') {
        const netCash = p.amount - (newSale.changeGiven || 0);
        if(netCash > 0) entries.push({ organizationId: orgId, description: `${saleName} em dinheiro`, amount: netCash, type: 'income', source: 'daily_cash', saleId: newSale.id, adjustmentId: null });
    }
  });

  if (entries.length > 0) addFinancialEntry(entries);
};

export function removeSale(saleId: string) {
  saveSales(getSales().filter(s => s.id !== saleId));
  saveFinancialEntries(getFinancialEntries().filter(e => e.saleId !== saleId));
}

export function addFinancialEntry(entry: any) {
    const orgId = getRequiredOrgId();
    const current = getFinancialEntries();
    const toAdd = Array.isArray(entry) ? entry : [entry];
    const news = toAdd.map((e, i) => ({ ...e, organizationId: orgId, id: `fin-${Date.now()}-${i}`, timestamp: new Date() }));
    saveFinancialEntries([...current, ...news]);
};

export function clearFinancialData() {
    if (typeof window === 'undefined') return;
    saveToLocalStorage(KEY_SALES, []);
    saveToLocalStorage(KEY_FINANCIAL_ENTRIES, []);
    saveToLocalStorage(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
    window.dispatchEvent(new Event('storage'));
};

export function migrateOldData() {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('barmate') && !key.endsWith('_v2')) {
            const oldData = localStorage.getItem(key);
            if (oldData) {
                const v2Key = key + '_v2';
                if (!localStorage.getItem(v2Key)) {
                    localStorage.setItem(v2Key, oldData);
                }
            }
        }
    });
}
