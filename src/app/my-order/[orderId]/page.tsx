
"use client";

import dynamic from 'next/dynamic';

// Usar dynamic import para evitar erro de "Failed to load chunk" do Vercel
// O componente cliente-pesado carrega apenas no browser com loading screen
const MyOrderClient = dynamic(() => import('./components/my-order-client'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="font-semibold text-muted-foreground animate-pulse">Carregando comanda...</p>
      </div>
    </div>
  )
});

export default async function MyOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  
  return (
    <MyOrderClient orderId={orderId} />
  );
}
