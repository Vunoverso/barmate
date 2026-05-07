'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ imported?: Record<string, number>; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setStatus('idle');
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('loading');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/db/import-backup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus('error');
        setResult({ error: json.error ?? `HTTP ${res.status}` });
        return;
      }

      setStatus('success');
      setResult({ imported: json.imported });
    } catch (err) {
      setStatus('error');
      setResult({ error: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">📥 Importar Backup</h1>
          <p className="text-muted-foreground mt-1">
            Importe o arquivo <code className="bg-muted px-1 rounded">barmate-backup.json</code>{' '}
            exportado pela página <a href="/rescue" className="underline text-primary">/rescue</a>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <Button
              onClick={handleImport}
              disabled={!file || status === 'loading'}
              className="w-full"
            >
              {status === 'loading' ? '⏳ Importando...' : '📥 Importar para PostgreSQL'}
            </Button>
          </CardContent>
        </Card>

        {status === 'success' && result?.imported && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400">✅ Importação Concluída</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(result.imported).map(([key, count]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{key}</span>
                    <Badge variant="secondary">{count} registros</Badge>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Os dados foram importados para o PostgreSQL do Vultr. Recarregue o app para ver os dados.
              </p>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">❌ Erro na Importação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">{result?.error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Verifique se você está logado e se o arquivo é válido.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
