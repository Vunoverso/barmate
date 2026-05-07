'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DB_NAME = 'barmate-offline-sync';
const DB_VERSION = 1;

type DataSnapshot = {
  appState: Record<string, unknown>;
  tableSnapshots: Record<string, unknown[]>;
  localStorageData: Record<string, unknown>;
  exportedAt: string;
};

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = () => resolve(null);
  });
}

function readStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => resolve([]);
  });
}

type AppStateRecord = { key: string; value: unknown; updatedAt: string; pending: boolean };
type TableSnapshotRecord = { tableName: string; rows: Record<string, unknown>[]; updatedAt: string };

export default function RescuePage() {
  const [data, setData] = useState<DataSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ key: string; type: string; count: number }[]>([]);

  const extractData = async () => {
    setLoading(true);
    try {
      const db = await openIDB();

      const appStateRecords: AppStateRecord[] = db ? await readStore(db, 'app_state') : [];
      const tableSnapshotRecords: TableSnapshotRecord[] = db ? await readStore(db, 'table_snapshots') : [];

      // Build appState map
      const appState: Record<string, unknown> = {};
      for (const record of appStateRecords) {
        appState[record.key] = record.value;
      }

      // Build tableSnapshots map
      const tableSnapshots: Record<string, unknown[]> = {};
      for (const record of tableSnapshotRecords) {
        tableSnapshots[record.tableName] = record.rows;
      }

      // Also grab localStorage for legacy keys
      const localStorageData: Record<string, unknown> = {};
      const legacyKeys = [
        'barName', 'barCnpj', 'barAddress', 'barLogo', 'barLogoScale',
        'barmate_productCategories_v2', 'barmate_products_v2', 'barmate_sales_v2',
        'barmate_openOrders_v2', 'barmate_archivedOrders_v2', 'barmate_clients_v2',
        'barmate_financialEntries_v2', 'barmate_cashRegisterStatus_v2',
        'barmate_transactionFees_v2', 'barmate_closedCashSessions_v2',
        'barmate_secondaryCashBox_v2', 'barmate_bankAccount_v2',
        'barmate_tables_v1', 'barmate_menuBranding_v1',
      ];
      for (const key of legacyKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            localStorageData[key] = JSON.parse(raw);
          } catch {
            localStorageData[key] = raw;
          }
        }
      }

      if (db) db.close();

      const snapshot: DataSnapshot = {
        appState,
        tableSnapshots,
        localStorageData,
        exportedAt: new Date().toISOString(),
      };

      setData(snapshot);

      // Build summary
      const summaryItems: { key: string; type: string; count: number }[] = [];
      for (const [key, value] of Object.entries(appState)) {
        const count = Array.isArray(value) ? value.length : 1;
        summaryItems.push({ key, type: 'IndexedDB (app_state)', count });
      }
      for (const [table, rows] of Object.entries(tableSnapshots)) {
        summaryItems.push({ key: table, type: 'IndexedDB (table_snapshot)', count: rows.length });
      }
      for (const [key, value] of Object.entries(localStorageData)) {
        if (!appState[key]) {
          const count = Array.isArray(value) ? value.length : 1;
          summaryItems.push({ key, type: 'localStorage', count });
        }
      }
      setSummary(summaryItems);
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barmate-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getKeyLabel = (key: string) => {
    const labels: Record<string, string> = {
      barmate_productCategories_v2: 'Categorias de Produtos',
      barmate_products_v2: 'Produtos',
      barmate_sales_v2: 'Vendas (Histórico)',
      barmate_openOrders_v2: 'Comandas Abertas',
      barmate_archivedOrders_v2: 'Comandas Arquivadas',
      barmate_clients_v2: 'Clientes',
      barmate_financialEntries_v2: 'Lançamentos Financeiros',
      barmate_cashRegisterStatus_v2: 'Caixa Atual',
      barmate_transactionFees_v2: 'Taxas de Transação',
      barmate_closedCashSessions_v2: 'Sessões de Caixa Fechadas',
      barmate_secondaryCashBox_v2: 'Caixa Secundário',
      barmate_bankAccount_v2: 'Conta Bancária',
      barmate_tables_v1: 'Mesas',
      barmate_menuBranding_v1: 'Visual do Cardápio',
      open_orders: 'Comandas (Realtime)',
      guest_requests: 'Pedidos de Convidados',
      barName: 'Nome do Bar',
      barCnpj: 'CNPJ',
      barAddress: 'Endereço',
    };
    return labels[key] ?? key;
  };

  const getBadgeColor = (key: string) => {
    if (key.includes('financial') || key.includes('sales') || key.includes('cash')) return 'destructive';
    if (key.includes('Order') || key.includes('order')) return 'default';
    if (key.includes('product') || key.includes('categor')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🛟 Resgate de Dados — Bar Therapia</h1>
          <p className="text-muted-foreground mt-1">
            Extrai todos os dados salvos no IndexedDB e localStorage deste navegador.
            Faça download do backup antes de qualquer migração.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Passo 1 — Extrair Dados do Navegador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para ler o banco de dados local deste navegador (IndexedDB{' '}
              <code className="bg-muted px-1 rounded">barmate-offline-sync</code> + localStorage).
              Isso <strong>não apaga nada</strong>, só lê.
            </p>
            <Button onClick={extractData} disabled={loading}>
              {loading ? 'Lendo dados...' : '🔍 Ler Dados do Navegador'}
            </Button>
          </CardContent>
        </Card>

        {summary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Dados Encontrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div>
                      <span className="font-medium text-sm">{getKeyLabel(item.key)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.type})</span>
                    </div>
                    <Badge variant={getBadgeColor(item.key) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {Array.isArray(data?.appState[item.key]) || Array.isArray(data?.tableSnapshots[item.key])
                        ? `${item.count} registros`
                        : 'presente'}
                    </Badge>
                  </div>
                ))}
              </div>

              {summary.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum dado encontrado no navegador.</p>
              )}
            </CardContent>
          </Card>
        )}

        {data && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400">Passo 2 — Baixar Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Baixe o arquivo JSON com todos os dados. <strong>Guarde em local seguro.</strong>
              </p>
              <Button onClick={downloadJSON} className="bg-green-600 hover:bg-green-700">
                ⬇️ Baixar barmate-backup.json
              </Button>
            </CardContent>
          </Card>
        )}

        {data && (
          <Card>
            <CardHeader>
              <CardTitle>Passo 3 — Importar para o Novo Servidor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Após baixar o arquivo, vá para{' '}
                <a href="/rescue/import" className="underline text-primary">
                  /rescue/import
                </a>{' '}
                para importar os dados para o PostgreSQL do Vultr.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
