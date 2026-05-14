import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciais',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const normalizedEmail = credentials.email.toLowerCase().trim();
        const normalizedPassword = credentials.password;

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
              memberships: {
                include: { organization: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          });
        } catch (dbErr) {
          console.error('[auth] Prisma error during login:', dbErr);
          return null;
        }

        if (!user?.passwordHash) return null;
        if (user.status !== 'active') return null;

        const isValid = await compare(normalizedPassword, user.passwordHash);
        if (!isValid) return null;

          const primaryMembership =
            user.memberships.find((membership) => String(membership.status ?? '').trim().toLowerCase() === 'active')
            ?? user.memberships[0];

          if (!primaryMembership?.organizationId) {
            console.warn('[auth] Login blocked: user without active organization membership', {
              email: normalizedEmail,
              memberships: user.memberships.length,
            });
            return null;
          }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: primaryMembership?.organizationId,
          role: primaryMembership?.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = (user as any).organizationId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId || '');
        session.user.organizationId = token.organizationId ? String(token.organizationId) : undefined;
        session.user.role = token.role ? String(token.role) : undefined;
      }
      return session;
    },
  },
};