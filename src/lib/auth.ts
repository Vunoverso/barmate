import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { getPrismaClient, hasDatabaseUrl, prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  ...(hasDatabaseUrl() ? { adapter: PrismaAdapter(prisma) } : {}),
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
        if (!hasDatabaseUrl()) return null;
        const normalizedEmail = credentials.email.toLowerCase().trim();
        const normalizedPassword = credentials.password;

        const prismaClient = getPrismaClient();

        const user = await prismaClient.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        if (!user?.passwordHash) return null;
        if (user.status !== 'active') return null;

        const isValid = await compare(normalizedPassword, user.passwordHash);
        if (!isValid) return null;

        const primaryMembership = user.memberships[0];

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