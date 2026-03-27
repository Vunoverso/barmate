
"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import dynamic from 'next/dynamic';
import type { ReactNode } from "react";

// Carregamento dinâmico com prioridade máxima de cliente para evitar erros de chunk do Firebase
const AppLayout = dynamic(() => import('@/components/layout/app-layout'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Sincronizando BarMate...</p>
      </div>
    </div>
  )
});

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppLayout>{children}</AppLayout>
      <Toaster />
    </ThemeProvider>
  );
}
