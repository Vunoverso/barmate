/** URL base para as API routes de banco de dados */
const API_BASE = '/api/db';

/** Faz uma chamada autenticada para nossa API de dados */
async function callDbApi(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data?: unknown }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
    return { ok: res.ok, data: res.ok ? await res.json() : null };
  } catch {
    return { ok: false };
  }
}

type OfflineStatus = {
  isOnline: boolean;
  isHydrating: boolean;
  isSyncing: boolean;
  pendingMutations: number;
  conflicts: number;
  lastSyncAt: string | null;
  lastError: string | null;
};

type AppStateRecord = {
  key: string;
  value: unknown;
  updatedAt: string;
  pending: boolean;
};

type TableSnapshotRecord = {
  tableName: string;
  rows: Record<string, unknown>[];
  updatedAt: string;
};

type PendingMutation = {
  id: string;
  tableName: string;
  operation: 'upsert' | 'delete';
  key: string;
  payload?: Record<string, unknown>;
  updatedAt: string;
  baseUpdatedAt?: string | null;
};

type DbStores = {
  app_state: IDBObjectStore;
  table_snapshots: IDBObjectStore;
  mutations: IDBObjectStore;
  meta: IDBObjectStore;
};

const DB_NAME = 'barmate-offline-sync';
const DB_VERSION = 1;
const STATUS_EVENT = 'barmate-offline-status-changed';
const DATA_EVENT = 'barmate-offline-data-changed';

const memoryAppState = new Map<string, AppStateRecord>();
const memoryTableSnapshots = new Map<string, TableSnapshotRecord>();
let memoryMutations: PendingMutation[] = [];

const status: OfflineStatus = {
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  isHydrating: false,
  isSyncing: false,
  pendingMutations: 0,
  conflicts: 0,
  lastSyncAt: null,
  lastError: null,
};
let statusSnapshot: OfflineStatus = { ...status };

let databasePromise: Promise<IDBDatabase | null> | null = null;
let initialized = false;
let syncScheduled = false;
const statusListeners = new Set<() => void>();
const mutationFailureCounts = new Map<string, number>();
const MAX_MUTATION_RETRIES = 3;

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const emitStatusChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: { ...status } }));
  }

  statusListeners.forEach((listener) => listener());
};

const emitDataChange = (tableName?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_EVENT, { detail: { tableName } }));
  }
};

const updateStatus = (nextStatus: Partial<OfflineStatus>) => {
  Object.assign(status, nextStatus);
  statusSnapshot = { ...status };
  emitStatusChange();
};

const openDatabase = async () => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('app_state')) {
        database.createObjectStore('app_state', { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains('table_snapshots')) {
        database.createObjectStore('table_snapshots', { keyPath: 'tableName' });
      }
      if (!database.objectStoreNames.contains('mutations')) {
        database.createObjectStore('mutations', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('Falha ao abrir IndexedDB offline do BarMate:', request.error);
      resolve(null);
    };
  });

  return databasePromise;
};

const withStores = async <T,>(mode: IDBTransactionMode, callback: (stores: DbStores) => Promise<T> | T) => {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise<T | null>((resolve, reject) => {
    const transaction = database.transaction(['app_state', 'table_snapshots', 'mutations', 'meta'], mode);
    const stores = {
      app_state: transaction.objectStore('app_state'),
      table_snapshots: transaction.objectStore('table_snapshots'),
      mutations: transaction.objectStore('mutations'),
      meta: transaction.objectStore('meta'),
    } as DbStores;

    Promise.resolve(callback(stores))
      .then((value) => {
        resolve((value ?? null) as T | null);
      })
      .catch(reject);

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

const idbGet = <T,>(store: IDBObjectStore, key: IDBValidKey) => new Promise<T | undefined>((resolve, reject) => {
  const request = store.get(key);
  request.onsuccess = () => resolve(request.result as T | undefined);
  request.onerror = () => reject(request.error);
});

const idbGetAll = <T,>(store: IDBObjectStore) => new Promise<T[]>((resolve, reject) => {
  const request = store.getAll();
  request.onsuccess = () => resolve((request.result as T[]) ?? []);
  request.onerror = () => reject(request.error);
});

const idbPut = <T,>(store: IDBObjectStore, value: T) => new Promise<void>((resolve, reject) => {
  const request = store.put(value as never);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});

const idbDelete = (store: IDBObjectStore, key: IDBValidKey) => new Promise<void>((resolve, reject) => {
  const request = store.delete(key);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});

const idbClear = (store: IDBObjectStore) => new Promise<void>((resolve, reject) => {
  const request = store.clear();
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});

const remoteUpdatedAt = (row: Record<string, unknown> | null | undefined) => {
  if (!row) return null;
  const value = row.updated_at ?? row.updatedAt ?? null;
  return typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : null;
};

const getPrimaryKeyField = (tableName: string) => (tableName === 'app_state' ? 'key' : 'id');

const syncAppStateToMemory = async (records: AppStateRecord[]) => {
  memoryAppState.clear();
  records.forEach((record) => memoryAppState.set(record.key, record));
};

export const getOfflineStatus = () => statusSnapshot;

export const subscribeOfflineStatus = (listener: () => void) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

export const useOfflineStatusStore = () => getOfflineStatus();

export const initializeOfflineSync = async () => {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;
  updateStatus({ isOnline: navigator.onLine, isHydrating: true });

  window.addEventListener('online', () => {
    updateStatus({ isOnline: true });
    void flushPendingMutations();
  });

  window.addEventListener('offline', () => {
    updateStatus({ isOnline: false });
  });

  const cachedRecords = await readAppStateRecordsFromLocal();
  await syncAppStateToMemory(cachedRecords);
  const cachedMutations = await compactPendingMutationsInLocal();
  memoryMutations = cachedMutations;
  updateStatus({ pendingMutations: memoryMutations.length, isHydrating: false });

  if (navigator.onLine) {
    void flushPendingMutations();
  }

  // Drena pendencias periodicamente (caso o usuario fique online sem disparar evento).
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && memoryMutations.length > 0) {
      void flushPendingMutations();
    }
  }, 10_000);
};

export const getLocalAppStateRecord = async (key: string) => {
  const existing = memoryAppState.get(key);
  if (existing) return existing;

  const database = await openDatabase();
  if (!database) return undefined;

  const record = await withStores('readonly', async ({ app_state }) => idbGet<AppStateRecord>(app_state, key));
  if (record) memoryAppState.set(record.key, record);
  return record ?? undefined;
};

export const readAppStateRecordsFromLocal = async () => {
  if (memoryAppState.size > 0) {
    return Array.from(memoryAppState.values());
  }

  const database = await openDatabase();
  if (!database) return [] as AppStateRecord[];

  const records = await withStores('readonly', async ({ app_state }) => idbGetAll<AppStateRecord>(app_state));
  return records ?? [];
};

export const persistAppStateRecord = async (record: AppStateRecord) => {
  memoryAppState.set(record.key, record);

  const database = await openDatabase();
  if (!database) {
    emitDataChange('app_state');
    return;
  }

  await withStores('readwrite', async ({ app_state }) => idbPut(app_state, record));
  emitDataChange('app_state');
};

export const removeAppStateRecord = async (key: string) => {
  memoryAppState.delete(key);

  const database = await openDatabase();
  if (!database) {
    emitDataChange('app_state');
    return;
  }

  await withStores('readwrite', async ({ app_state }) => idbDelete(app_state, key));
  emitDataChange('app_state');
};

export const getLocalTableSnapshot = async (tableName: string) => {
  const existing = memoryTableSnapshots.get(tableName);
  if (existing) return existing;

  const database = await openDatabase();
  if (!database) return undefined;

  const snapshot = await withStores('readonly', async ({ table_snapshots }) => idbGet<TableSnapshotRecord>(table_snapshots, tableName));
  if (snapshot) memoryTableSnapshots.set(tableName, snapshot);
  return snapshot ?? undefined;
};

export const persistTableSnapshot = async (
  tableName: string,
  rows: Record<string, unknown>[],
  options?: { silent?: boolean },
) => {
  const snapshot: TableSnapshotRecord = {
    tableName,
    rows,
    updatedAt: new Date().toISOString(),
  };

  memoryTableSnapshots.set(tableName, snapshot);

  const database = await openDatabase();
  if (database) {
    await withStores('readwrite', async ({ table_snapshots }) => idbPut(table_snapshots, snapshot));
  }

  if (!options?.silent) {
    emitDataChange(tableName);
  }
};

export const hasPendingMutationsForTable = (tableName: string) =>
  memoryMutations.some((mutation) => mutation.tableName === tableName);

const writeMutationToLocal = async (mutation: PendingMutation) => {
  const database = await openDatabase();
  if (!database) {
    memoryMutations.push(mutation);
    updateStatus({ pendingMutations: memoryMutations.length });
    return;
  }

  await withStores('readwrite', async ({ mutations }) => idbPut(mutations, mutation));
  memoryMutations.push(mutation);
  updateStatus({ pendingMutations: memoryMutations.length });
};

const compactMutationQueue = (mutations: PendingMutation[]) => {
  if (mutations.length <= 1) return mutations;

  const seen = new Set<string>();
  const compactedReversed: PendingMutation[] = [];

  for (let index = mutations.length - 1; index >= 0; index -= 1) {
    const mutation = mutations[index];
    const key = `${mutation.tableName}:${mutation.key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    compactedReversed.push(mutation);
  }

  return compactedReversed.reverse();
};

export const enqueueMutation = async (mutation: Omit<PendingMutation, 'id'>) => {
  await writeMutationToLocal({ ...mutation, id: generateId() });
};

const readPendingMutationsFromLocal = async () => {
  const database = await openDatabase();
  if (!database) return memoryMutations;

  const records = await withStores('readonly', async ({ mutations }) => idbGetAll<PendingMutation>(mutations));
  return records ?? [];
};

const compactPendingMutationsInLocal = async () => {
  const raw = await readPendingMutationsFromLocal();
  const compacted = compactMutationQueue(raw);

  if (compacted.length === raw.length) {
    return compacted;
  }

  const database = await openDatabase();
  if (!database) {
    memoryMutations = compacted;
    return compacted;
  }

  await withStores('readwrite', async ({ mutations }) => {
    await idbClear(mutations);
    for (const mutation of compacted) {
      await idbPut(mutations, mutation);
    }
  });

  return compacted;
};

const removeMutation = async (mutationId: string) => {
  memoryMutations = memoryMutations.filter((mutation) => mutation.id !== mutationId);

  const database = await openDatabase();
  if (database) {
    await withStores('readwrite', async ({ mutations }) => idbDelete(mutations, mutationId));
  }

  updateStatus({ pendingMutations: memoryMutations.length });
};

const updateRemoteAndLocal = async (mutation: PendingMutation) => {
  const primaryKeyField = getPrimaryKeyField(mutation.tableName);

  if (mutation.operation === 'delete') {
    let path: string;
    if (mutation.tableName === 'app_state') {
      path = `/app-state?key=${encodeURIComponent(mutation.key)}`;
    } else {
      path = `/${mutation.tableName}?id=${encodeURIComponent(mutation.key)}`;
    }
    const result = await callDbApi(path, { method: 'DELETE' });
    if (!result.ok) throw new Error(`DELETE ${mutation.tableName} falhou`);

    if (mutation.tableName === 'app_state') {
      await removeAppStateRecord(mutation.key);
    } else {
      const snapshot = await getLocalTableSnapshot(mutation.tableName);
      const rows = (snapshot?.rows ?? []).filter((row) => String(row[primaryKeyField]) !== mutation.key);
      await persistTableSnapshot(mutation.tableName, rows);
    }
    return;
  }

  const payload = mutation.payload ?? {};
  const TABLE_PATH_MAP: Record<string, string> = {
    app_state: '/app-state',
    open_orders: '/open-orders',
    guest_requests: '/guest-requests',
  };
  const path = TABLE_PATH_MAP[mutation.tableName] ?? `/${mutation.tableName}`;

  const result = await callDbApi(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!result.ok) throw new Error(`UPSERT ${mutation.tableName} falhou`);

  if (mutation.tableName === 'app_state') {
    await persistAppStateRecord({
      key: mutation.key,
      value: payload.value,
      updatedAt: mutation.updatedAt,
      pending: false,
    });
    return;
  }

  const snapshot = await getLocalTableSnapshot(mutation.tableName);
  const rows = snapshot?.rows ?? [];
  const nextRows = rows.filter((row) => String(row[primaryKeyField]) !== mutation.key);
  nextRows.push(payload);
  await persistTableSnapshot(mutation.tableName, nextRows);
};

export const flushPendingMutations = async () => {
  if (status.isSyncing || !navigator.onLine) {
    return;
  }

  updateStatus({ isSyncing: true, lastError: null });

  const mutations = await compactPendingMutationsInLocal();
  memoryMutations = mutations;
  updateStatus({ pendingMutations: memoryMutations.length });

  let hadAnyFailure = false;
  let lastFailureMessage: string | null = null;

  for (const mutation of mutations) {
    try {
      await updateRemoteAndLocal(mutation);
      mutationFailureCounts.delete(mutation.id);
      await removeMutation(mutation.id);
    } catch (error) {
      hadAnyFailure = true;
      lastFailureMessage = error instanceof Error ? error.message : 'Falha de sincronização';
      console.error('Falha ao sincronizar mutação pendente:', mutation, error);

      const failures = (mutationFailureCounts.get(mutation.id) ?? 0) + 1;
      mutationFailureCounts.set(mutation.id, failures);

      if (failures >= MAX_MUTATION_RETRIES) {
        // Evita que uma mutação inválida bloqueie toda a fila para sempre.
        await removeMutation(mutation.id);
        mutationFailureCounts.delete(mutation.id);
        updateStatus({ conflicts: status.conflicts + 1 });
      }
    }
  }

  updateStatus({
    isSyncing: false,
    lastSyncAt: hadAnyFailure ? status.lastSyncAt : new Date().toISOString(),
    lastError: hadAnyFailure ? lastFailureMessage : null,
  });
};

export const markLocalMutationApplied = async () => {
  if (!status.isOnline) {
    return;
  }

  await flushPendingMutations();
};

export const isOfflineCapable = () => true;

export const emitOfflineDataChange = emitDataChange;

export const setHydrationStatus = (isHydrating: boolean) => updateStatus({ isHydrating });

export const setConnectivity = (isOnline: boolean) => updateStatus({ isOnline });

export const getOfflineStatusEventName = () => STATUS_EVENT;

export const getOfflineDataEventName = () => DATA_EVENT;
