import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT now()`;
    const userCount = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      time: result[0]?.now,
      userCount,
      dbUrl: process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: msg,
      dbUrl: process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'),
    }, { status: 500 });
  }
}
