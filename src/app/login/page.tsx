
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
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'bar' | 'admin'>('bar');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const superAdmins = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || 'semnomelogan@gmail.com,agenciaaktm@gmail.com')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);

  const getAuthErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/user-disabled':
        return 'Usuário desativado.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Aguarde e tente novamente.';
      default:
        return 'Não foi possível autenticar agora.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);

      if (loginMode === 'admin') {
        if (!superAdmins.includes(normalizedEmail)) {
          await signOut(auth);
          toast({
            title: 'Erro de Permissão',
            description: 'Você não tem permissão para acessar o Backoffice SaaS.',
            variant: 'destructive',
          });
          return;
        }

        localStorage.setItem('barmate_admin_session', 'true');
        localStorage.setItem('barmate_user_role', 'super_admin');
        localStorage.setItem('barmate_current_org_id', 'master_org');
        toast({ title: 'Acesso Admin SaaS Liberado', description: 'Bem-vindo ao Backoffice Global.' });
        router.push('/admin');
        return;
      }

      const q = query(
        collection(db, 'organizations'),
        where('ownerEmail', '==', normalizedEmail),
        limit(1),
      );
      const orgSnap = await getDocs(q);

      if (orgSnap.empty) {
        await signOut(auth);
        toast({
          title: 'Conta sem organização',
          description: 'Nenhuma organização vinculada a este e-mail foi encontrada.',
          variant: 'destructive',
        });
        return;
      }

      const orgDoc = orgSnap.docs[0];
      const orgData = orgDoc.data() as any;

      localStorage.setItem('barmate_admin_session', 'true');
      localStorage.setItem('barmate_user_role', 'owner');
      localStorage.setItem('barmate_current_org_id', orgDoc.id);
      localStorage.setItem('barName', orgData.tradeName || 'BarMate');

      toast({ title: 'Acesso ao Bar Liberado', description: 'Iniciando painel operacional.' });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Erro de autenticação',
        description: getAuthErrorMessage(err?.code || 'unknown'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({ title: 'Informe um e-mail', variant: 'destructive' });
      return;
    }

    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      toast({
        title: 'E-mail enviado',
        description: 'Enviamos um link seguro para redefinição de senha.',
      });
      setResetDialogOpen(false);
      setResetEmail('');
    } catch {
      // Mensagem genérica para evitar enumeração de e-mails.
      toast({
        title: 'Solicitação recebida',
        description: 'Se o e-mail existir, enviaremos instruções de recuperação.',
      });
      setResetDialogOpen(false);
      setResetEmail('');
    } finally {
      setIsResetLoading(false);
    }
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
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto text-[10px] font-bold uppercase opacity-40 hover:opacity-100"
                    onClick={() => {
                      setResetEmail(email.trim().toLowerCase());
                      setResetDialogOpen(true);
                    }}
                  >
                    Esqueceu?
                  </Button>
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

        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recuperar senha</DialogTitle>
              <DialogDescription>
                Informe seu e-mail de acesso. Você receberá um link seguro para redefinir sua senha.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="nome@exemplo.com"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Se você também perdeu o e-mail de acesso, fale com o suporte para recuperação de conta.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={handleResetPassword} disabled={isResetLoading}>
                {isResetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
