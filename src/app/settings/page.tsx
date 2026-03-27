
"use client";

import dynamic from 'next/dynamic';

// Usamos dynamic import para evitar o erro de "Failed to load chunk"
// Isso garante que o componente e as bibliotecas pesadas carreguem apenas no cliente.
const SettingsClient = dynamic(() => import("./components/settings-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground animate-pulse">Carregando configurações...</p>
      </div>
    </div>
  )
});

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </div>
      <SettingsClient />
    </div>
  );
}
