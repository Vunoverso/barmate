import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function TableEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { slug } = await params;
  const { org } = await searchParams;

  // Verifica se já existe uma comanda ativa e compartilhada para esta mesa.
  // Se sim, redireciona diretamente sem exigir aprovação do garçom.
  const tableLabel = `Mesa ${slug.toUpperCase()}`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM open_orders
    WHERE deleted_at IS NULL
      AND (data->>'isShared')::boolean = true
      AND data->>'tableLabel' = ${tableLabel}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (rows && rows.length > 0) {
    redirect(`/my-order/${rows[0].id}`);
  }

  const query = new URLSearchParams();
  query.set('mesa', slug);
  if (org) query.set('org', org);

  redirect(`/guest/register?${query.toString()}`);
}
