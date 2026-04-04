
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
    DATA_KEYS,
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
import { isSupabaseProvider } from './backend-provider';
import { supabase } from './supabaseClient';

const DATA_KEYS_SET = new Set(DATA_KEYS);
const RAW_LOCAL_STORAGE_KEYS = new Set([
    'barName',
    'barCnpj',
    'barAddress',
    'barLogo',
    'barLogoScale',
]);

const supabaseSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

type AppDocumentRow = {
    collection_name: string;
    document_key: string;
    payload: unknown;
};

function normalizeCompatibilityPayload<T>(value: T): T {
    return JSON.parse(JSON.stringify(value, (_key, currentValue) => currentValue === undefined ? null : currentValue));
}

function shouldSyncCompatibilityKey(key: string) {
    return isSupabaseProvider && Boolean(supabase) && DATA_KEYS_SET.has(key);
}

function scheduleCompatibilitySync(key: string, value: unknown) {
    if (typeof window === 'undefined') return;
    if (!shouldSyncCompatibilityKey(key) || !supabase) return;

    const orgId = getCurrentOrgId();
    if (!orgId) return;

    const syncId = `${orgId}:${key}`;
    const payload = normalizeCompatibilityPayload(value);

    const existingTimer = supabaseSyncTimers.get(syncId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
        try {
            const { error } = await supabase
                .from('app_documents')
                .upsert({
                    organization_id: orgId,
                    collection_name: key,
                    document_key: 'singleton',
                    payload,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'organization_id,collection_name,document_key',
                });

            if (error) {
                console.error(`Supabase compatibility sync error (${key}):`, error);
            }
        } finally {
            supabaseSyncTimers.delete(syncId);
        }
    }, 250);

    supabaseSyncTimers.set(syncId, timer);
}

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
                scheduleCompatibilitySync(key, value);
            }
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

function saveRawToLocalStorage(key: string, value: unknown, options?: { silent?: boolean }) {
    if (typeof window === 'undefined') return;

    if (value === null || value === undefined) {
        window.localStorage.removeItem(key);
    } else {
        window.localStorage.setItem(key, String(value));
    }

    if (!options?.silent) {
        scheduleCompatibilitySync(key, value);
    }

    if (!options?.silent) {
        window.dispatchEvent(new StorageEvent('storage', { key }));
    }
}

export function saveCompatibilityKeyValue(key: string, value: unknown, options?: { silent?: boolean }) {
    if (!DATA_KEYS_SET.has(key)) return;

    if (RAW_LOCAL_STORAGE_KEYS.has(key)) {
        saveRawToLocalStorage(key, value, options);
        return;
    }

    saveToLocalStorage(key, value, options);
}

function compareDocumentKeys(a: string, b: string) {
    const aMatch = /^index_(\d+)$/.exec(a);
    const bMatch = /^index_(\d+)$/.exec(b);

    if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
    if (aMatch) return -1;
    if (bMatch) return 1;
    return a.localeCompare(b, 'pt-BR');
}

function reconstructCollectionPayload(rows: AppDocumentRow[]) {
    const singletonRow = rows.find((row) => row.document_key === 'singleton');
    if (singletonRow) {
        return singletonRow.payload;
    }

    return [...rows]
        .sort((left, right) => compareDocumentKeys(left.document_key, right.document_key))
        .map((row) => row.payload);
}

async function loadCompatibilityDataFromSupabase() {
    if (!supabase) return;

    const orgId = getCurrentOrgId();
    if (!orgId) return;

    const pageSize = 1000;
    const data: AppDocumentRow[] = [];
    let offset = 0;

    while (true) {
        const { data: page, error } = await supabase
            .from('app_documents')
            .select('collection_name, document_key, payload')
            .eq('organization_id', orgId)
            .order('collection_name', { ascending: true })
            .order('document_key', { ascending: true })
            .range(offset, offset + pageSize - 1);

        if (error) {
            console.error('Supabase compatibility boot error:', error);
            return;
        }

        if (!page || page.length === 0) break;

        data.push(...(page as AppDocumentRow[]));

        if (page.length < pageSize) break;
        offset += page.length;
    }

    const groupedRows = new Map<string, AppDocumentRow[]>();
    for (const row of data || []) {
        const bucket = groupedRows.get(row.collection_name) || [];
        bucket.push(row as AppDocumentRow);
        groupedRows.set(row.collection_name, bucket);
    }

    DATA_KEYS.forEach((key) => {
        const rows = groupedRows.get(key);
        if (!rows || rows.length === 0) return;

        const payload = reconstructCollectionPayload(rows);

        if (RAW_LOCAL_STORAGE_KEYS.has(key)) {
            saveRawToLocalStorage(key, payload, { silent: true });
            return;
        }

        saveToLocalStorage(key, payload, { silent: true });
    });

    if (groupedRows.has(KEY_PRODUCTS) || groupedRows.has(KEY_PRODUCT_CATEGORIES)) {
        localStorage.setItem(`init_${orgId}`, 'true');
    }

    window.dispatchEvent(new Event('storage'));
}

/**
 * Cloud Sync Engine Otimizado para coleções raiz (compatível com firestore.rules)
 */
const syncToCloud = (collectionPath: string, id: string, data: any) => {
    if (isSupabaseProvider) return;
    if (!db) return;
    const orgId = getCurrentOrgId();
    if (!orgId) return;

    const cleanData = JSON.parse(JSON.stringify({ 
        ...data, 
        organizationId: orgId, 
        updatedAt: new Date().toISOString() 
    }, (k, v) => v === undefined ? null : v));

    // Usando coleção raiz para compatibilidade com as regras atuais
    const docRef = doc(db, collectionPath, id);
    
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
    const orgId = getRequiredOrgId();
    saveToLocalStorage(KEY_PRODUCT_CATEGORIES, categories);
    syncToCloud('product_categories', orgId, { items: categories });
}

export function getProducts(): Product[] {
    const orgId = getCurrentOrgId();
    const data = getFromLocalStorage(KEY_PRODUCTS, INITIAL_PRODUCTS);
    if (orgId && !orgId.startsWith('demo_') && !orgId.startsWith('master_') && !localStorage.getItem(`init_${orgId}`)) {
        localStorage.setItem(`init_${orgId}`, 'true');
        return []; 
    }
    return data;
}
export function saveProducts(products: Product[]) {
    const orgId = getRequiredOrgId();
    saveToLocalStorage(KEY_PRODUCTS, products);
    syncToCloud('products', orgId, { items: products });
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
    const orgId = getRequiredOrgId();
    saveToLocalStorage(KEY_CLIENTS, clients);
    syncToCloud('clients', orgId, { items: clients });
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
    const orgId = getRequiredOrgId();
    saveToLocalStorage(KEY_TRANSACTION_FEES, fees, options);
    syncToCloud('settings', orgId, fees);
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

export async function loadEssentialDataFromCloud() {
    const orgId = getCurrentOrgId();
    if (!orgId) return;

    if (isSupabaseProvider && supabase) {
        await loadCompatibilityDataFromSupabase();
        return;
    }

    if (!db) return;

    try {
        const catSnap = await getDoc(doc(db, 'product_categories', orgId)).catch(() => null);
        if (catSnap?.exists()) saveToLocalStorage(KEY_PRODUCT_CATEGORIES, catSnap.data().items, { silent: true });

        const prodSnap = await getDoc(doc(db, 'products', orgId)).catch(() => null);
        if (prodSnap?.exists()) saveToLocalStorage(KEY_PRODUCTS, prodSnap.data().items, { silent: true });

        const clientSnap = await getDoc(doc(db, 'clients', orgId)).catch(() => null);
        if (clientSnap?.exists()) saveToLocalStorage(KEY_CLIENTS, clientSnap.data().items, { silent: true });

        const feeSnap = await getDoc(doc(db, 'settings', orgId)).catch(() => null);
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
