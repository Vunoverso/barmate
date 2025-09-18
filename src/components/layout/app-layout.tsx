
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, LineChart, Menu, HandCoins, Settings, LogOut, LucideIcon, Store, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cash-register', label: 'Caixa', icon: Banknote },
  { href: '/counter-sale', label: 'Venda Balcão', icon: Store },
  { href: '/orders', label: 'Comandas', icon: HandCoins },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/financial', label: 'Financeiro', icon: LineChart },
];

const settingsNavItem: NavItem = { href: '/settings', label: 'Configurações', icon: Settings };


export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [barName, setBarName] = useState('BarMate');
  const [isMounted, setIsMounted] = useState(false);
  const version = "v1.3.0"; // Version number

  useEffect(() => {
    setIsMounted(true);
    const storedBarName = localStorage.getItem('barName');
    if (storedBarName) {
      setBarName(storedBarName);
    }

    const handleBarNameChange = () => {
      const newName = localStorage.getItem('barName');
      if (newName) {
        setBarName(newName);
      }
    };

    window.addEventListener('barNameChanged', handleBarNameChange);
    window.addEventListener('storage', (event) => {
      if (event.key === 'barName' && event.newValue) {
        setBarName(event.newValue);
      }
    });

    return () => {
      window.removeEventListener('barNameChanged', handleBarNameChange);
      window.removeEventListener('storage', (event) => {
         if (event.key === 'barName' && event.newValue) {
            setBarName(event.newValue);
         }
      });
    };
  }, []);
  
  const allNavItems = [...mainNavItems, settingsNavItem];

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
            {item.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{item.badge}</Badge>}
          </Link>
        </Button>
      ))}
    </nav>
  );

  if (!isMounted) {
    // Basic skeleton or loading state to prevent hydration issues with theme/localStorage dependent items
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
           <div className="flex h-full max-h-screen flex-col gap-2">
             <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <div className="flex items-center gap-2 font-semibold">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="flex-1 px-2 py-4 lg:px-4 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
           </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 justify-between md:justify-end">
             <Skeleton className="h-9 w-9 md:hidden" />
             <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10 rounded-full" />
             </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
                <p>Carregando...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6 text-primary" />
              <span className="">{barName}</span>
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav items={allNavItems} className="px-2 text-sm font-medium lg:px-4" />
          </div>
          <div className="mt-auto p-4">
            
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
              <nav className="grid gap-1 text-lg font-medium">
                <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
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
                    {item.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{item.badge}</Badge>}
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
