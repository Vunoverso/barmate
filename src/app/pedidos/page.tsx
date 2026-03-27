
"use client";

import dynamic from 'next/dynamic';

const PedidosClient = dynamic(() => import("./components/pedidos-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-100px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground animate-pulse">Carregando painel de produção...</p>
      </div>
    </div>
  )
});

export default function PedidosPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedidos da Cozinha</h1>
      </div>
      <PedidosClient />
    </div>
  );
}
