import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/table/:slug
// Busca a comanda ativa e compartilhada de uma mesa pelo seu label (slug).
// Utilizado pelo QR code de mesa para redirecionar diretamente sem pedir permissão.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  // O label da mesa é armazenado como "Mesa X" (e.g., "Mesa 4", "Mesa A1").
  const tableLabel = `Mesa ${slug.toUpperCase()}`;

  // Busca via $queryRaw pois o campo tableLabel está dentro de um JSON (data).
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM open_orders
    WHERE deleted_at IS NULL
      AND (data->>'isShared')::boolean = true
      AND data->>'tableLabel' = ${tableLabel}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    return NextResponse.json({ orderId: null }, { status: 200 });
  }

  return NextResponse.json({ orderId: rows[0].id }, { status: 200 });
}
