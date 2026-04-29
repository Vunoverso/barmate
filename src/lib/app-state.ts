import { supabase } from './supabaseClient';
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

    if (supabase && navigator.onLine) {
      const { data, error } = await supabase.from('app_state').select('key,value,updated_at');
      if (error) {
        console.error('Erro ao carregar app_state do Supabase:', error);
      } else {
        for (const row of (data as AppStateRow[] | null) ?? []) {
          const existing = appStateCache.get(row.key);
          const remoteUpdatedAt = row.updated_at ?? new Date().toISOString();
          if (!existing || !existing.pending || remoteUpdatedAt >= existing.updatedAt) {
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
  if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
    const { error } = await supabase.from('app_state').upsert({
      key,
      value,
      updated_at: updatedAt,
    });

    if (error) {
      console.error(`Erro ao salvar app_state[${key}] no Supabase:`, error);
      await enqueueMutation({
        tableName: 'app_state',
        operation: 'upsert',
        key,
        payload: { key, value, updated_at: updatedAt },
        updatedAt,
      });
      return;
    }

    const cached = appStateCache.get(key);
    if (cached && cached.updatedAt === updatedAt) {
      appStateCache.set(key, { value, updatedAt, pending: false });
      await persistAppStateRecord({ key, value, updatedAt, pending: false });
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
  // Atualiza cache local imediatamente e notifica listeners para UI responsiva.
  await persistAppStateRecord({ key, value, updatedAt, pending: true });
  notifyStateChange(key);

  // Sincroniza com Supabase em background (fire-and-forget) para nao travar a UI.
  void syncAppStateToRemote(key, value, updatedAt);
}

export async function removeAppState(key: string) {
  appStateCache.delete(key);
  await removeAppStateRecord(key);

  const updatedAt = new Date().toISOString();

  if (supabase && navigator.onLine) {
    const { error } = await supabase.from('app_state').delete().eq('key', key);
    if (error) {
      console.error(`Erro ao remover app_state[${key}] no Supabase:`, error);
      await enqueueMutation({
        tableName: 'app_state',
        operation: 'delete',
        key,
        updatedAt,
      });
    }
  } else {
    await enqueueMutation({
      tableName: 'app_state',
      operation: 'delete',
      key,
      updatedAt,
    });
  }

  notifyStateChange(key);
}

export function getCachedAppStateKeys() {
  return Array.from(appStateCache.keys());
}
