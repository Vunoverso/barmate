import {
  initializeOfflineSync,
  persistAppStateRecord,
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
let remoteRefreshPromise: Promise<void> | null = null;
let hydrated = false;
let refreshListenersStarted = false;
let remoteFailureCount = 0;
let remotePausedUntil = 0;
let remoteLastLogAt = 0;

const APP_STATE_EVENT = 'barmate-app-state-changed';
const REMOTE_FAILURES_BEFORE_PAUSE = 3;
const REMOTE_FAILURE_BASE_COOLDOWN_MS = 5 * 60_000;
const REMOTE_FAILURE_MAX_COOLDOWN_MS = 30 * 60_000;
const REMOTE_FAILURE_LOG_INTERVAL_MS = 60_000;

const notifyStateChange = (key: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_STATE_EVENT, { detail: { key } }));
};

export const getAppStateEventName = () => APP_STATE_EVENT;

const recordRemoteFailure = (status?: number) => {
  const now = Date.now();
  remoteFailureCount += 1;

  if (remoteFailureCount >= REMOTE_FAILURES_BEFORE_PAUSE) {
    const pauseLevel = remoteFailureCount - REMOTE_FAILURES_BEFORE_PAUSE;
    const cooldownMs = Math.min(
      REMOTE_FAILURE_BASE_COOLDOWN_MS * (2 ** pauseLevel),
      REMOTE_FAILURE_MAX_COOLDOWN_MS,
    );
    remotePausedUntil = now + cooldownMs;
  }

  if (now - remoteLastLogAt >= REMOTE_FAILURE_LOG_INTERVAL_MS) {
    const pausedForSeconds = Math.max(0, Math.ceil((remotePausedUntil - now) / 1000));
    console.error(
      `API fetch error for app_state${status ? ` (HTTP ${status})` : ''}${pausedForSeconds ? `; retry paused for ${pausedForSeconds}s` : ''}`,
    );
    remoteLastLogAt = now;
  }
};

const recordRemoteSuccess = () => {
  remoteFailureCount = 0;
  remotePausedUntil = 0;
  remoteLastLogAt = 0;
};

/** Busca app_state da nossa própria API (PostgreSQL Vultr) */
async function fetchRemoteAppState(): Promise<AppStateRow[] | null> {
  if (Date.now() < remotePausedUntil) {
    return null;
  }

  try {
    const res = await fetch('/api/db/app-state', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      recordRemoteFailure(res.status);
      return null;
    }
    const rows = (await res.json()) as AppStateRow[];
    recordRemoteSuccess();
    return rows;
  } catch {
    recordRemoteFailure();
    return null;
  }
}

const applyRemoteRows = async (
  rows: AppStateRow[],
  options?: { emitChanges?: boolean },
) => {
  const changedKeys = new Set<string>();
  const remoteKeys = new Set<string>();

  for (const row of rows) {
    remoteKeys.add(row.key);

    const remoteUpdatedAt = row.updatedAt ?? row.updated_at ?? new Date().toISOString();
    const existing = appStateCache.get(row.key);

    if (existing?.pending && existing.updatedAt >= remoteUpdatedAt) {
      continue;
    }

    const shouldUseRemote = !existing || existing.pending || remoteUpdatedAt > existing.updatedAt;
    if (!shouldUseRemote) {
      continue;
    }

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
    changedKeys.add(row.key);
  }

  for (const [key, existing] of Array.from(appStateCache.entries())) {
    if (existing.pending || remoteKeys.has(key)) {
      continue;
    }

    appStateCache.delete(key);
    await removeAppStateRecord(key);
    changedKeys.add(key);
  }

  if (options?.emitChanges) {
    changedKeys.forEach((key) => notifyStateChange(key));
  }
};

const refreshRemoteAppState = async (
  options?: { emitChanges?: boolean; force?: boolean },
) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  if (remoteRefreshPromise && !options?.force) {
    return remoteRefreshPromise;
  }

  remoteRefreshPromise = (async () => {
    const rows = await fetchRemoteAppState();
    if (rows) {
      await applyRemoteRows(rows, { emitChanges: options?.emitChanges });
    }
  })();

  try {
    await remoteRefreshPromise;
  } finally {
    remoteRefreshPromise = null;
  }
};

const startRemoteRefreshListeners = () => {
  if (refreshListenersStarted || typeof window === 'undefined') {
    return;
  }

  refreshListenersStarted = true;

  const triggerRefresh = () => {
    void refreshRemoteAppState({ emitChanges: true, force: true });
  };

  window.addEventListener('focus', triggerRefresh);
  window.addEventListener('online', triggerRefresh);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    });
  }
};

export async function hydrateAppState() {
  if (hydrated || hydrationPromise) {
    return hydrationPromise ?? Promise.resolve();
  }

  hydrationPromise = (async () => {
    await initializeOfflineSync();
    setHydrationStatus(true);

    await refreshRemoteAppState({ emitChanges: false, force: true });

    hydrated = true;
    setHydrationStatus(false);
    startRemoteRefreshListeners();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(APP_STATE_EVENT, { detail: { key: '__hydrated__' } }));
    }
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

export async function setAppState<T>(key: string, value: T) {
  const previous = appStateCache.get(key);
  const updatedAt = new Date().toISOString();

  appStateCache.set(key, { value, updatedAt, pending: true });
  await persistAppStateRecord({ key, value, updatedAt, pending: true });
  notifyStateChange(key);

  try {
    const res = await fetch('/api/db/app-state', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    appStateCache.set(key, { value, updatedAt, pending: false });
    await persistAppStateRecord({ key, value, updatedAt, pending: false });
    await refreshRemoteAppState({ emitChanges: true, force: true });
  } catch (error) {
    console.error(`Erro ao salvar app_state[${key}] na Vultr:`, error);

    if (previous) {
      appStateCache.set(key, previous);
      await persistAppStateRecord({
        key,
        value: previous.value,
        updatedAt: previous.updatedAt,
        pending: previous.pending,
      });
    } else {
      appStateCache.delete(key);
      await removeAppStateRecord(key);
    }

    notifyStateChange(key);
  }
}

export async function removeAppState(key: string) {
  const previous = appStateCache.get(key);
  appStateCache.delete(key);
  await removeAppStateRecord(key);
  notifyStateChange(key);

  try {
    const res = await fetch(`/api/db/app-state?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    await refreshRemoteAppState({ emitChanges: true, force: true });
  } catch (error) {
    console.error(`Erro ao remover app_state[${key}] da Vultr:`, error);

    if (previous) {
      appStateCache.set(key, previous);
      await persistAppStateRecord({
        key,
        value: previous.value,
        updatedAt: previous.updatedAt,
        pending: previous.pending,
      });
      notifyStateChange(key);
    }
  }
}

export function getCachedAppStateKeys() {
  return Array.from(appStateCache.keys());
}
