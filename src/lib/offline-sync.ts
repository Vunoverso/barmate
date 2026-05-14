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

const STATUS_EVENT = 'barmate-offline-status-changed';
const DATA_EVENT = 'barmate-offline-data-changed';

const memoryAppState = new Map<string, AppStateRecord>();
const memoryTableSnapshots = new Map<string, TableSnapshotRecord>();

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
let initialized = false;

const statusListeners = new Set<() => void>();

const emitStatusChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: { ...statusSnapshot } }));
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
  updateStatus({
    isOnline: navigator.onLine,
    isHydrating: false,
    isSyncing: false,
    pendingMutations: 0,
    conflicts: 0,
    lastError: null,
  });

  window.addEventListener('online', () => {
    updateStatus({ isOnline: true, lastError: null });
  });

  window.addEventListener('offline', () => {
    updateStatus({ isOnline: false });
  });
};

export const getLocalAppStateRecord = async (key: string) => memoryAppState.get(key);

export const readAppStateRecordsFromLocal = async () => Array.from(memoryAppState.values());

export const persistAppStateRecord = async (record: AppStateRecord) => {
  memoryAppState.set(record.key, record);
  emitDataChange('app_state');
};

export const removeAppStateRecord = async (key: string) => {
  memoryAppState.delete(key);
  emitDataChange('app_state');
};

export const getLocalTableSnapshot = async (tableName: string) => memoryTableSnapshots.get(tableName);

export const persistTableSnapshot = async (
  tableName: string,
  rows: Record<string, unknown>[],
  options?: { silent?: boolean },
) => {
  memoryTableSnapshots.set(tableName, {
    tableName,
    rows,
    updatedAt: new Date().toISOString(),
  });

  if (!options?.silent) {
    emitDataChange(tableName);
  }
};

export const hasPendingMutationsForTable = (_tableName: string) => false;

export const enqueueMutation = async (_mutation: Omit<PendingMutation, 'id'>) => {
  updateStatus({
    pendingMutations: 0,
    lastError: 'Sincronização offline desativada. Recarregue quando a conexão com a Vultr voltar.',
  });
};

export const flushPendingMutations = async () => {
  updateStatus({ isSyncing: false, pendingMutations: 0 });
};

export const markLocalMutationApplied = async () => {
  updateStatus({ lastSyncAt: new Date().toISOString(), pendingMutations: 0 });
};

export const isOfflineCapable = () => false;

export const emitOfflineDataChange = emitDataChange;

export const setHydrationStatus = (isHydrating: boolean) => updateStatus({ isHydrating });

export const setConnectivity = (isOnline: boolean) => updateStatus({ isOnline });

export const getOfflineStatusEventName = () => STATUS_EVENT;

export const getOfflineDataEventName = () => DATA_EVENT;