import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  tradeName: z.string().min(2),
  legalName: z.string().optional(),
  document: z.string().optional(),
});

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = registerSchema.parse(json);

    const email = payload.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: 'Email ja cadastrado.' }, { status: 409 });
    }

    const passwordHash = await hash(payload.password, 10);
    const baseSlug = slugify(payload.tradeName || payload.legalName || payload.name) || 'organizacao';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          legalName: payload.legalName || payload.tradeName,
          tradeName: payload.tradeName,
          document: payload.document,
          slug: uniqueSlug,
          status: 'TRIAL',
        },
      });

      const user = await tx.user.create({
        data: {
          name: payload.name,
          email,
          passwordHash,
          status: 'active',
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
          status: 'active',
        },
      });

      return { organization, user, membership };
    });

    return NextResponse.json({
      ok: true,
      userId: result.user.id,
      organizationId: result.organization.id,
      membershipId: result.membership.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dados invalidos.', issues: error.issues }, { status: 400 });
    }

    console.error('Falha ao criar conta:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Email ou organizacao ja cadastrados.' }, { status: 409 });
      }

      if (error.code === 'P2021' || error.code === 'P2022') {
        return NextResponse.json({ message: 'Banco de login ainda nao esta pronto. Rode a migration de auth no Supabase.' }, { status: 503 });
      }

      if (['P1000', 'P1001', 'P1002', 'P1013'].includes(error.code)) {
        return NextResponse.json({ message: 'Banco de login nao conectou. Confira DATABASE_URL na Vercel.' }, { status: 503 });
      }
    }

    return NextResponse.json({ message: 'Falha ao criar conta.' }, { status: 500 });
  }
}