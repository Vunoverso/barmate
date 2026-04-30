
import type { Product, Sale, PaymentMethod, ProductCategory, FinancialEntry, SecondaryCashBox, BankAccount, CashRegisterStatus, Payment, TransactionFees, ActiveOrder, Client, CashAdjustment, GuestRequest, Table } from '@/types';
import { getAppState, setAppState, hydrateAppState, hasAppStateKey } from './app-state';
import { db, collection, getDocs, doc, setDoc } from './supabase-firestore';
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
    INITIAL_SECONDARY_CASH_BOX,
    INITIAL_BANK_ACCOUNT,
    INITIAL_TRANSACTION_FEES,
    INITIAL_TABLES,
    INITIAL_MENU_BRANDING,
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
    KEY_SECONDARY_CASH_BOX,
    KEY_BANK_ACCOUNT,
    KEY_CLOSED_SESSIONS,
    KEY_TABLES,
    KEY_MENU_BRANDING,
    type MenuBranding,
} from './constants';

const sessionStateCache = new Map<string, unknown>();

const saveToSessionState = <T,>(key: string, value: T) => {
  sessionStateCache.set(key, value);
};

const getFromSessionState = <T,>(key: string, defaultValue: T): T => {
  return sessionStateCache.has(key) ? (sessionStateCache.get(key) as T) : defaultValue;
};

// --- Data Migration & Deep Recovery Scan ---
let legacyDataMigrated = false;

const LEGACY_TEXT_KEYS = ['barName', 'barCnpj', 'barAddress', 'barLogo'] as const;
const LEGACY_STATE_KEYS = [
  KEY_PRODUCT_CATEGORIES,
  KEY_PRODUCTS,
  KEY_SALES,
  KEY_OPEN_ORDERS,
  KEY_ARCHIVED_ORDERS,
  KEY_CLIENTS,
  KEY_FINANCIAL_ENTRIES,
  KEY_CASH_REGISTER_STATUS,
  KEY_TRANSACTION_FEES,
  KEY_CLOSED_SESSIONS,
  KEY_SECONDARY_CASH_BOX,
  KEY_BANK_ACCOUNT,
] as const;

const parseLegacyValue = (key: string, rawValue: string) => {
  if (key === 'barLogoScale') {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  if (LEGACY_TEXT_KEYS.includes(key as typeof LEGACY_TEXT_KEYS[number])) {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
};

const importLegacyOrdersToSupabase = async (rawValue: string) => {
  if (!db) return false;

  const existingOrders = await getDocs(collection(db, 'open_orders'));
  if (existingOrders.size > 0) return false;

  const parsed = parseLegacyValue(KEY_OPEN_ORDERS, rawValue);
  if (!Array.isArray(parsed)) return false;

  for (const order of parsed) {
    if (!order || typeof order !== 'object' || !('id' in order)) continue;
    await setDoc(doc(db, 'open_orders', String((order as ActiveOrder).id)), order as Record<string, unknown>, { merge: true });
  }

  return true;
};

export async function migrateOldData() {
  await hydrateAppState();

  if (legacyDataMigrated || typeof window === 'undefined') {
    return;
  }

  const legacyKeys = [...LEGACY_TEXT_KEYS, 'barLogoScale', ...LEGACY_STATE_KEYS] as const;
  const legacyEntries: Array<[string, string]> = [];

  for (const key of legacyKeys) {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue) {
      legacyEntries.push([key, rawValue]);
    }
  }

  if (legacyEntries.length === 0) {
    legacyDataMigrated = true;
    return;
  }

  for (const [key, rawValue] of legacyEntries) {
    if (key === KEY_OPEN_ORDERS) {
      const importedOrders = await importLegacyOrdersToSupabase(rawValue);
      if (importedOrders && !hasAppStateKey(KEY_OPEN_ORDERS)) {
        await setAppState(KEY_OPEN_ORDERS, parseLegacyValue(key, rawValue));
      }
      continue;
    }

    if (hasAppStateKey(key)) {
      continue;
    }

    await setAppState(key, parseLegacyValue(key, rawValue));
  }

  legacyDataMigrated = true;
};


// --- Data Accessor Functions ---

export function getProductCategories(): ProductCategory[] {
  return getAppState(KEY_PRODUCT_CATEGORIES, INITIAL_PRODUCT_CATEGORIES);
}
export async function saveProductCategories(categories: ProductCategory[]) {
  await setAppState(KEY_PRODUCT_CATEGORIES, categories);
}

export function getProducts(): Product[] {
  return getAppState(KEY_PRODUCTS, INITIAL_PRODUCTS);
}
export async function saveProducts(products: Product[]) {
  await setAppState(KEY_PRODUCTS, products);
}

export function getSales(): Sale[] {
  const sales = getAppState<Sale[]>(KEY_SALES, INITIAL_SALES);
    return sales.map(sale => ({
        ...sale,
        payments: sale.payments || [],
        items: sale.items || [],
    }));
}
export function saveSales(sales: Sale[]) {
  void setAppState(KEY_SALES, sales);
}

export function getOpenOrders(): ActiveOrder[] {
  return getAppState(KEY_OPEN_ORDERS, INITIAL_OPEN_ORDERS);
}
export function saveOpenOrders(orders: ActiveOrder[]) {
  void setAppState(KEY_OPEN_ORDERS, orders);
}

export function getArchivedOrders(): ActiveOrder[] {
  return getAppState(KEY_ARCHIVED_ORDERS, INITIAL_ARCHIVED_ORDERS);
}
export function saveArchivedOrders(orders: ActiveOrder[]) {
  void setAppState(KEY_ARCHIVED_ORDERS, orders);
}

export function getClients(): Client[] {
  return getAppState(KEY_CLIENTS, INITIAL_CLIENTS);
}
export async function saveClients(clients: Client[]) {
  await setAppState(KEY_CLIENTS, clients);
}

export function getFinancialEntries(): FinancialEntry[] {
  return getAppState(KEY_FINANCIAL_ENTRIES, INITIAL_FINANCIAL_ENTRIES);
}
export function saveFinancialEntries(entries: FinancialEntry[]) {
  void setAppState(KEY_FINANCIAL_ENTRIES, entries);
}

export function getClosedSessions(): unknown[] {
  return getAppState(KEY_CLOSED_SESSIONS, []);
}

export function saveClosedSessions(sessions: unknown[]) {
  void setAppState(KEY_CLOSED_SESSIONS, sessions);
}

export function getCashRegisterStatus(): CashRegisterStatus {
  return getAppState(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
}
export function saveCashRegisterStatus(status: CashRegisterStatus, options?: { silent?: boolean }) {
  void setAppState(KEY_CASH_REGISTER_STATUS, status);
}

export function getTransactionFees(): TransactionFees {
  return getAppState(KEY_TRANSACTION_FEES, INITIAL_TRANSACTION_FEES);
}
export async function saveTransactionFees(fees: TransactionFees, options?: { silent?: boolean }) {
  await setAppState(KEY_TRANSACTION_FEES, fees);
}

export function getVisuallyRemovedFinancialEntries(): string[] {
  return getFromSessionState(KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES, []);
}
export function saveVisuallyRemovedFinancialEntries(ids: string[]) {
  saveToSessionState(KEY_VISUALLY_REMOVED_FINANCIAL_ENTRIES, ids);
}

export function getVisuallyRemovedAdjustments(): string[] {
  return getFromSessionState(KEY_VISUALLY_REMOVED_ADJUSTMENTS, []);
}
export function saveVisuallyRemovedAdjustments(ids: string[]) {
  saveToSessionState(KEY_VISUALLY_REMOVED_ADJUSTMENTS, ids);
}

export type CompanyDetails = {
  barName: string;
  barCnpj: string;
  barAddress: string;
  barLogo: string;
  barLogoScale: number;
};

export function getCompanyDetails(): CompanyDetails {
  return {
    barName: getAppState('barName', 'BarMate'),
    barCnpj: getAppState('barCnpj', ''),
    barAddress: getAppState('barAddress', ''),
    barLogo: getAppState('barLogo', ''),
    barLogoScale: getAppState('barLogoScale', 1),
  };
}

export async function saveCompanyDetails(details: CompanyDetails) {
  await Promise.all([
    setAppState('barName', details.barName),
    setAppState('barCnpj', details.barCnpj),
    setAppState('barAddress', details.barAddress),
    setAppState('barLogo', details.barLogo),
    setAppState('barLogoScale', details.barLogoScale),
  ]);
}

export function getCounterSaleDraft<T>(key: string, defaultValue: T): T {
  return getFromSessionState(key, defaultValue);
}

export function saveCounterSaleDraft<T>(key: string, value: T) {
  saveToSessionState(key, value);
}

export function removeCounterSaleDraft(key: string) {
  sessionStateCache.delete(key);
}

// --- Tables (cardapio digital) ---

export function getTables(): Table[] {
  return getAppState<Table[]>(KEY_TABLES, INITIAL_TABLES);
}

export async function saveTables(tables: Table[]) {
  await setAppState(KEY_TABLES, tables);
}

/** Resolve mesa por slug (case-insensitive). Retorna null se nao existir/estiver inativa. */
export function findTableBySlug(slug: string): Table | null {
  const target = slug.trim().toLowerCase();
  if (!target) return null;
  return getTables().find((t) => t.slug.toLowerCase() === target && t.isActive) ?? null;
}

// --- Menu Branding (visual do cardapio digital) ---

export function getMenuBranding(): MenuBranding {
  return getAppState<MenuBranding>(KEY_MENU_BRANDING, INITIAL_MENU_BRANDING);
}

export async function saveMenuBranding(branding: MenuBranding) {
  await setAppState(KEY_MENU_BRANDING, branding);
}


// --- Cloud Loading Helpers (Sincronização Master) ---
export async function loadEssentialDataFromCloud() {
  await hydrateAppState();
}


// --- Business Logic Functions ---

export function addSale(sale: Sale | (Omit<Sale, 'id' | 'timestamp'> & { name: string, timestamp?: Date })) {
  const newSale: Sale = {
    id: `sale-${Date.now()}`,
    timestamp: new Date(),
    ...sale,
    payments: 'payments' in sale ? (sale.payments || []) : [],
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
  void setAppState(KEY_SALES, []);
  void setAppState(KEY_FINANCIAL_ENTRIES, []);
  void setAppState(KEY_CASH_REGISTER_STATUS, INITIAL_CASH_REGISTER_STATUS);
  void setAppState(KEY_CLOSED_SESSIONS, []);
  void setAppState(KEY_SECONDARY_CASH_BOX, INITIAL_SECONDARY_CASH_BOX);
  void setAppState(KEY_BANK_ACCOUNT, INITIAL_BANK_ACCOUNT);
};
