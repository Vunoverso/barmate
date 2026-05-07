"use client";

import dynamic from 'next/dynamic';

const TablesManagement = dynamic(() => import('./components/tables-management'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-100px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground animate-pulse text-sm">Carregando mesas...</p>
      </div>
    </div>
  ),
});

export default function MesasPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mesas e Cardápio Digital</h1>
          <p className="text-sm text-muted-foreground">Crie mesas, gere QR Codes e configure o cardápio que o cliente vai ver.</p>
        </div>
      </div>
      <TablesManagement />
    </div>
  );
}
