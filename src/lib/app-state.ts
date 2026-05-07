import {
  enqueueMutation,
  getLocalAppStateRecord,
  initializeOfflineSync,
  persistAppStateRecord,
  readAppStateRecordsFromLocal,
  removeAppStateRecord,
  setHydrationStatus,
} from './offline-sync';

type AppStateRow = {
  key: string;
  value: unknown;
  updatedAt?: string;
  updated_at?: string;
};

type CachedAppStateRecord = {
  value: unknown;
  updatedAt: string;
  pending: boolean;
};

const appStateCache = new Map<string, CachedAppStateRecord>();
let hydrationPromise: Promise<void> | null = null;
let hydrated = false;

const APP_STATE_EVENT = 'barmate-app-state-changed';

const notifyStateChange = (key: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_STATE_EVENT, { detail: { key } }));
};

export const getAppStateEventName = () => APP_STATE_EVENT;

/** Busca app_state da nossa própria API (PostgreSQL Vultr) */
async function fetchRemoteAppState(): Promise<AppStateRow[]> {
  try {
    const res = await fetch('/api/db/app-state', { credentials: 'include' });
    if (!res.ok) return [];
    return (await res.json()) as AppStateRow[];
  } catch {
    return [];
  }
}

export async function hydrateAppState() {
  if (hydrated || hydrationPromise) {
    return hydrationPromise ?? Promise.resolve();
  }

  hydrationPromise = (async () => {
    await initializeOfflineSync();
    setHydrationStatus(true);

    const localRecords = await readAppStateRecordsFromLocal();
    localRecords.forEach((record) => {
      appStateCache.set(record.key, {
        value: record.value,
        updatedAt: record.updatedAt,
        pending: record.pending,
      });
    });

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const rows = await fetchRemoteAppState();
      for (const row of rows) {
        const existing = appStateCache.get(row.key);
        const remoteUpdatedAt = row.updatedAt ?? row.updated_at ?? new Date().toISOString();
        const shouldUseRemote =
          !existing || (!existing.pending && remoteUpdatedAt > existing.updatedAt);
        if (shouldUseRemote) {
          appStateCache.set(row.key, {
            value: row.value,
            updatedAt: remoteUpdatedAt,
            pending: false,
          });
          await persistAppStateRecord({
            key: row.key,
            value: row.value,
            updatedAt: remoteUpdatedAt,
            pending: false,
          });
        }
      }
    }

    if (appStateCache.size === 0) {
      const local = await getLocalAppStateRecord('barName');
      if (local) {
        appStateCache.set(local.key, local);
      }
    }

    hydrated = true;
    setHydrationStatus(false);
  })();

  return hydrationPromise;
}

export function getAppState<T>(key: string, defaultValue: T): T {
  if (appStateCache.has(key)) {
    return appStateCache.get(key)?.value as T;
  }

  return defaultValue;
}

export function hasAppStateKey(key: string) {
  return appStateCache.has(key);
}

async function syncAppStateToRemote(key: string, value: unknown, updatedAt: string) {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const res = await fetch('/api/db/app-state', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const cached = appStateCache.get(key);
      if (cached && cached.updatedAt === updatedAt) {
        appStateCache.set(key, { value, updatedAt, pending: false });
        await persistAppStateRecord({ key, value, updatedAt, pending: false });
      }
    } catch (err) {
      console.error(`Erro ao salvar app_state[${key}]:`, err);
      await enqueueMutation({
        tableName: 'app_state',
        operation: 'upsert',
        key,
        payload: { key, value, updated_at: updatedAt },
        updatedAt,
      });
    }
  } else {
    await enqueueMutation({
      tableName: 'app_state',
      operation: 'upsert',
      key,
      payload: { key, value, updated_at: updatedAt },
      updatedAt,
    });
  }
}

export async function setAppState<T>(key: string, value: T) {
  const updatedAt = new Date().toISOString();
  appStateCache.set(key, { value, updatedAt, pending: true });
  await persistAppStateRecord({ key, value, updatedAt, pending: true });
  notifyStateChange(key);
  void syncAppStateToRemote(key, value, updatedAt);
}

export async function removeAppState(key: string) {
  appStateCache.delete(key);
  await removeAppStateRecord(key);

  const updatedAt = new Date().toISOString();

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const res = await fetch(`/api/db/app-state?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error(`Erro ao remover app_state[${key}]:`, err);
      await enqueueMutation({ tableName: 'app_state', operation: 'delete', key, updatedAt });
    }
  } else {
    await enqueueMutation({ tableName: 'app_state', operation: 'delete', key, updatedAt });
  }

  notifyStateChange(key);
}

export function getCachedAppStateKeys() {
  return Array.from(appStateCache.keys());
}
