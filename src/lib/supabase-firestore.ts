import { supabase } from './supabaseClient';
import {
  enqueueMutation,
  getLocalTableSnapshot,
  getOfflineStatus,
  initializeOfflineSync,
  persistTableSnapshot,
  emitOfflineDataChange,
} from './offline-sync';

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

export const db = supabase;

export const collection = (_db: typeof supabase, tableName: string): CollectionRef => ({
  kind: 'collection',
  tableName,
});

export const doc = (_db: typeof supabase, tableName: string, id: string): DocRef => ({
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

const fetchRows = async (tableName: string, filters: WhereClause[] = []) => {
  const localSnapshot = await getLocalTableSnapshot(tableName);
  const localRows = applyFilters((localSnapshot?.rows ?? []) as Record<string, unknown>[], filters);

  if (!supabase || !currentOnlineState()) {
    return localRows;
  }

  let request = supabase.from(tableName).select('*');
  for (const filter of filters) {
    if (filter.op === '==') {
      request = request.eq(filter.field, filter.value as never);
    }
    if (filter.op === '!=') {
      request = request.neq(filter.field, filter.value as never);
    }
  }

  const { data, error } = await request;
  if (error) {
    console.error(`Supabase fetch error for ${tableName}:`, error);
    return localRows;
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map((row) => mapRowFromDb(tableName, row));
  await persistTableSnapshot(tableName, rows);
  return applyFilters(rows, filters);
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

  const refresh = async () => {
    try {
      if (!active) return;
      const resolved = resolveTarget(target);

      if ('id' in resolved) {
        const rows = await fetchRows(resolved.tableName, []);
        const row = rows.find((item) => String(item.id) === resolved.id) ?? null;
        (callback as (snapshot: DocSnapshot) => void)(buildDocSnapshot(row, resolved.id));
        return;
      }

      const rows = await fetchRows(resolved.tableName, resolved.filters);
      (callback as (snapshot: CollectionSnapshot) => void)(buildCollectionSnapshot(applyFilters(rows, resolved.filters)));
    } catch (error) {
      onError?.(error);
    }
  };

  void refresh();
  // Polling reduzido: mutacoes locais ja emitem 'barmate-offline-data-changed' imediatamente.
  // Polling serve apenas como fallback para mudancas remotas vindas de outros dispositivos.
  const interval = setInterval(() => {
    void refresh();
  }, 15000);

  const handleDataChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ tableName?: string }>;
    const tableName = customEvent.detail?.tableName;
    if (!tableName || tableName === target.tableName) {
      void refresh();
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

  if (!supabase || !currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'upsert',
      key: id,
      payload: dbPayload,
      updatedAt: String((dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString())),
    });
    return { id };
  }

  void supabase.from(reference.tableName).insert(dbPayload).then(({ error }) => {
    if (error) {
      console.error(`Erro ao inserir em ${reference.tableName}:`, error);
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'upsert',
        key: id,
        payload: dbPayload,
        updatedAt: String((dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString())),
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
  // Notifica listeners locais imediatamente (UI otimista, antes do supabase responder).
  emitOfflineDataChange(reference.tableName);

  if (!supabase || !currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'upsert',
      key: reference.id,
      payload: dbPayload,
      updatedAt: String((dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString())),
    });
    return;
  }

  // Fire-and-forget: nao bloqueia a UI esperando o roundtrip do Supabase.
  void supabase.from(reference.tableName).upsert(dbPayload).then(({ error }) => {
    if (error) {
      console.error(`Erro ao atualizar ${reference.tableName}:`, error);
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'upsert',
        key: reference.id,
        payload: dbPayload,
        updatedAt: String((dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString())),
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

  if (!supabase || !currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'upsert',
      key: reference.id,
      payload: dbPayload,
      updatedAt: String((dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString())),
    });
    return;
  }

  void supabase.from(reference.tableName).upsert(dbPayload).then(({ error }) => {
    if (error) {
      console.error(`Erro ao sincronizar ${reference.tableName}:`, error);
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'upsert',
        key: reference.id,
        payload: dbPayload,
        updatedAt: String((dbPayload.updated_at ?? dbPayload.updatedAt ?? new Date().toISOString())),
      });
    }
  });
};

export const deleteDoc = async (reference: DocRef) => {
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const nextRows = (localSnapshot?.rows ?? []).filter((row) => String(row.id) !== reference.id);
  await persistTableSnapshot(reference.tableName, nextRows);
  emitOfflineDataChange(reference.tableName);

  if (!supabase || !currentOnlineState()) {
    await enqueueMutation({
      tableName: reference.tableName,
      operation: 'delete',
      key: reference.id,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  void supabase.from(reference.tableName).delete().eq('id', reference.id).then(({ error }) => {
    if (error) {
      console.error(`Erro ao excluir ${reference.tableName}:`, error);
      void enqueueMutation({
        tableName: reference.tableName,
        operation: 'delete',
        key: reference.id,
        updatedAt: new Date().toISOString(),
      });
    }
  });
};

export const getDoc = async (reference: DocRef) => {
  if (!supabase || !currentOnlineState()) {
    const localSnapshot = await getLocalTableSnapshot(reference.tableName);
    const row = (localSnapshot?.rows ?? []).find((item) => String(item.id) === reference.id) ?? null;
    return buildDocSnapshot(row, reference.id);
  }

  const { data, error } = await supabase.from(reference.tableName).select('*').eq('id', reference.id).maybeSingle();
  if (error) {
    console.error(`Supabase getDoc error for ${reference.tableName}:`, error);
    const localSnapshot = await getLocalTableSnapshot(reference.tableName);
    const row = (localSnapshot?.rows ?? []).find((item) => String(item.id) === reference.id) ?? null;
    return buildDocSnapshot(row, reference.id);
  }

  const row = mapRowFromDb(reference.tableName, data as Record<string, unknown>);
  const localSnapshot = await getLocalTableSnapshot(reference.tableName);
  const nextRows = [...(localSnapshot?.rows ?? []).filter((item) => String(item.id) !== reference.id), row];
  await persistTableSnapshot(reference.tableName, nextRows);
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
