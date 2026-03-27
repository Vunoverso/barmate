import { db } from './firebase';
import {
  collection, doc, onSnapshot, updateDoc, deleteDoc,
  setDoc, getDoc, query, orderBy,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

export interface OrgDoc {
  id: string;
  tradeName: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerId?: string;
  planId: 'trial' | 'essential' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'past_due';
  createdAt: string;
  updatedAt?: string;
  trialEndsAt?: string;
}

export interface TicketDoc {
  id: string;
  org: string;
  orgId: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
}

export interface CancellationDoc {
  id: string;
  org: string;
  orgId: string;
  reason: string;
  status: 'pending' | 'reversed' | 'processed';
  ltv: number;
  createdAt: string;
}

export interface AdminSettings {
  essentialPrice: number;
  proPrice: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  autoBackup: boolean;
}

const PLAN_PRICES: Record<string, number> = {
  trial: 0,
  essential: 99,
  pro: 199,
  enterprise: 499,
};

export const DEFAULT_SETTINGS: AdminSettings = {
  essentialPrice: 99,
  proPrice: 199,
  maintenanceMode: false,
  allowNewRegistrations: true,
  autoBackup: true,
};

export function computeMRR(orgs: OrgDoc[]): number {
  return orgs
    .filter(o => o.status === 'active')
    .reduce((sum, o) => sum + (PLAN_PRICES[o.planId] ?? 0), 0);
}

export function computeConversionRate(orgs: OrgDoc[]): number {
  const paid = orgs.filter(o => o.planId !== 'trial' && o.status === 'active').length;
  if (!orgs.length) return 0;
  return Math.round((paid / orgs.length) * 100);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${days}d atrás`;
}

// ─── Organizations ────────────────────────────────────────────────────────────

export function subscribeToOrganizations(cb: (orgs: OrgDoc[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgDoc))),
    err => console.error('Orgs subscription error:', err),
  );
}

export async function updateOrganizationStatus(orgId: string, status: string) {
  if (!db) return;
  await updateDoc(doc(db, 'organizations', orgId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOrganizationData(orgId: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'organizations', orgId));
}

// ─── Support Tickets ──────────────────────────────────────────────────────────

export function subscribeToTickets(cb: (tickets: TicketDoc[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketDoc))),
    err => console.error('Tickets subscription error:', err),
  );
}

export async function updateTicketStatus(ticketId: string, status: string) {
  if (!db) return;
  await updateDoc(doc(db, 'tickets', ticketId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

// ─── Cancellations ────────────────────────────────────────────────────────────

export function subscribeToCancellations(
  cb: (items: CancellationDoc[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, 'cancellations'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CancellationDoc))),
    err => console.error('Cancellations subscription error:', err),
  );
}

export async function updateCancellationStatus(id: string, status: string) {
  if (!db) return;
  await updateDoc(doc(db, 'cancellations', id), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

// ─── Admin Settings ───────────────────────────────────────────────────────────

export async function getAdminSettings(): Promise<AdminSettings> {
  if (!db) return { ...DEFAULT_SETTINGS };
  const snap = await getDoc(doc(db, 'adminConfig', 'global'));
  return snap.exists()
    ? ({ ...DEFAULT_SETTINGS, ...snap.data() } as AdminSettings)
    : { ...DEFAULT_SETTINGS };
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'adminConfig', 'global'), settings, { merge: true });
}
