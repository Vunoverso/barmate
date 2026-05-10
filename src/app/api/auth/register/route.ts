import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
      let organization = null as Awaited<ReturnType<typeof tx.organization.create>> | null;
      const organizationData = {
        legalName: payload.legalName || payload.tradeName,
        tradeName: payload.tradeName,
        document: payload.document,
        slug: uniqueSlug,
      };

      // Compatibilidade com bases antigas que podem restringir valores de status.
      const statusCandidates = ['TRIAL', 'ACTIVE', 'active'] as const;
      let lastOrgError: unknown = null;

      for (const status of statusCandidates) {
        try {
          organization = await tx.organization.create({
            data: {
              ...organizationData,
              status,
            },
          });
          break;
        } catch (error) {
          lastOrgError = error;
        }
      }

      if (!organization) {
        throw lastOrgError ?? new Error('Falha ao criar organizacao.');
      }

      let user = null as Awaited<ReturnType<typeof tx.user.create>> | null;
      const userStatusCandidates = ['active', 'ACTIVE'] as const;
      let lastUserError: unknown = null;

      for (const status of userStatusCandidates) {
        try {
          user = await tx.user.create({
            data: {
              name: payload.name,
              email,
              passwordHash,
              status,
            },
          });
          break;
        } catch (error) {
          lastUserError = error;
        }
      }

      if (!user) {
        throw lastUserError ?? new Error('Falha ao criar usuario.');
      }

      let membership = null as Awaited<ReturnType<typeof tx.membership.create>> | null;
      const membershipStatusCandidates = ['active', 'ACTIVE'] as const;
      let lastMembershipError: unknown = null;

      for (const status of membershipStatusCandidates) {
        try {
          membership = await tx.membership.create({
            data: {
              organizationId: organization.id,
              userId: user.id,
              role: 'OWNER',
              status,
            },
          });
          break;
        } catch (error) {
          lastMembershipError = error;
        }
      }

      if (!membership) {
        throw lastMembershipError ?? new Error('Falha ao criar vinculo do usuario.');
      }

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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const isConnectivityIssue = error.code === 'P1001' || error.code === 'P1002';
      return NextResponse.json(
        {
          message: isConnectivityIssue ? 'Servico temporariamente indisponivel.' : 'Falha ao criar conta.',
          reason: isConnectivityIssue ? 'database_unavailable' : 'database_known_error',
          code: error.code,
        },
        { status: isConnectivityIssue ? 503 : 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          message: 'Servico temporariamente indisponivel.',
          reason: 'database_unavailable',
        },
        { status: 503 },
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          message: 'Falha ao criar conta.',
          reason: 'database_validation_error',
        },
        { status: 500 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: 'Falha ao criar conta.',
          reason: 'internal_error',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Falha ao criar conta.' }, { status: 500 });
  }
}