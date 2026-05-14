import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export type ApiSessionContext = {
  userId: string;
  organizationId: string;
  role?: string;
};

export async function getApiSessionContext(req: NextRequest): Promise<ApiSessionContext | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch((error) => {
    console.error('[api-session] JWT decode failed:', error);
    return null;
  });
  const organizationId = typeof token?.organizationId === 'string' ? token.organizationId : '';
  const userId = typeof token?.userId === 'string'
    ? token.userId
    : typeof token?.sub === 'string'
      ? token.sub
      : '';

  if (!userId || !organizationId) {
    return null;
  }

  return {
    userId,
    organizationId,
    role: typeof token?.role === 'string' ? token.role : undefined,
  };
}

export const unauthorizedResponse = () => (
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
);

export const serverErrorResponse = (label: string, error: unknown) => {
  console.error(`[api-db] ${label}`, error);
  return NextResponse.json({ error: 'Database operation failed' }, { status: 503 });
};
