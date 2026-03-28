import Link from 'next/link';
import { Zap } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="bg-muted/50 border-t py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2 font-black text-2xl text-primary grayscale opacity-50">
              <Zap className="fill-primary h-6 w-6" />
              <span>BARMATE</span>
            </Link>
            <p className="text-muted-foreground max-w-xs font-medium">
              A plataforma definitiva para gestão ágil de bares e restaurantes.
            </p>
          </div>

          <div className="space-y-4">
            <p className="font-black uppercase text-xs tracking-widest">Produto</p>
            <nav className="flex flex-col space-y-2 text-sm font-medium text-muted-foreground">
              <Link href="/#features" className="hover:text-primary transition-colors">Funcionalidades</Link>
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
          <div className="flex gap-8 items-center">
            <span>Brasil</span>
            <span>v1.3.3 Stable</span>
            <span>
              Refinamento técnico por{' '}
              <a
                href="https://www.vunostudio.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-70 transition-opacity"
              >
                VunoStudio
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
