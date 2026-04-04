import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

type RegisterPayload = {
  name?: string;
  email?: string;
  barName?: string;
  password?: string;
};

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase admin nao configurado.' }, { status: 500 });
  }

  const body = (await request.json()) as RegisterPayload;
  const name = body.name?.trim();
  const barName = body.barName?.trim();
  const password = body.password || '';
  const email = body.email?.trim().toLowerCase();

  if (!name || !barName || !email || !password) {
    return NextResponse.json({ error: 'Dados obrigatorios ausentes.' }, { status: 400 });
  }

  const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      barName,
    },
  });

  if (userError || !createdUser.user) {
    return NextResponse.json({ error: userError?.message || 'Nao foi possivel criar o usuario.' }, { status: 400 });
  }

  const userId = createdUser.user.id;
  const orgId = `org_${userId.replace(/-/g, '').slice(0, 12)}`;
  const now = new Date().toISOString();
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: orgError } = await admin.from('organizations').upsert({
    id: orgId,
    trade_name: barName,
    owner_email: email,
    owner_name: name,
    owner_user_id: userId,
    plan_id: 'trial',
    status: 'trial',
    created_at: now,
    updated_at: now,
    trial_ends_at: trialEndsAt,
  });

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 });
  }

  const { error: memberError } = await admin.from('organization_members').upsert({
    organization_id: orgId,
    user_id: userId,
    role: 'owner',
    created_at: now,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({
    orgId,
    barName,
    userId,
  });
}