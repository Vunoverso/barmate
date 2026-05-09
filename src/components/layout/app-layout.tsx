
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, LineChart, Menu, HandCoins, Settings, LogOut, Store, Banknote, Users, ClipboardCheck, QrCode, ChefHat, Armchair } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { migrateOldData, loadEssentialDataFromCloud, getCompanyDetails, saveCompanyDetails } from '@/lib/data-access';
import { db, collection, onSnapshot, query, where } from '@/lib/supabase-firestore';
import { isToday } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession, signOut } from 'next-auth/react';
import { getOfflineStatus, subscribeOfflineStatus } from '@/lib/offline-sync';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const settingsNavItem: NavItem = { href: '/settings', label: 'Configurações', icon: Settings };
const serverOfflineStatusSnapshot = getOfflineStatus();

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const { status } = useSession();
  const offlineStatus = useSyncExternalStore(subscribeOfflineStatus, getOfflineStatus, () => serverOfflineStatusSnapshot);
  const [barName, setBarName] = useState('BarMate');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingKitchenCount, setPendingKitchenCount] = useState(0);

  const version = "1.3.2";

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (status !== 'authenticated') {
        const details = getCompanyDetails();
        setBarName(details.barName);
        return;
      }
      await loadEssentialDataFromCloud();
      await migrateOldData();

      if (cancelled) return;
      const details = getCompanyDetails();
      setBarName(details.barName);
    };

    void bootstrap();

    const handleStateChange = () => {
      const details = getCompanyDetails();
      setBarName(details.barName);
    };

    window.addEventListener('barmate-app-state-changed', handleStateChange);
    return () => {
      cancelled = true;
      window.removeEventListener('barmate-app-state-changed', handleStateChange);
    };
  }, [status]);

  useEffect(() => {
    if (!db || status !== 'authenticated') return;

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
          const isKitchen = KITCHEN_CATEGORIES.includes(item.categoryId || '');
          const isNotDelivered = !item.isDelivered;

          const itemDate = item.addedAt ? new Date(item.addedAt) : null;
          const isItemToday = itemDate ? isToday(itemDate) : false;
          const isNewOrForced = isItemToday || item.forceKitchenVisible === true;

          if (isKitchen && isNotDelivered && isNewOrForced) {
            count++;
          }
        });
      });
      setPendingKitchenCount(count);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeOrders();
    };
  }, [status]);

  const isAuthenticated = status === 'authenticated';

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const mainNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/cash-register', label: 'Caixa', icon: Banknote },
    { href: '/counter-sale', label: 'Venda Balcão', icon: Store },
    { href: '/orders', label: 'Comandas', icon: HandCoins, badge: pendingRequestsCount },
    { href: '/pedidos', label: 'Pedidos', icon: ChefHat, badge: pendingKitchenCount },
    { href: '/qrcode', label: 'QR Code Geral', icon: QrCode },
    { href: '/mesas', label: 'Mesas / Cardápio', icon: Armchair },
    { href: '/output-checker', label: 'Verificar Saídas', icon: ClipboardCheck },
    { href: '/products', label: 'Produtos', icon: Package },
    { href: '/clients', label: 'Clientes', icon: Users },
    { href: '/financial', label: 'Financeiro', icon: LineChart },
  ];

  const allNavItems = [...mainNavItems, settingsNavItem];
  const publicRoutes = ['/', '/planos', '/login', '/cadastro', '/sobre'];
  const isGuestView = pathname.startsWith('/my-order') || pathname.startsWith('/guest/register') || pathname.startsWith('/kitchen-view');
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // While checking session
  if (status === 'loading' && !isGuestView && !isPublicRoute) {
      return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  // Public marketing and guest views
  if (isGuestView || isPublicRoute) return <main className="flex flex-col min-h-screen bg-background">{children}</main>;

  // Protected View - Login Required
    if (!isAuthenticated) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
          <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary bg-card">
                  <CardHeader className="text-center">
              <CardTitle className="text-2xl font-black uppercase">Acesso Necessario</CardTitle>
              <CardDescription>Entre com sua conta para acessar o painel operacional.</CardDescription>
                  </CardHeader>
            <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/login">Ir para login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/cadastro">Criar conta e iniciar trial</Link>
            </Button>
            </CardContent>
              </Card>
          </div>
      );
  }

  const SidebarNav = ({ items, className }: { items: NavItem[], className?: string }) => (
    <nav className={`flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <Button key={item.href} asChild variant={pathname === item.href ? 'secondary' : 'ghost'} className="justify-start">
          <Link href={item.href} className="flex items-center gap-2 rounded-lg px-3 py-1 text-primary transition-all hover:text-primary">
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white p-0 text-[10px] font-bold border-none animate-pulse">
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6 text-primary" />
              <span>{barName}</span>
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav items={allNavItems} className="px-2 text-sm font-medium lg:px-4" />
          </div>
          <div className="mt-auto p-4"><span className="text-xs text-muted-foreground">{version}</span></div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader><SheetTitle className="sr-only">Menu</SheetTitle></SheetHeader>
              <nav className="grid gap-1 text-lg font-medium">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Package className="h-6 w-6 text-primary" />
                  <span>{barName}</span>
                </Link>
                {allNavItems.map((item) => (
                  <Link key={item.href} href={item.href} className={`mx-[-0.65rem] flex items-center justify-between gap-3 rounded-xl px-3 py-1 ${pathname === item.href ? 'bg-muted text-primary' : 'text-muted-foreground'}`}>
                    <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </div>
                    {item.badge && item.badge > 0 && (
                        <Badge className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white border-none animate-pulse">
                            {item.badge}
                        </Badge>
                    )}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1"></div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`hidden md:inline-flex border px-3 py-1 text-xs font-semibold ${offlineStatus.isOnline ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'border-amber-500/40 bg-amber-500/10 text-amber-600'}`}
            >
              {offlineStatus.isHydrating
                ? 'Carregando dados...'
                : offlineStatus.isSyncing
                  ? `Sincronizando ${offlineStatus.pendingMutations}`
                  : offlineStatus.isOnline
                    ? offlineStatus.pendingMutations > 0
                      ? `Online · ${offlineStatus.pendingMutations} pendências`
                      : 'Online'
                    : `Offline · ${offlineStatus.pendingMutations} pendências`}
            </Badge>
            <ThemeToggleButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10">
                  <Avatar className="h-full w-full">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta (Admin)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
