
"use client";

import dynamic from 'next/dynamic';

const KitchenViewClient = dynamic(() => import("./components/kitchen-view-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Iniciando Monitor de Cozinha...</p>
      </div>
    </div>
  )
});

export default function KitchenPage() {
  return (
    <KitchenViewClient />
  );
}
