
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, LineChart, Menu, HandCoins, Settings, LogOut, LucideIcon, Store, Banknote, Users, ClipboardCheck, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { migrateOldData } from '@/lib/data-access';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const settingsNavItem: NavItem = { href: '/settings', label: 'Configurações', icon: Settings };


export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [barName, setBarName] = useState('BarMate');
  const [pendingGuestCount, setPendingGuestCount] = useState(0);
  const version = "1.3.2"; // Version number

  useEffect(() => {
    // Run data migration once on app load
    migrateOldData();

    const loadBarName = () => {
        const storedName = localStorage.getItem('barName') || 'BarMate';
        setBarName(storedName);
    };
    
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'barName') {
            loadBarName();
        }
    };
    
    loadBarName();
    window.addEventListener('storage', handleStorageChange);

    // Firebase real-time listener for pending guest requests
    const q = query(collection(db, "guestRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingGuestCount(snapshot.size);
    }, (error) => {
        console.error("Error listening to guest requests:", error);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribe();
    };
  }, []);
  
  const mainNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/cash-register', label: 'Caixa', icon: Banknote },
    { href: '/counter-sale', label: 'Venda Balcão', icon: Store },
    { href: '/orders', label: 'Comandas', icon: HandCoins },
    { href: '/qrcode', label: 'Acesso Cliente', icon: QrCode, badge: pendingGuestCount > 0 ? pendingGuestCount : undefined },
    { href: '/output-checker', label: 'Verificar Saídas', icon: ClipboardCheck },
    { href: '/products', label: 'Produtos', icon: Package },
    { href: '/clients', label: 'Clientes', icon: Users },
    { href: '/financial', label: 'Financeiro', icon: LineChart },
  ];
  
  const allNavItems = [...mainNavItems, settingsNavItem];

  const isGuestView = pathname.startsWith('/guest') || pathname.startsWith('/my-order');

  if (isGuestView) {
      return (
          <main className="flex flex-col min-h-screen bg-background">
              {children}
          </main>
      );
  }

  const SidebarNav = ({ items, className }: { items: NavItem[], className?: string }) => (
    <nav className={`flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? 'secondary' : 'ghost'}
          className="justify-start"
        >
          <Link href={item.href} className="flex items-center gap-2 rounded-lg px-3 py-1 text-primary transition-all hover:text-primary">
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge && item.badge > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">{item.badge}</Badge>}
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
              <span className="">{barName}</span>
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav items={allNavItems} className="px-2 text-sm font-medium lg:px-4" />
          </div>
          <div className="mt-auto p-4">
            <span className="text-xs text-muted-foreground">{version}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Alternar menu de navegação</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu Principal</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-1 text-lg font-medium">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Package className="h-6 w-6 text-primary" />
                  <span className="">{barName}</span>
                </Link>
                {allNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mx-[-0.65rem] flex items-center gap-3 rounded-xl px-3 py-1 ${pathname === item.href ? 'bg-muted text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => {
                      // Attempt to close sheet on navigation
                      const trigger = document.querySelector('button[aria-expanded="true"][class*="md:hidden"]');
                      if (trigger instanceof HTMLElement) {
                        trigger.click();
                      }
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.badge && item.badge > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">{item.badge}</Badge>}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto">
                <span className="text-xs text-muted-foreground p-4">{version}</span>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Spacer to push items to the right */}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10">
                  <Avatar className="h-full w-full">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
                    <AvatarFallback>BM</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Alternar menu do usuário</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Suporte</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
