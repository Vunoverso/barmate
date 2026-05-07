import {
  enqueueMutation,
  getLocalTableSnapshot,
  getOfflineStatus,
  hasPendingMutationsForTable,
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
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
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
      user_id: row.userId ?? row.user_id ?? null,
      is_shared: Boolean(row.isShared ?? row.is_shared ?? false),
      viewer_count: Number(row.viewerCount ?? row.viewer_count ?? 0),
      deleted_at: row.deletedAt ?? row.deleted_at ?? null,
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
  // Mantem rows locais quando elas sao mais novas que o remoto OU quando
  // ainda existem mutacoes pendentes para a tabela (write em transito).
  const hasPending = hasPendingMutationsForTable(tableName);
  for (const local of localRows) {
    const id = String(local.id);
    const remote = map.get(id);
    if (!remote) {
      // Linha so existe localmente: pode ser write otimista ainda nao replicado.
      // Mantem se ha pending ou se e recente (< 60s).
      const localStamp = rowUpdatedAt(local);
      if (hasPending || (localStamp && Date.now() - new Date(localStamp).getTime() < 60_000)) {
        map.set(id, local);
      }
      continue;
    }
    if (rowUpdatedAt(local) > rowUpdatedAt(remote)) {
      map.set(id, local);
    }
  }
  return Array.from(map.values());
};

const fetchRows = async (tableName: string, filters: WhereClause[] = []) => {
  const localSnapshot = await getLocalTableSnapshot(tableName);
  const localAll = (localSnapshot?.rows ?? []) as Record<string, unknown>[];
  const localFiltered = applyFilters(localAll, filters);

  if (!currentOnlineState()) {
    return localFiltered;
  }

  // Mapeia table name para o path da API
  const apiPath = tableName === 'open_orders' ? '/open-orders'
    : tableName === 'guest_requests' ? '/guest-requests'
    : null;

  if (!apiPath) return localFiltered;

  const result = await callApi(apiPath);
  if (!result.ok) {
    console.error(`API fetch error for ${tableName}`);
    return localFiltered;
  }

  const remoteRows = ((result.data ?? []) as Record<string, unknown>[]).map((row) => mapRowFromDb(tableName, row));
  const merged = mergeRowsPreferringLocal(tableName, remoteRows, localAll);
  await persistTableSnapshot(tableName, merged, { silent: true });
  return applyFilters(merged, filters);
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

  // Primeira leitura remota.
  void refresh(false);

  // Polling a cada 15s para sincronizar dados entre dispositivos
  const interval = setInterval(() => {
    void refresh(false);
  }, 15000);

  const handleDataChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ tableName?: string }>;
    const evtTable = customEvent.detail?.tableName;
    if (!evtTable || evtTable === tableName) {
      void refresh(true);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('barmate-offline-data-changed', handleDataChange);
    window.addEventListener('barmate-offline-status-changed', handleDataChange);
  }

  return () => {
    active = false;
    clearInterval(interval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('barmate-offline-data-changed', handleDataChange);
      window.removeEventListener('barmate-offline-status-changed', handleDataChange);
    }
  };
}

export const addDoc = async (reference: CollectionRef, data: Record<string, unknown>) => {
  const id = generateId();
  const payload = { id, ...data };
  const dbPayload = mapRowToDb(reference.tableName, payload);
  const localRow = mapRowFromDb(reference.tableName, dbPayload) as Record<string, unknown>;
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const nextRows = [...(localSnapshot?.rows ?? []).filter((row) => String(row.id) !== id), localRow];
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  const apiPath = reference.tableName === 'open_orders' ? '/open-orders' : `/${reference.tableName}`;
  const updatedAt = String(dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString());

  if (!currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'upsert',
      key: id,
      payload: dbPayload,
      updatedAt,
    });
    return { id };
  }

  void callApi(apiPath, { method: 'POST', body: JSON.stringify(dbPayload) }).then((result) => {
    if (!result.ok) {
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'upsert',
        key: id,
        payload: dbPayload,
        updatedAt,
      });
    }
  });
  return { id };
};

export const setDoc = async (reference: DocRef, data: Record<string, unknown>, options?: { merge?: boolean }) => {
  let payload = { id: reference.id, ...data };
  if (options?.merge) {
    const localSnapshot = await getLocalTableSnapshot(reference.tableName);
    const existing = localSnapshot?.rows.find((row) => String(row.id) === reference.id) ?? null;
    payload = { ...(existing ?? {}), ...payload };
  }

  const dbPayload = mapRowToDb(reference.tableName, payload);
  const localRow = mapRowFromDb(reference.tableName, dbPayload) as Record<string, unknown>;
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const nextRows = [...(localSnapshot?.rows ?? []).filter((row) => String(row.id) !== reference.id), localRow];
  await persistTableSnapshot(reference.tableName, nextRows);
  // Notifica listeners locais imediatamente (UI otimista).
  emitOfflineDataChange(reference.tableName);

  const apiPath = reference.tableName === 'open_orders' ? '/open-orders' : `/${reference.tableName}`;
  const updatedAt = String(dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString());

  if (!currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'upsert',
      key: reference.id,
      payload: dbPayload,
      updatedAt,
    });
    return;
  }

  void callApi(apiPath, { method: 'POST', body: JSON.stringify(dbPayload) }).then((result) => {
    if (!result.ok) {
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'upsert',
        key: reference.id,
        payload: dbPayload,
        updatedAt,
      });
    }
  });
};

export const updateDoc = async (reference: DocRef, data: Record<string, unknown>) => {
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
  const nextRows = [...(localSnapshot?.rows ?? []).filter((row) => String(row.id) !== reference.id), localRow];
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  const apiPathUpd = reference.tableName === 'open_orders' ? '/open-orders' : `/${reference.tableName}`;
  const updatedAtUpd = String(dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString());

  if (!currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'upsert',
      key: reference.id,
      payload: dbPayload,
      updatedAt: updatedAtUpd,
    });
    return;
  }

  void callApi(apiPathUpd, { method: 'POST', body: JSON.stringify(dbPayload) }).then((result) => {
    if (!result.ok) {
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'upsert',
        key: reference.id,
        payload: dbPayload,
        updatedAt: updatedAtUpd,
      });
    }
  });
};

export const deleteDoc = async (reference: DocRef) => {
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const nextRows = (localSnapshot?.rows ?? []).filter((row) => String(row.id) !== reference.id);
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  const apiPathDel = reference.tableName === 'open_orders'
    ? `/open-orders?id=${encodeURIComponent(reference.id)}`
    : `/${reference.tableName}?id=${encodeURIComponent(reference.id)}`;
  const updatedAtDel = new Date().toISOString();

  if (!currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'delete',
      key: reference.id,
      updatedAt: updatedAtDel,
    });
    return;
  }

  void callApi(apiPathDel, { method: 'DELETE' }).then((result) => {
    if (!result.ok) {
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'delete',
        key: reference.id,
        updatedAt: updatedAtDel,
      });
    }
  });
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
