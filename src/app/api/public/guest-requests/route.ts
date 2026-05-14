import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createGuestRequest } from '@/lib/operational-db';

type GuestIntent = 'create' | 'view';

const asTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeIntent = (value: unknown): GuestIntent => {
  const raw = asTrimmed(value).toLowerCase();
  if (raw === 'view') return 'view';
  return 'create';
};

async function resolveOrganizationId(preferredOrgId: string | null): Promise<string | null> {
  if (preferredOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: preferredOrgId }, select: { id: true } });
    return org?.id ?? null;
  }

  const firstOrg = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return firstOrg?.id ?? null;
}

// POST /api/public/guest-requests
export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  const name = asTrimmed(body.name);
  const intent = normalizeIntent(body.intent);
  const tableLabel = asTrimmed(body.tableLabel) || null;
  const comandaNumber = asTrimmed(body.comandaNumber) || null;
  const organizationIdInput = asTrimmed(body.organizationId) || null;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const organizationId = await resolveOrganizationId(organizationIdInput);
  if (!organizationId) {
    return NextResponse.json({ error: 'organization not found' }, { status: 400 });
  }

  const requestData: Record<string, unknown> = {
    name,
    status: 'pending',
    intent,
    tableLabel,
    comandaNumber,
    requestedAt: new Date().toISOString(),
  };

  const id = await createGuestRequest(organizationId, {
    ...requestData,
    associatedOrderId: null,
  });

  return NextResponse.json({ id, status: 'pending' });
}
