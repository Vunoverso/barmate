
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, BarChart3, Users2, ArrowRight, Play, Star, CheckCircle2 } from 'lucide-react';
import images from '@/app/lib/placeholder-images.json';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Semântico */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-2xl text-primary tracking-tighter" aria-label="BarMate Home">
            <Zap className="fill-primary h-6 w-6" />
            <span>BARMATE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wide">
            <Link href="#features" className="hover:text-primary transition-colors">Funcionalidades</Link>
            <Link href="/planos" className="hover:text-primary transition-colors">Planos</Link>
            <Link href="/suporte" className="hover:text-primary transition-colors">Suporte</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-bold uppercase text-xs">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button className="font-black uppercase text-xs px-6">Teste Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-16">
        {/* Hero Section Semântica */}
        <section className="relative py-24 lg:py-40 overflow-hidden" aria-labelledby="hero-title">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
            <article className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                🚀 A Revolução na Gestão de Bares
              </div>
              <h1 id="hero-title" className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
                Pare de perder dinheiro com <span className="text-primary italic">gestão lenta.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 font-medium">
                O BarMate é o único sistema que une agilidade de lançamento, monitor de cozinha em tempo real e financeiro blindado em uma só plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/cadastro">
                  <Button size="lg" className="h-16 px-10 text-lg font-black uppercase shadow-2xl shadow-primary/20 group">
                    Começar Agora <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/planos">
                  <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-black uppercase border-2">
                    Ver Planos
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4">
                <div className="flex -space-x-3" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-4 border-background bg-muted overflow-hidden">
                      <img src={`https://picsum.photos/seed/${i+50}/40/40`} alt={`Usuário satisfeito ${i}`} />
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex text-yellow-500 mb-0.5"><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /></div>
                  <p className="text-[10px] font-bold uppercase opacity-60">+800 bares ativos hoje</p>
                </div>
              </div>
            </article>
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-30 animate-pulse" />
              <figure className="relative lg:h-[550px] aspect-video lg:aspect-auto rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.1)] border-[12px] border-background">
                <Image 
                  src={images["landing-hero"].url} 
                  alt={images["landing-hero"].alt} 
                  fill 
                  priority
                  className="object-cover"
                  data-ai-hint="bar interior modern"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <figcaption className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg"><Play className="fill-white h-5 w-5 ml-1" /></div>
                    <div>
                      <p className="font-black text-sm uppercase">Veja o BarMate em ação</p>
                      <p className="text-xs opacity-80">Vídeo rápido de 2 minutos</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Features - Grid de Impacto com Tags Semânticas */}
        <section id="features" className="py-32 bg-muted/30" aria-labelledby="features-title">
          <div className="container mx-auto px-4">
            <header className="text-center max-w-3xl mx-auto mb-24">
              <h2 id="features-title" className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">Tudo para o seu bar <span className="text-primary">decolar</span></h2>
              <p className="text-lg text-muted-foreground font-medium">Desenvolvemos as ferramentas que os donos de bares mais pediram ao longo de anos.</p>
            </header>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Zap className="h-10 w-10 text-primary" />}
                title="Comandas em Tempo Real"
                desc="Acabe com a gritaria e erros. O pedido cai instantaneamente na cozinha ou bar."
              />
              <FeatureCard 
                icon={<BarChart3 className="h-10 w-10 text-primary" />}
                title="Financeiro Automatizado"
                desc="Fluxo de caixa, DRE e taxas de cartão calculadas automaticamente a cada venda."
              />
              <FeatureCard 
                icon={<Users2 className="h-10 w-10 text-primary" />}
                title="Experiência do Cliente"
                desc="QR Code por mesa para autoatendimento e acompanhamento de consumo pelo celular."
              />
            </div>
          </div>
        </section>

        {/* Proposta de Valor */}
        <section className="py-24 bg-primary text-primary-foreground overflow-hidden relative" aria-label="Estatísticas de impacto">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-4 gap-12 text-center">
              <div className="space-y-2"><p className="text-5xl font-black">30%</p><p className="text-xs uppercase font-bold opacity-80 tracking-widest">Mais agilidade no atendimento</p></div>
              <div className="space-y-2"><p className="text-5xl font-black">Zero</p><p className="text-xs uppercase font-bold opacity-80 tracking-widest">Erros de fechamento de conta</p></div>
              <div className="space-y-2"><p className="text-5xl font-black">7 dias</p><p className="text-xs uppercase font-bold opacity-80 tracking-widest">De teste grátis sem cartão</p></div>
              <div className="space-y-2"><p className="text-5xl font-black">24/7</p><p className="text-xs uppercase font-bold opacity-80 tracking-widest">Suporte especializado para bares</p></div>
            </div>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="py-32 text-center container mx-auto px-4" aria-labelledby="cta-title">
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 id="cta-title" className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Pronto para ter o controle <span className="text-primary italic">total?</span>
            </h2>
            <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
              Junte-se a centenas de bares que profissionalizaram sua gestão com o BarMate. Comece seu teste agora.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cadastro">
                <Button size="lg" className="h-20 px-16 text-2xl font-black uppercase shadow-2xl shadow-primary/30">
                  Criar Conta Grátis
                </Button>
              </Link>
            </div>
            <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Sem fidelidade. Sem taxas de instalação.</p>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 border-t py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2 font-black text-2xl text-primary grayscale opacity-50">
                <Zap className="fill-primary h-6 w-6" />
                <span>BARMATE</span>
              </div>
              <p className="text-muted-foreground max-w-xs font-medium">A plataforma definitiva para gestão ágil de bares, restaurantes e estabelecimentos gastronômicos.</p>
            </div>
            <div className="space-y-4">
              <p className="font-black uppercase text-xs tracking-widest">Produto</p>
              <nav className="flex flex-col space-y-2 text-sm font-medium text-muted-foreground">
                <Link href="#features" className="hover:text-primary transition-colors">Funcionalidades</Link>
                <Link href="/planos" className="hover:text-primary transition-colors">Preços</Link>
                <Link href="/login" className="hover:text-primary transition-colors">Entrar</Link>
              </nav>
            </div>
            <div className="space-y-4">
              <p className="font-black uppercase text-xs tracking-widest">Suporte</p>
              <nav className="flex flex-col space-y-2 text-sm font-medium text-muted-foreground">
                <Link href="/suporte" className="hover:text-primary transition-colors">Central de Ajuda</Link>
                <Link href="/suporte" className="hover:text-primary transition-colors">Contato</Link>
                <Link href="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
              </nav>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase opacity-40 tracking-widest">
            <p>© 2024 BarMate SaaS - Todos os direitos reservados.</p>
            <div className="flex gap-8">
              <span>Brasil</span>
              <span>v1.3.3 Stable</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Card className="border-none shadow-2xl shadow-black/5 hover:translate-y-[-10px] transition-all duration-500 group bg-background">
      <CardContent className="pt-12 pb-10 px-8 space-y-6">
        <div className="bg-primary/10 w-fit p-5 rounded-3xl group-hover:bg-primary group-hover:text-white transition-colors duration-500">{icon}</div>
        <h3 className="text-2xl font-black uppercase tracking-tighter">{title}</h3>
        <p className="text-muted-foreground leading-relaxed font-medium">{desc}</p>
        <div className="pt-4 flex items-center text-primary font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          Saiba Mais <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
