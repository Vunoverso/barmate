"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

const planData = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 'R$ 99/mes',
    description: 'Para bares iniciantes e pequenos',
    features: ['Ate 10 mesas ativas', 'Cadastro de 50 produtos', 'Relatorios basicos', '1 usuario admin'],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 'R$ 199/mes',
    description: 'Gestao completa para crescer',
    features: ['Mesas ilimitadas', 'Produtos ilimitados', 'Financeiro completo', 'Ate 5 usuarios'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sob consulta',
    description: 'Para redes e operacoes complexas',
    features: ['Multiplas unidades', 'Integracoes', 'Suporte dedicado', 'Treinamento de equipe'],
  },
];

export default function PlanosPage() {
  const router = useRouter();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (planId: 'essencial' | 'profissional') => {
    setActivePlanId(planId);
    setError(null);

    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    if (response.status === 401) {
      router.push('/login?next=/planos');
      return;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.url) {
      setError(payload?.message || 'Nao foi possivel iniciar checkout.');
      setActivePlanId(null);
      return;
    }

    window.location.href = payload.url;
  };

  return (
    <main className="min-h-screen bg-[#05070A] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center text-5xl font-black">Planos BarMate</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/65">
          Comece com 7 dias gratis e escolha o plano conforme a fase do seu negocio.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {planData.map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-white/10 bg-[#0A1016] p-7">
              <h2 className="text-3xl font-black text-[#22d3c5]">{plan.name}</h2>
              <p className="mt-2 text-2xl font-extrabold">{plan.price}</p>
              <p className="mt-2 text-white/70">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-white/90">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#22d3c5]" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.id === 'enterprise' ? (
                <Link href="/cadastro" className="mt-6 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white">
                  Falar com vendas
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => startCheckout(plan.id as 'essencial' | 'profissional')}
                  disabled={activePlanId === plan.id}
                  className="mt-6 inline-flex rounded-lg bg-[#22d3c5] px-4 py-2 text-sm font-bold text-[#062621] disabled:opacity-60"
                >
                  {activePlanId === plan.id ? 'Abrindo checkout...' : 'Assinar plano'}
                </button>
              )}
            </article>
          ))}
        </div>

        {error ? <p className="mt-6 text-center text-sm text-red-400">{error}</p> : null}

        <div className="mt-12 flex justify-center">
          <Link href="/cadastro" className="rounded-lg bg-[#22d3c5] px-6 py-3 font-bold text-[#062621]">
            Comecar teste gratis
          </Link>
        </div>
      </div>
    </main>
  );
}