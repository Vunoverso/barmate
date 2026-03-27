
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Package, 
  LineChart, 
  Menu, 
  HandCoins, 
  Settings, 
  LogOut, 
  Store, 
  Banknote, 
  Users, 
  QrCode, 
  ChefHat, 
  Lock, 
  CreditCard, 
  LifeBuoy, 
  ShieldCheck,
  Zap,
  TrendingUp,
  LayoutDashboard,
  Frown,
  Search,
  ChevronRight
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { migrateOldData, loadEssentialDataFromCloud } from '@/lib/data-access';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { isToday } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [barName, setBarName] = useState('BarMate');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingKitchenCount, setPendingKitchenCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const version = "1.3.3-STABLE";

  const isPublicRoute = pathname === '/' || pathname === '/planos' || pathname === '/cadastro' || pathname === '/login' || pathname === '/suporte' || pathname === '/termos';
  const isGuestView = pathname.startsWith('/my-order') || pathname.startsWith('/guest/register') || pathname.startsWith('/kitchen-view');

  useEffect(() => {
    migrateOldData();
    loadEssentialDataFromCloud().then(() => {
        const storedName = localStorage.getItem('barName') || 'BarMate';
        setBarName(storedName);
    });
    
    const checkSession = () => {
      const session = localStorage.getItem('barmate_admin_session');
      const role = localStorage.getItem('barmate_user_role');
      setIsAuthenticated(session === 'true');
      setUserRole(role);
    };

    checkSession();
    window.addEventListener('storage', checkSession);
    const interval = setInterval(checkSession, 1000);

    return () => {
      window.removeEventListener('storage', checkSession);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!db || !isAuthenticated || userRole === 'super_admin') return;
    
    const qRequests = query(collection(db, 'guest_requests'), where('status', '==', 'pending'));
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      setPendingRequestsCount(snapshot.size);
    });

    const unsubscribeOrders = onSnapshot(collection(db, 'open_orders'), (snapshot) => {
      let count = 0;
      const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const items = data.items || [];
        items.forEach((item: any) => {
          if (KITCHEN_CATEGORIES.includes(item.categoryId || '') && !item.isDelivered && (item.addedAt ? isToday(new Date(item.addedAt)) : false || item.forceKitchenVisible === true)) {
            count++;
          }
        });
      });
      setPendingKitchenCount(count);
    });

    return () => { unsubscribeRequests(); unsubscribeOrders(); };
  }, [isAuthenticated, userRole]);

  const handleLogout = () => {
    localStorage.removeItem('barmate_admin_session');
    localStorage.removeItem('barmate_user_role');
    localStorage.removeItem('barmate_current_org_id');
    setIsAuthenticated(false);
    setUserRole(null);
    toast({ title: "Sessão Encerrada" });
  };
  
  const barNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/cash-register', label: 'Caixa Diário', icon: Banknote },
    { href: '/counter-sale', label: 'Venda Balcão', icon: Store },
    { href: '/orders', label: 'Gerenciar Mesas', icon: HandCoins, badge: pendingRequestsCount },
    { href: '/pedidos', label: 'Cozinha', icon: ChefHat, badge: pendingKitchenCount },
    { href: '/qrcode', label: 'QR Code Geral', icon: QrCode },
    { href: '/financial', label: 'Financeiro', icon: LineChart },
    { href: '/products', label: 'Produtos', icon: Package },
    { href: '/clients', label: 'Clientes', icon: Users },
    { href: '/billing', label: 'Assinatura', icon: CreditCard },
    { href: '/suporte', label: 'Suporte', icon: LifeBuoy },
    { href: '/settings', label: 'Configurações', icon: Settings },
  ];

  const adminNavItems: NavItem[] = [
    { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/admin/accounts', label: 'Organizações', icon: Users },
    { href: '/admin/revenue', label: 'Receita SaaS', icon: TrendingUp },
    { href: '/admin/cancelamentos', label: 'Churn', icon: Frown },
    { href: '/admin/tickets', label: 'Suporte Global', icon: LifeBuoy },
    { href: '/admin/settings', label: 'Config. SaaS', icon: Settings },
  ];

  const currentNavItems = userRole === 'super_admin' ? adminNavItems : barNavItems;

  if (isAuthenticated === null && !isGuestView && !isPublicRoute) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
  }

  if (isGuestView || isPublicRoute) return <main className="flex flex-col min-h-screen bg-background">{children}</main>;

  if (!isAuthenticated) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
              <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
                  <CardHeader className="text-center">
                      <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4"><Lock className="h-10 w-10 text-primary" /></div>
                      <CardTitle className="text-2xl font-black uppercase">Portal de Acesso</CardTitle>
                      <CardDescription>Faça login para acessar sua conta.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Link href="/login" className="w-full"><Button className="w-full h-14 text-lg font-black uppercase">Fazer Login</Button></Link>
                      <Link href="/" className="block text-center text-sm text-muted-foreground hover:underline">Voltar para a Home</Link>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr]">
      <div className={`hidden border-r md:block ${userRole === 'super_admin' ? 'bg-zinc-950 border-orange-950' : 'bg-muted/40'}`}>
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href={userRole === 'super_admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 font-black tracking-tighter text-lg uppercase">
              <Zap className={`h-5 w-5 fill-current ${userRole === 'super_admin' ? 'text-orange-500' : 'text-primary'}`} />
              <span className={userRole === 'super_admin' ? 'text-white' : ''}>{userRole === 'super_admin' ? 'Admin SaaS' : barName}</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <nav className="flex flex-col gap-1 px-2 text-sm font-medium lg:px-4 py-4">
                {currentNavItems.map((item) => (
                  <Button key={item.href} asChild variant={pathname === item.href ? 'secondary' : 'ghost'} className={`justify-start h-10 px-3 ${userRole === 'super_admin' ? (pathname === item.href ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900') : 'text-foreground hover:text-primary'}`}>
                    <Link href={item.href} className="flex items-center gap-3 rounded-lg transition-all">
                      <item.icon className={`h-4 w-4 ${pathname === item.href ? (userRole === 'super_admin' ? 'text-white' : 'text-primary') : ''}`} />
                      <span className="flex-1 text-left font-bold uppercase text-[10px] tracking-wide">{item.label}</span>
                      {item.badge && item.badge > 0 ? (
                        <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white p-0 text-[10px] font-bold border-none animate-pulse">{item.badge}</Badge>
                      ) : null}
                    </Link>
                  </Button>
                ))}
              </nav>
            </ScrollArea>
          </div>
          <div className="mt-auto p-4 border-t bg-muted/20">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-40 italic">BarMate v{version}</span>
              <span className={`text-[8px] font-bold uppercase tracking-[0.2em] ${userRole === 'super_admin' ? 'text-orange-500' : 'text-primary'}`}>
                {userRole === 'super_admin' ? 'Infraestrutura SaaS' : 'Licença Ativa'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col">
        <header className={`flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6 ${userRole === 'super_admin' ? 'bg-zinc-950 border-orange-950' : 'bg-muted/40'}`}>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden h-9 w-9"><Menu className="h-5 w-5" /><span className="sr-only">Menu</span></Button>
            </SheetTrigger>
            <SheetContent side="left" className={`flex flex-col p-0 w-[250px] ${userRole === 'super_admin' ? 'bg-zinc-950 text-white' : ''}`}>
              <SheetHeader className="p-6 border-b text-left">
                <SheetTitle className="font-black uppercase tracking-tighter flex items-center gap-2">
                  <Zap className={`h-5 w-5 fill-current ${userRole === 'super_admin' ? 'text-orange-500' : 'text-primary'}`} /> 
                  {userRole === 'super_admin' ? 'Admin SaaS' : barName}
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4 py-6">
                <nav className="grid gap-1">
                  {currentNavItems.map((item) => (
                    <Link key={item.href} href={item.href} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 font-bold uppercase text-xs ${pathname === item.href ? (userRole === 'super_admin' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-primary text-white shadow-lg shadow-primary/20') : (userRole === 'super_admin' ? 'text-zinc-400 hover:bg-zinc-900' : 'text-muted-foreground hover:bg-muted')}`}>
                      <div className="flex items-center gap-3"><item.icon className="h-4 w-4" />{item.label}</div>
                      {item.badge && item.badge > 0 && (<Badge className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white border-none animate-pulse">{item.badge}</Badge>)}
                    </Link>
                  ))}
                </nav>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1 flex items-center gap-4">
             <Badge variant="outline" className={`hidden sm:flex font-black uppercase text-[10px] tracking-widest px-3 ${userRole === 'super_admin' ? 'border-orange-900 text-orange-500' : 'border-primary/20 text-primary'}`}>
                {userRole === 'super_admin' ? 'Painel de Controle SaaS' : 'Operação do Bar'}
             </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggleButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className={`rounded-full h-10 w-10 overflow-hidden ring-2 transition-all ${userRole === 'super_admin' ? 'ring-orange-500/20 hover:ring-orange-500/40' : 'ring-primary/10 hover:ring-primary/30'}`}>
                  <Avatar className="h-full w-full">
                    <AvatarImage src={`https://picsum.photos/seed/${userRole === 'super_admin' ? 'owner' : 'bar'}/40/40`} alt="Avatar" />
                    <AvatarFallback className={`font-black uppercase text-white ${userRole === 'super_admin' ? 'bg-orange-600' : 'bg-primary'}`}>{userRole === 'super_admin' ? 'AD' : 'BA'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-black uppercase text-xs tracking-tighter">
                  {userRole === 'super_admin' ? 'Conta Administrador' : 'Meu Perfil'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="font-bold text-xs uppercase" asChild><Link href={userRole === 'super_admin' ? '/admin/settings' : '/billing'}><CreditCard className="mr-2 h-4 w-4" /> {userRole === 'super_admin' ? 'Configurações' : 'Assinatura'}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold text-xs uppercase cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className={`flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8 overflow-auto ${userRole === 'super_admin' ? 'bg-zinc-950 text-white' : 'bg-muted/10'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
