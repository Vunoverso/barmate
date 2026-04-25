import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';

type PlanId = 'essencial' | 'profissional';

const PLAN_CATALOG: Record<PlanId, { name: string; unitAmount: number; envPriceKey: string }> = {
  essencial: {
    name: 'BarMate Essencial',
    unitAmount: 9900,
    envPriceKey: 'STRIPE_PRICE_ESSENCIAL',
  },
  profissional: {
    name: 'BarMate Profissional',
    unitAmount: 19900,
    envPriceKey: 'STRIPE_PRICE_PROFISSIONAL',
  },
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ message: 'Stripe nao configurado no ambiente.' }, { status: 503 });
  }

  const body = await request.json();
  const planId = body?.planId as PlanId;

  if (!planId || !PLAN_CATALOG[planId]) {
    return NextResponse.json({ message: 'Plano invalido.' }, { status: 400 });
  }

  const plan = PLAN_CATALOG[planId];
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:9000';

  const configuredPriceId = process.env[plan.envPriceKey as keyof NodeJS.ProcessEnv];

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: `${origin}/dashboard?billing=success`,
    cancel_url: `${origin}/planos?billing=cancelled`,
    client_reference_id: session.user.id,
    customer_email: session.user.email || undefined,
    metadata: {
      userId: session.user.id,
      organizationId: session.user.organizationId || '',
      planId,
    },
    line_items: configuredPriceId
      ? [{ price: configuredPriceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: 'brl',
              product_data: { name: plan.name },
              recurring: { interval: 'month' },
              unit_amount: plan.unitAmount,
            },
          },
        ],
  });

  return NextResponse.json({ url: checkoutSession.url });
}