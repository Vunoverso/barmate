
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Lock, Mail, Loader2, ShieldCheck, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'bar' | 'admin'>('bar');
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulação de delay de rede
    setTimeout(() => {
      const isMasterUser = email === 'semnomelogan@gmail.com' && password === 'cocofidido1981';
      const isDemoAdmin = email === 'admin@barmate.com' && password === 'admin123';

      if (isMasterUser || isDemoAdmin) {
        localStorage.setItem('barmate_admin_session', 'true');
        
        if (loginMode === 'admin') {
          if (isMasterUser) {
            localStorage.setItem('barmate_user_role', 'super_admin');
            localStorage.setItem('barmate_current_org_id', 'master_org');
            toast({ title: "Acesso Admin SaaS Liberado", description: "Bem-vindo ao Backoffice Global." });
            router.push('/admin');
          } else {
            toast({ title: "Erro de Permissão", description: "Você não tem permissão para acessar o Backoffice SaaS.", variant: "destructive" });
            setIsLoading(false);
            return;
          }
        } else {
          // Acesso como Estabelecimento (Bar)
          localStorage.setItem('barmate_user_role', 'owner');
          // Se for o usuário master entrando no bar, damos um ID especial, senão usamos um demo
          localStorage.setItem('barmate_current_org_id', isMasterUser ? 'master_bar_org' : 'demo_org_1');
          toast({ title: "Acesso ao Bar Liberado", description: "Iniciando painel operacional." });
          router.push('/dashboard');
        }
      } else {
        toast({ title: "Erro de autenticação", description: "E-mail ou senha incorretos.", variant: "destructive" });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl text-primary mb-2">
            <Zap className="fill-primary" />
            <span>BARMATE</span>
          </Link>
          
          <div className="flex p-1 bg-muted rounded-xl mt-6 w-fit mx-auto border shadow-inner">
            <button 
              onClick={() => setLoginMode('bar')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${loginMode === 'bar' ? 'bg-white text-primary shadow-sm border' : 'text-muted-foreground opacity-60 hover:opacity-100'}`}
            >
              <Store className="h-3.5 w-3.5" /> Meu Bar
            </button>
            <button 
              onClick={() => setLoginMode('admin')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${loginMode === 'admin' ? 'bg-orange-600 text-white shadow-lg' : 'text-muted-foreground opacity-60 hover:opacity-100'}`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin SaaS
            </button>
          </div>
        </div>

        <Card className={`shadow-2xl border-t-4 transition-all duration-500 ${loginMode === 'admin' ? 'border-orange-600' : 'border-primary'}`}>
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase text-center">
              {loginMode === 'admin' ? 'Acesso Backoffice' : 'Painel do Bar'}
            </CardTitle>
            <CardDescription className="text-center">
              {loginMode === 'admin' ? 'Gestão global da plataforma BarMate.' : 'Gerencie seu bar em tempo real.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 font-bold uppercase text-[10px] opacity-60"><Mail className="h-3 w-3" /> E-mail Profissional</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nome@exemplo.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="h-12 font-medium" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="flex items-center gap-2 font-bold uppercase text-[10px] opacity-60"><Lock className="h-3 w-3" /> Senha de Acesso</Label>
                  <Button variant="link" className="px-0 h-auto text-[10px] font-bold uppercase opacity-40 hover:opacity-100">Esqueceu?</Button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="h-12" 
                  required 
                />
              </div>
              <Button 
                type="submit" 
                className={`w-full h-14 text-lg font-black uppercase mt-4 transition-all ${loginMode === 'admin' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`} 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Entrar no Sistema"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-4 border-t py-6 bg-muted/5">
            <p className="text-[10px] font-bold uppercase opacity-40 text-center">
              {loginMode === 'admin' ? 'Área restrita a administradores do sistema BarMate.' : 'Ainda não tem o BarMate no seu negócio?'}
            </p>
            {loginMode === 'bar' && (
              <Link href="/planos" className="w-full">
                <Button variant="outline" className="w-full font-bold uppercase text-xs">Ver Planos e Testar Grátis</Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
