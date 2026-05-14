import { NextRequest, NextResponse } from 'next/server';
import { findSharedOpenOrderIdByTableLabel } from '@/lib/operational-db';

export const dynamic = 'force-dynamic';

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

  const orderId = await findSharedOpenOrderIdByTableLabel(tableLabel);

  if (!orderId) {
    return NextResponse.json({ orderId: null }, { status: 200 });
  }

  return NextResponse.json({ orderId }, { status: 200 });
}
