import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const handleDbError = (error: unknown, action: string) => {
  console.error(`[api/db/app-state] ${action} failed`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const isConnectivityIssue = error.code === 'P1001' || error.code === 'P1002';
    return NextResponse.json(
      { error: isConnectivityIssue ? 'Database unavailable' : 'Database request failed', code: error.code },
      { status: isConnectivityIssue ? 503 : 500 },
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
};

// GET /api/db/app-state — retorna todos os registros da org
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = session.user.organizationId;

    const rows = await prisma.appState.findMany({
      where: { organizationId: orgId },
      select: { key: true, value: true, updatedAt: true },
    });

    return NextResponse.json(rows);
  } catch (error) {
    return handleDbError(error, 'get app state');
  }
}

// POST /api/db/app-state — upsert de um registro
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = session.user.organizationId;

    const body = await req.json();
    const { key, value } = body as { key: string; value: unknown };

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    await prisma.appState.upsert({
      where: { organizationId_key: { organizationId: orgId, key } },
      update: { value: value as never, updatedAt: new Date() },
      create: { key, organizationId: orgId, value: value as never },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error, 'upsert app state');
  }
}

// DELETE /api/db/app-state?key=xxx — remove um registro
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = session.user.organizationId;

    const key = req.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    await prisma.appState.deleteMany({
      where: { key, organizationId: orgId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error, 'delete app state');
  }
}
