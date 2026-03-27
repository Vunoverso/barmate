
/**
 * @fileOverview Placeholder para integração com Stripe.
 * Este arquivo será expandido assim que as chaves de API forem configuradas.
 */

export const STRIPE_PLANS = {
  ESSENTIAL: 'price_essential_id',
  PRO: 'price_pro_id',
};

export async function createCheckoutSession(orgId: string, planId: string) {
  // TODO: Implementar chamada para Stripe API via Server Action
  console.log(`Iniciando checkout para Org: ${orgId}, Plano: ${planId}`);
  return { url: '/billing' }; // Redirecionamento temporário
}

export async function getSubscriptionStatus(orgId: string) {
  // TODO: Consultar status real no Stripe/Firestore
  return { status: 'active', plan: 'Pro' };
}
