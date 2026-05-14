import {
  getLocalTableSnapshot,
  getOfflineStatus,
  initializeOfflineSync,
  persistTableSnapshot,
  emitOfflineDataChange,
} from './offline-sync';

/** Chama nossas API routes de banco de dados */
async function callApi(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data?: unknown }> {
  try {
    const res = await fetch(`/api/db${path}`, {
      ...options,
      cache: 'no-store',
      credentials: 'include',
      headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
    if (!res.ok) return { ok: false };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false };
  }
}

type WhereClause = {
  field: string;
  op: '==' | '!=';
  value: unknown;
};

type CollectionRef = {
  kind: 'collection';
  tableName: string;
};

type DocRef = {
  kind: 'doc';
  tableName: string;
  id: string;
};

type QueryRef = {
  kind: 'query';
  tableName: string;
  filters: WhereClause[];
};

type SnapshotDoc = {
  id: string;
  data: () => any;
};

type CollectionSnapshot = {
  docs: SnapshotDoc[];
  size: number;
};

type DocSnapshot = {
  id: string;
  exists: () => boolean;
  data: () => any;
};

const toIsoString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  return value;
};

const mapRowFromDb = (tableName: string, row: Record<string, unknown>) => {
  if (tableName === 'open_orders') {
    return {
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      viewerCount: row.viewer_count ?? row.viewerCount ?? 0,
      isShared: row.is_shared ?? row.isShared ?? false,
      clientId: row.client_id ?? row.clientId ?? null,
      clientName: row.client_name ?? row.clientName ?? null,
      tableId: row.table_id ?? row.tableId ?? null,
      tableLabel: row.table_label ?? row.tableLabel ?? null,
      comandaNumber: row.comanda_number ?? row.comandaNumber ?? null,
      customerStatus: row.customer_status ?? row.customerStatus ?? null,
      orderOrigin: row.order_origin ?? row.orderOrigin ?? null,
      chatMessages: row.chat_messages ?? row.chatMessages ?? [],
      organizationId: row.organization_id ?? row.organizationId ?? null,
      deletedAt: row.deleted_at ?? row.deletedAt ?? null,
    };
  }

  if (tableName === 'guest_requests') {
    return {
      ...row,
      associatedOrderId: row.associated_order_id ?? row.associatedOrderId ?? null,
      requestedAt: row.requested_at ?? row.requestedAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      tableId: row.table_id ?? row.tableId ?? null,
      tableLabel: row.table_label ?? row.tableLabel ?? null,
      comandaNumber: row.comanda_number ?? row.comandaNumber ?? null,
      organizationId: row.organization_id ?? row.organizationId ?? null,
    };
  }

  return row;
};

const mapRowToDb = (tableName: string, row: Record<string, unknown>) => {
  if (tableName === 'open_orders') {
    return {
      id: row.id,
      name: row.name,
      organization_id: row.organizationId ?? row.organization_id ?? null,
      created_at: toIsoString(row.createdAt ?? row.created_at ?? new Date().toISOString()),
      updated_at: toIsoString(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
      items: row.items ?? [],
      status: row.status ?? null,
      client_id: row.clientId ?? row.client_id ?? null,
      client_name: row.clientName ?? row.client_name ?? null,
      table_id: row.tableId ?? row.table_id ?? null,
      table_label: row.tableLabel ?? row.table_label ?? null,
      comanda_number: row.comandaNumber ?? row.comanda_number ?? null,
      customer_status: row.customerStatus ?? row.customer_status ?? null,
      order_origin: row.orderOrigin ?? row.order_origin ?? null,
      chat_messages: row.chatMessages ?? row.chat_messages ?? [],
      user_id: row.userId ?? row.user_id ?? null,
      is_shared: Boolean(row.isShared ?? row.is_shared ?? false),
      viewer_count: Number(row.viewerCount ?? row.viewer_count ?? 0),
      deleted_at: row.deletedAt ?? row.deleted_at ?? null,
      data: row.data ?? null,
    };
  }

  if (tableName === 'guest_requests') {
    return {
      id: row.id,
      name: row.name,
      organization_id: row.organizationId ?? row.organization_id ?? null,
      status: row.status ?? 'pending',
      intent: row.intent ?? 'view',
      associated_order_id: row.associatedOrderId ?? row.associated_order_id ?? null,
      table_id: row.tableId ?? row.table_id ?? null,
      table_label: row.tableLabel ?? row.table_label ?? null,
      comanda_number: row.comandaNumber ?? row.comanda_number ?? null,
      cart_items: row.cartItems ?? row.cart_items ?? null,
      request_type: row.requestType ?? row.request_type ?? null,
      message: row.message ?? null,
      requested_at: toIsoString(row.requestedAt ?? row.requested_at ?? new Date().toISOString()),
      updated_at: toIsoString(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
    };
  }

  if (tableName === 'app_state') {
    return {
      key: row.key,
      value: row.value,
      updated_at: toIsoString(row.updated_at ?? new Date().toISOString()),
    };
  }

  return row;
};

export const db = true; // compatibilidade: indica que o cliente DB está disponível

export const collection = (_db: unknown, tableName: string): CollectionRef => ({
  kind: 'collection',
  tableName,
});

export const doc = (_db: unknown, tableName: string, id: string): DocRef => ({
  kind: 'doc',
  tableName,
  id,
});

export const where = (field: string, op: WhereClause['op'], value: unknown): WhereClause => ({
  field,
  op,
  value,
});

export const query = (reference: CollectionRef, ...filters: WhereClause[]): QueryRef => ({
  kind: 'query',
  tableName: reference.tableName,
  filters,
});

export const serverTimestamp = () => new Date().toISOString();

export const increment = (amount: number) => ({
  __op: 'increment' as const,
  amount,
});

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeValue = (value: unknown): unknown => {
  if (value && typeof value === 'object' && '__op' in (value as Record<string, unknown>)) {
    return value;
  }
  return value;
};

const currentOnlineState = () => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine && getOfflineStatus().isOnline;
};

const REMOTE_REFRESH_VISIBLE_MS = 4_000;
const REMOTE_REFRESH_HIDDEN_MS = 20_000;
const RECENT_LOCAL_WRITE_TTL_MS = 15_000;

const getRemoteRefreshDelay = () => {
  if (typeof document === 'undefined') {
    return REMOTE_REFRESH_VISIBLE_MS;
  }

  return document.visibilityState === 'hidden'
    ? REMOTE_REFRESH_HIDDEN_MS
    : REMOTE_REFRESH_VISIBLE_MS;
};

const getApiPath = (tableName: string) => (
  tableName === 'open_orders' ? '/open-orders'
    : tableName === 'guest_requests' ? '/guest-requests'
    : null
);

const applyFilters = (rows: Record<string, unknown>[], filters: WhereClause[]) => {
  return rows.filter((row) => filters.every((filter) => {
    const current = row[filter.field];
    if (filter.op === '==') return current === filter.value;
    if (filter.op === '!=') return current !== filter.value;
    return true;
  }));
};

const rowUpdatedAt = (row: Record<string, unknown> | null | undefined) => {
  if (!row) return '';
  const value = (row as any).updatedAt ?? (row as any).updated_at;
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : '';
};

const mergeRowsPreferringLocal = (
  tableName: string,
  remoteRows: Record<string, unknown>[],
  localRows: Record<string, unknown>[],
) => {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of remoteRows) {
    map.set(String(row.id), row);
  }
  for (const local of localRows) {
    const id = String(local.id);
    const remote = map.get(id);
    const localStamp = rowUpdatedAt(local);
    const isRecentLocalWrite = Boolean(
      localStamp && Date.now() - new Date(localStamp).getTime() < RECENT_LOCAL_WRITE_TTL_MS,
    );
    
    // CRÍTICO: Não ressuscita rows deletadas (soft delete com deletedAt)
    const isLocalDeleted = (local as any).deletedAt ?? (local as any).deleted_at;
    if (isLocalDeleted) {
      // Se foi deletado localmente, remove do mapa (mesmo que exista remoto)
      map.delete(id);
      continue;
    }
    
    if (!remote) {
      // Linha so existe localmente: mantem somente enquanto o write otimista ainda e recente.
      if (isRecentLocalWrite) {
        map.set(id, local);
      }
      continue;
    }

    if (isRecentLocalWrite && rowUpdatedAt(local) > rowUpdatedAt(remote)) {
      map.set(id, local);
    }
  }
  return Array.from(map.values());
};

const fetchServerRows = async (tableName: string) => {
  const apiPath = getApiPath(tableName);
  if (!apiPath) {
    return null;
  }

  const result = await callApi(apiPath, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!result.ok) {
    console.error(`API fetch error for ${tableName}`);
    return null;
  }

  return ((result.data ?? []) as Record<string, unknown>[]).map((row) => mapRowFromDb(tableName, row));
};

const replaceSnapshotWithServerRows = async (tableName: string) => {
  const remoteRows = await fetchServerRows(tableName);
  if (!remoteRows) {
    return false;
  }

  const finalRows = tableName === 'open_orders'
    ? remoteRows.filter((row) => !(row as any).deletedAt && !(row as any).deleted_at)
    : remoteRows;

  await persistTableSnapshot(tableName, finalRows, { silent: true });
  emitOfflineDataChange(tableName);
  return true;
};

const fetchRows = async (tableName: string, filters: WhereClause[] = []) => {
  const localSnapshot = await getLocalTableSnapshot(tableName);
  const localAll = (localSnapshot?.rows ?? []) as Record<string, unknown>[];
  const localFiltered = applyFilters(localAll, filters);

  if (!currentOnlineState()) {
    // Filtra deletadas localmente também
    if (tableName === 'open_orders') {
      return localFiltered.filter(row => !(row as any).deletedAt && !(row as any).deleted_at);
    }
    return localFiltered;
  }

  const remoteRows = await fetchServerRows(tableName);
  if (!remoteRows) {
    // Filtra deletadas mesmo quando offline
    if (tableName === 'open_orders') {
      return localFiltered.filter(row => !(row as any).deletedAt && !(row as any).deleted_at);
    }
    return localFiltered;
  }
  const merged = mergeRowsPreferringLocal(tableName, remoteRows, localAll);
  
  // Filtra deletadas após merge
  let finalRows = merged;
  if (tableName === 'open_orders') {
    finalRows = merged.filter(row => !(row as any).deletedAt && !(row as any).deleted_at);
  }
  
  await persistTableSnapshot(tableName, finalRows, { silent: true });
  return applyFilters(finalRows, filters);
};

const readLocalRows = async (tableName: string, filters: WhereClause[] = []) => {
  const localSnapshot = await getLocalTableSnapshot(tableName);
  return applyFilters((localSnapshot?.rows ?? []) as Record<string, unknown>[], filters);
};

const buildCollectionSnapshot = (rows: Record<string, unknown>[]): CollectionSnapshot => ({
  docs: rows.map((row) => ({
    id: String(row.id),
    data: () => row,
  })),
  size: rows.length,
});

const buildDocSnapshot = (row: Record<string, unknown> | null | undefined, id = ''): DocSnapshot => ({
  id,
  exists: () => Boolean(row),
  data: () => row ?? undefined,
});

const resolveTarget = (target: CollectionRef | QueryRef | DocRef) => {
  if (target.kind === 'collection') {
    return { tableName: target.tableName, filters: [] as WhereClause[] };
  }
  if (target.kind === 'query') {
    return { tableName: target.tableName, filters: target.filters };
  }
  return { tableName: target.tableName, id: target.id };
};

export function onSnapshot(target: DocRef, callback: (snapshot: DocSnapshot) => void, onError?: (error: unknown) => void): () => void;
export function onSnapshot(target: CollectionRef | QueryRef, callback: (snapshot: CollectionSnapshot) => void, onError?: (error: unknown) => void): () => void;
export function onSnapshot(
  target: CollectionRef | QueryRef | DocRef,
  callback: ((snapshot: DocSnapshot) => void) | ((snapshot: CollectionSnapshot) => void),
  onError?: (error: unknown) => void,
): () => void {
  let active = true;
  let interval: number | null = null;
  void initializeOfflineSync();

  const resolved = resolveTarget(target);
  const tableName = resolved.tableName;

  const refresh = async (localOnly = false) => {
    try {
      if (!active) return;

      if ('id' in resolved) {
        const rows = localOnly
          ? await readLocalRows(tableName)
          : await fetchRows(tableName, []);
        const row = rows.find((item) => String(item.id) === resolved.id) ?? null;
        (callback as (snapshot: DocSnapshot) => void)(buildDocSnapshot(row, resolved.id));
        return;
      }

      const rows = localOnly
        ? await readLocalRows(tableName, resolved.filters)
        : await fetchRows(tableName, resolved.filters);
      (callback as (snapshot: CollectionSnapshot) => void)(buildCollectionSnapshot(applyFilters(rows, resolved.filters)));
    } catch (error) {
      onError?.(error);
    }
  };

  const scheduleRemoteRefresh = () => {
    if (!active || typeof window === 'undefined') {
      return;
    }

    if (interval != null) {
      window.clearTimeout(interval);
    }

    interval = window.setTimeout(async () => {
      await refresh(false);
      scheduleRemoteRefresh();
    }, getRemoteRefreshDelay());
  };

  const triggerRemoteRefresh = () => {
    void refresh(false).finally(() => {
      scheduleRemoteRefresh();
    });
  };

  // Primeira leitura remota.
  triggerRemoteRefresh();

  const handleDataChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ tableName?: string }>;
    const evtTable = customEvent.detail?.tableName;
    if (!evtTable || evtTable === tableName) {
      void refresh(true);
    }
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      triggerRemoteRefresh();
      return;
    }

    scheduleRemoteRefresh();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('barmate-offline-data-changed', handleDataChange);
    window.addEventListener('barmate-offline-status-changed', handleDataChange);
    window.addEventListener('focus', triggerRemoteRefresh);
    window.addEventListener('online', triggerRemoteRefresh);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    active = false;
    if (interval != null && typeof window !== 'undefined') {
      window.clearTimeout(interval);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('barmate-offline-data-changed', handleDataChange);
      window.removeEventListener('barmate-offline-status-changed', handleDataChange);
      window.removeEventListener('focus', triggerRemoteRefresh);
      window.removeEventListener('online', triggerRemoteRefresh);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

export const addDoc = async (reference: CollectionRef, data: Record<string, unknown>) => {
  if (!currentOnlineState()) {
    console.error(`Sem conexão com a Vultr para criar ${reference.tableName}.`);
    return { id: '' };
  }

  const id = generateId();
  const payload = { id, ...data };
  const dbPayload = mapRowToDb(reference.tableName, payload);
  const localRow = mapRowFromDb(reference.tableName, dbPayload) as Record<string, unknown>;
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const previousRows = [...(localSnapshot?.rows ?? [])] as Record<string, unknown>[];
  const nextRows = [...previousRows.filter((row) => String(row.id) !== id), localRow];
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  const apiPath = getApiPath(reference.tableName) ?? `/${reference.tableName}`;
  const result = await callApi(apiPath, { method: 'POST', body: JSON.stringify(dbPayload) });

  if (!result.ok) {
    console.error(`Falha ao salvar ${reference.tableName} na Vultr.`);
    await persistTableSnapshot(reference.tableName, previousRows, { silent: true });
    emitOfflineDataChange(reference.tableName);
    return { id };
  }

  await replaceSnapshotWithServerRows(reference.tableName);
  return { id };
};

export const setDoc = async (reference: DocRef, data: Record<string, unknown>, options?: { merge?: boolean }) => {
  if (!currentOnlineState()) {
    console.error(`Sem conexão com a Vultr para salvar ${reference.tableName}.`);
    return;
  }

  let payload = { id: reference.id, ...data };
  if (options?.merge) {
    const localSnapshot = await getLocalTableSnapshot(reference.tableName);
    const existing = localSnapshot?.rows.find((row) => String(row.id) === reference.id) ?? null;
    payload = { ...(existing ?? {}), ...payload };
  }

  const dbPayload = mapRowToDb(reference.tableName, payload);
  const localRow = mapRowFromDb(reference.tableName, dbPayload) as Record<string, unknown>;
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const previousRows = [...(localSnapshot?.rows ?? [])] as Record<string, unknown>[];
  const nextRows = [...previousRows.filter((row) => String(row.id) !== reference.id), localRow];
  await persistTableSnapshot(reference.tableName, nextRows);
  // Notifica listeners locais imediatamente (UI otimista).
  emitOfflineDataChange(reference.tableName);

  const apiPath = getApiPath(reference.tableName) ?? `/${reference.tableName}`;
  const result = await callApi(apiPath, { method: 'POST', body: JSON.stringify(dbPayload) });

  if (!result.ok) {
    console.error(`Falha ao atualizar ${reference.tableName} na Vultr.`);
    await persistTableSnapshot(reference.tableName, previousRows, { silent: true });
    emitOfflineDataChange(reference.tableName);
    return;
  }

  await replaceSnapshotWithServerRows(reference.tableName);
};

export const updateDoc = async (reference: DocRef, data: Record<string, unknown>) => {
  if (!currentOnlineState()) {
    console.error(`Sem conexão com a Vultr para atualizar ${reference.tableName}.`);
    return;
  }

  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const existing = localSnapshot?.rows.find((row) => String(row.id) === reference.id) ?? {};
  const nextData = { ...existing, ...data } as Record<string, unknown>;

  for (const [key, value] of Object.entries(nextData)) {
    if (value && typeof value === 'object' && '__op' in value) {
      const operation = value as { __op: 'increment'; amount: number };
      const current = Number((existing as Record<string, unknown> | null)?.[key] || 0);
      nextData[key] = current + operation.amount;
    }
  }

  const dbPayload = mapRowToDb(reference.tableName, nextData);
  const localRow = mapRowFromDb(reference.tableName, dbPayload) as Record<string, unknown>;
  const previousRows = [...(localSnapshot?.rows ?? [])] as Record<string, unknown>[];
  const nextRows = [...previousRows.filter((row) => String(row.id) !== reference.id), localRow];
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  const apiPath = getApiPath(reference.tableName) ?? `/${reference.tableName}`;
  const result = await callApi(apiPath, { method: 'POST', body: JSON.stringify(dbPayload) });

  if (!result.ok) {
    console.error(`Falha ao sincronizar ${reference.tableName} na Vultr.`);
    await persistTableSnapshot(reference.tableName, previousRows, { silent: true });
    emitOfflineDataChange(reference.tableName);
    return;
  }

  await replaceSnapshotWithServerRows(reference.tableName);
};

export const deleteDoc = async (reference: DocRef) => {
  if (!currentOnlineState()) {
    console.error(`Sem conexão com a Vultr para excluir ${reference.tableName}.`);
    return;
  }

  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const previousRows = [...(localSnapshot?.rows ?? [])] as Record<string, unknown>[];
  const nextRows = previousRows.filter((row) => String(row.id) !== reference.id);
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  const apiPathDel = reference.tableName === 'open_orders'
    ? `/open-orders?id=${encodeURIComponent(reference.id)}`
    : reference.tableName === 'guest_requests'
    ? `/guest-requests?id=${encodeURIComponent(reference.id)}`
    : `/${reference.tableName}?id=${encodeURIComponent(reference.id)}`;
  const result = await callApi(apiPathDel, { method: 'DELETE' });

  if (!result.ok) {
    console.error(`Falha ao excluir ${reference.tableName} na Vultr.`);
    await persistTableSnapshot(reference.tableName, previousRows, { silent: true });
    emitOfflineDataChange(reference.tableName);
    return;
  }

  await replaceSnapshotWithServerRows(reference.tableName);
};

export const getDoc = async (reference: DocRef) => {
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const localRow = (localSnapshot?.rows ?? []).find((item) => String(item.id) === reference.id) ?? null;

  if (!currentOnlineState()) {
    return buildDocSnapshot(localRow, reference.id);
  }

  // Busca via fetchRows (que já cacheia o snapshot completo)
  const allRows = await fetchRows(reference.tableName, []);
  const row = allRows.find((item) => String(item.id) === reference.id) ?? localRow;
  return buildDocSnapshot(row, reference.id);
};

export const getDocs = async (reference: CollectionRef | QueryRef) => {
  const resolved = resolveTarget(reference);
  const filters = resolved.filters ?? [];
  if (filters.length > 0 || currentOnlineState()) {
    const rows = await fetchRows(resolved.tableName, filters);
    return buildCollectionSnapshot(rows);
  }

  const localSnapshot = await getLocalTableSnapshot(resolved.tableName);
  const rows = applyFilters((localSnapshot?.rows ?? []) as Record<string, unknown>[], filters);
  return buildCollectionSnapshot(rows);
};

export const writeBatch = () => ({
  set: () => undefined,
  update: () => undefined,
  delete: () => undefined,
  commit: async () => undefined,
});
