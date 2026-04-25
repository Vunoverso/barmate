import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { Bolt, Check, Crown, Flame, ShieldCheck } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'] });

const plans = [
  {
    name: 'Essencial',
    price: 'R$ 99',
    period: '/mes',
    icon: Bolt,
    description: 'Para bares iniciantes e pequenos.',
    features: ['Ate 10 mesas ativas', 'Cadastro de 50 produtos', 'Relatorios basicos', '1 usuario admin', 'Suporte por email'],
    featured: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 199',
    period: '/mes',
    icon: Flame,
    description: 'Gestao completa para crescer.',
    features: ['Mesas ilimitadas', 'Produtos ilimitados', 'Relatorios avancados', 'Ate 5 usuarios', 'Monitor de cozinha'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    icon: Crown,
    description: 'Para redes e grandes operacoes.',
    features: ['Multiplas unidades', 'Gestao de estoque avancada', 'Integracoes via API', 'Gerente de conta dedicado', 'Treinamento de equipe'],
    featured: false,
  },
];

export default function Home() {
  return (
    <div className={`${spaceGrotesk.className} bg-[#05070A] text-white`}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070A]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#22d3c5]">
            <Bolt className="h-5 w-5" /> BARMATE
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex">
            <a href="#funcionalidades" className="hover:text-white">Funcionalidades</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#sobre" className="hover:text-white">Sobre</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white">Entrar</Link>
            <Link href="/cadastro" className="rounded-lg bg-[#22d3c5] px-4 py-2 text-sm font-bold text-[#062621] transition hover:bg-[#40e7da]">
              Teste Gratis
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-12 pt-14 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex rounded-full border border-[#22d3c5]/30 bg-[#22d3c5]/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#22d3c5]">
            Nova versao 1.3.3 stable
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] md:text-7xl">
            A gestao do seu bar
            <br />
            na palma da <span className="text-[#22d3c5]">sua mao.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            Abra comandas, controle o estoque, monitore a cozinha e receba pagamentos com agilidade. O sistema que entende o ritmo do seu estabelecimento.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/cadastro" className="rounded-xl bg-[#22d3c5] px-7 py-4 text-base font-bold text-[#062621] transition hover:bg-[#42e9dc]">
              Comecar Teste de 7 Dias
            </Link>
            <a href="#planos" className="rounded-xl border border-white/15 bg-black px-7 py-4 text-base font-bold text-white transition hover:border-[#22d3c5]/40">
              Ver Planos
            </a>
          </div>
          <p className="mt-8 text-sm text-white/60">+500 estabelecimentos ja utilizam</p>
        </div>

        <div className="relative">
          <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-[#22d3c5]/15 blur-3xl" />
          <div className="rounded-2xl border border-white/10 bg-[#0A0F14] p-3 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            <img
              src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80"
              alt="Visao da area principal do sistema"
              className="h-[420px] w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { title: 'Operacao em tempo real', text: 'Comandas, pedidos e cozinha sincronizados para agilizar atendimento.', icon: Bolt },
            { title: 'Financeiro centralizado', text: 'Receitas, despesas e fechamento de caixa em uma visao clara.', icon: ShieldCheck },
            { title: 'Pronto para escalar', text: 'Base para SaaS com planos, assinatura, suporte e controle administrativo.', icon: Crown },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-[#0B1016] p-6">
              <item.icon className="mb-4 h-5 w-5 text-[#22d3c5]" />
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-white/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-5xl font-black md:text-6xl">
          ESCOLHA O <span className="text-[#22d3c5]">PLANO IDEAL</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-xl text-white/60">
          Transparencia total. Comece gratis e escale conforme seu negocio cresce.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.featured ? 'border-[#22d3c5] bg-[#071218] shadow-[0_0_0_1px_rgba(34,211,197,0.25)]' : 'border-white/10 bg-[#090C11]'
              }`}
            >
              {plan.featured ? (
                <span className="mb-4 inline-flex rounded-full bg-[#22d3c5] px-3 py-1 text-xs font-extrabold uppercase text-[#062621]">
                  Mais vendido
                </span>
              ) : null}
              <div className="mb-5 inline-flex rounded-xl bg-white/5 p-3">
                <plan.icon className={`h-5 w-5 ${plan.featured ? 'text-[#22d3c5]' : 'text-[#f6b33d]'}`} />
              </div>
              <h3 className={`text-4xl font-black ${plan.featured ? 'text-[#22d3c5]' : 'text-white'}`}>{plan.name.toUpperCase()}</h3>
              <p className="mt-2 text-white/65">{plan.description}</p>
              <div className="mt-6 text-5xl font-black">
                {plan.price}
                {plan.period ? <span className="text-2xl font-semibold text-white/70"> {plan.period}</span> : null}
              </div>
              <ul className="mt-7 space-y-3 text-white/85">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#22d3c5]" /> {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="sobre" className="border-t border-white/10 bg-[#070A0F]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h3 className="text-3xl font-black">Feito para quem vive a operacao de verdade</h3>
          <p className="mt-4 max-w-3xl text-white/70">
            O BarMate nasceu para simplificar a rotina de atendimento e agora evolui para uma plataforma SaaS com planos, suporte e administracao completa para crescimento sustentavel.
          </p>
        </div>
      </section>
    </div>
  );
}
