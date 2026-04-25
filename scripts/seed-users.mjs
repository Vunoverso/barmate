import { PrismaClient } from '@prisma/client';
import bcryptPkg from 'bcryptjs';

const { hash } = bcryptPkg;

const prisma = new PrismaClient();

const defaultPassword = process.env.SEED_DEFAULT_PASSWORD;

const usersToSeed = [
  {
    name: 'Admin Principal',
    email: 'admin1@barmate.local',
    role: 'SUPPORT',
  },
  {
    name: 'Admin Operacao',
    email: 'admin2@barmate.local',
    role: 'SUPPORT',
  },
  {
    name: 'Usuario Padrao',
    email: 'usuario@barmate.local',
    role: 'STAFF',
  },
];

async function main() {
  if (!defaultPassword) {
    throw new Error('Defina SEED_DEFAULT_PASSWORD no ambiente antes de executar o seed.');
  }

  const passwordHash = await hash(defaultPassword, 10);

  const organization = await prisma.organization.upsert({
    where: { slug: 'barmate-demo' },
    update: {
      legalName: 'BarMate Demo LTDA',
      tradeName: 'BarMate Demo',
      status: 'ACTIVE',
    },
    create: {
      legalName: 'BarMate Demo LTDA',
      tradeName: 'BarMate Demo',
      slug: 'barmate-demo',
      status: 'ACTIVE',
    },
  });

  for (const entry of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {
        name: entry.name,
        passwordHash,
        status: 'active',
      },
      create: {
        name: entry.name,
        email: entry.email,
        passwordHash,
        status: 'active',
      },
    });

    await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: {
        role: entry.role,
        status: 'active',
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: entry.role,
        status: 'active',
      },
    });
  }

  console.log('Seed concluido.');
  console.log('Organizacao: BarMate Demo (slug: barmate-demo)');
  console.log('Usuarios criados com a senha definida em SEED_DEFAULT_PASSWORD.');

  for (const entry of usersToSeed) {
    console.log(`- ${entry.email} | role: ${entry.role}`);
  }
}

main()
  .catch((error) => {
    console.error('Falha no seed de usuarios:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
