
"use client";

import dynamic from 'next/dynamic';

// Usamos dynamic import para evitar o erro de "Failed to load chunk" do Firestore
// Isso garante que o componente e as bibliotecas pesadas do Firebase carreguem apenas no cliente.
const OrdersClient = dynamic(() => import("./components/orders-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-100px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground animate-pulse">Carregando painel de comandas...</p>
      </div>
    </div>
  )
});

export default function OrdersPage() {
  return (
    <OrdersClient />
  );
}
