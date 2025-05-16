"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, LineChart, Menu, HandCoins, Settings, LogOut, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/', label: 'PDV (Caixa)', icon: HandCoins },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/reports', label: 'Relatórios', icon: LineChart },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const SidebarNav = ({ items, className }: { items: NavItem[], className?: string }) => (
    <nav className={`flex flex-col gap-2 ${className}`}>
      {items.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? 'secondary' : 'ghost'}
          className="justify-start"
        >
          <Link href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:text-primary">
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{item.badge}</Badge>}
          </Link>
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6 text-primary" />
              <span className="">BarMate</span>
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav items={navItems} className="px-2 text-sm font-medium lg:px-4" />
          </div>
          <div className="mt-auto p-4">
            <Button size="sm" variant="outline" className="w-full justify-start gap-2">
              <Settings className="h-5 w-5" />
              Configurações
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Alternar menu de navegação</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Package className="h-6 w-6 text-primary" />
                  <span className="sr-only">BarMate</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 ${pathname === item.href ? 'bg-muted text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {item.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{item.badge}</Badge>}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto">
                <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can add search bar here if needed */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
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
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
