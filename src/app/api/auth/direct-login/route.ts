import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const isActive = (value: unknown) => String(value ?? '').trim().toLowerCase() === 'active';

export async function POST(request: Request) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ message: 'Autenticacao indisponivel.' }, { status: 500 });
  }

  try {
    const payload = loginSchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user?.passwordHash || !isActive(user.status)) {
      return NextResponse.json({ message: 'Email ou senha invalidos.' }, { status: 401 });
    }

    const passwordMatches = await compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ message: 'Email ou senha invalidos.' }, { status: 401 });
    }

    const membership = user.memberships.find((item) => isActive(item.status)) ?? user.memberships[0];
    if (!membership?.organizationId) {
      return NextResponse.json({ message: 'Usuario sem organizacao ativa.' }, { status: 403 });
    }

    const token = await encode({
      secret,
      maxAge: SESSION_MAX_AGE_SECONDS,
      token: {
        sub: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        picture: user.image,
        organizationId: membership.organizationId,
        role: membership.role,
      },
    });

    const response = NextResponse.json({ ok: true, callbackUrl: '/dashboard' });
    const secure = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    };

    response.cookies.set('next-auth.session-token', token, cookieOptions);
    if (secure) {
      response.cookies.set('__Secure-next-auth.session-token', token, cookieOptions);
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dados invalidos.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Falha ao autenticar.' }, { status: 500 });
  }
}