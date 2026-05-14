import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Only usable with a secret token to prevent public exposure
const DEBUG_SECRET = process.env.DEBUG_SECRET;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const email = req.nextUrl.searchParams.get('email');

  if (!DEBUG_SECRET || secret !== DEBUG_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: 'email param required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ found: false, email: normalizedEmail });
    }

    return NextResponse.json({
      found: true,
      email: user.email,
      userStatus: user.status,
      hasPasswordHash: !!user.passwordHash,
      membershipsCount: user.memberships.length,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        status: m.status,
        role: m.role,
        hasOrganizationId: !!m.organizationId,
        organizationId: m.organizationId,
        organizationStatus: m.organization?.status,
        organizationSlug: m.organization?.slug,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
