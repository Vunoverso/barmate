import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

type ResolvePayload = {
  email?: string;
  userId?: string;
};

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase admin nao configurado.' }, { status: 500 });
  }

  const body = (await request.json()) as ResolvePayload;
  const email = body.email?.trim().toLowerCase();
  const userId = body.userId?.trim();

  if (!email && !userId) {
    return NextResponse.json({ error: 'Informe userId ou email.' }, { status: 400 });
  }

  if (userId) {
    const memberResult = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (memberResult.error) {
      return NextResponse.json({ error: memberResult.error.message }, { status: 400 });
    }

    if (memberResult.data?.organization_id) {
      const orgResult = await admin
        .from('organizations')
        .select('id, trade_name')
        .eq('id', memberResult.data.organization_id)
        .limit(1)
        .maybeSingle();

      if (orgResult.error) {
        return NextResponse.json({ error: orgResult.error.message }, { status: 400 });
      }

      if (orgResult.data) {
        return NextResponse.json({ orgId: orgResult.data.id, tradeName: orgResult.data.trade_name });
      }
    }
  }

  const orgResult = await admin
    .from('organizations')
    .select('id, trade_name')
    .eq('owner_email', email || '')
    .limit(1)
    .maybeSingle();

  if (orgResult.error) {
    return NextResponse.json({ error: orgResult.error.message }, { status: 400 });
  }

  if (!orgResult.data) {
    return NextResponse.json({ error: 'Nenhuma organizacao encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ orgId: orgResult.data.id, tradeName: orgResult.data.trade_name });
}