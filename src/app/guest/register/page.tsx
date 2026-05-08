"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle2, Clock, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCounterSaleDraft, removeCounterSaleDraft, saveCounterSaleDraft } from '@/lib/data-access';

const GUEST_NAME_KEY = 'barmate_guest_name';
const GUEST_LAST_ORDER_KEY = 'barmate_last_order_id';
const GUEST_REQUEST_ID_KEY = 'barmate_guest_request_id';
const GUEST_TABLE_LABEL_KEY = 'barmate_guest_table_label';
const GUEST_COMANDA_KEY = 'barmate_guest_comanda_number';
const POLL_INTERVAL_MS = 3500;

type RequestStatus = 'idle' | 'pending' | 'approved';

type PublicGuestRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  associatedOrderId?: string | null;
};

function GuestRegisterPageContent() {
  const [name, setName] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [comandaNumber, setComandaNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const organizationId = useMemo(() => searchParams.get('org')?.trim() || null, [searchParams]);
  const mesaFromQuery = useMemo(() => searchParams.get('mesa')?.trim() || '', [searchParams]);

  useEffect(() => {
    const savedName = getCounterSaleDraft<string>(GUEST_NAME_KEY, '');
    const savedTable = getCounterSaleDraft<string>(GUEST_TABLE_LABEL_KEY, '');
    const savedComanda = getCounterSaleDraft<string>(GUEST_COMANDA_KEY, '');

    if (savedName) setName(savedName);
    if (savedTable) setTableLabel(savedTable);
    if (savedComanda) setComandaNumber(savedComanda);

    if (mesaFromQuery) {
      const normalizedMesa = mesaFromQuery.toUpperCase();
      setTableLabel((current) => current || `Mesa ${normalizedMesa}`);
    }

    const lastOrderId = getCounterSaleDraft<string>(GUEST_LAST_ORDER_KEY, '');
    const savedRequestId = getCounterSaleDraft<string>(GUEST_REQUEST_ID_KEY, '');

    if (lastOrderId && !savedRequestId) {
      router.push(`/my-order/${lastOrderId}`);
      return;
    }

    if (savedRequestId) {
      setRequestId(savedRequestId);
      setStatus('pending');
    }
  }, [mesaFromQuery, router]);

  useEffect(() => {
    if (!requestId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/public/guest-requests/${encodeURIComponent(requestId)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json() as PublicGuestRequest;

        if (data.status === 'approved' && data.associatedOrderId) {
          await saveCounterSaleDraft(GUEST_LAST_ORDER_KEY, data.associatedOrderId);
          removeCounterSaleDraft(GUEST_REQUEST_ID_KEY);
          setStatus('approved');
          router.push(`/my-order/${data.associatedOrderId}`);
          return;
        }

        if (data.status === 'rejected') {
          removeCounterSaleDraft(GUEST_REQUEST_ID_KEY);
          setRequestId(null);
          setStatus('idle');
          toast({ title: 'Solicitação recusada', variant: 'destructive' });
        }
      } catch {
        // Silencioso: o polling tenta novamente no próximo ciclo.
      }
    };

    void pollStatus();
    const interval = setInterval(() => {
      void pollStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [requestId, router, toast]);

  const handleSendRequest = async (intent: 'create' | 'view') => {
    if (!name.trim()) {
      toast({ title: 'Informe seu nome', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    await saveCounterSaleDraft(GUEST_NAME_KEY, name.trim());
    await saveCounterSaleDraft(GUEST_TABLE_LABEL_KEY, tableLabel.trim());
    await saveCounterSaleDraft(GUEST_COMANDA_KEY, comandaNumber.trim());

    try {
      const response = await fetch('/api/public/guest-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          intent,
          tableLabel: tableLabel.trim() || null,
          comandaNumber: comandaNumber.trim() || null,
          organizationId,
        }),
      });

      if (!response.ok) {
        toast({ title: 'Não foi possível enviar a solicitação', variant: 'destructive' });
        return;
      }

      const data = await response.json() as { id?: string };
      if (!data.id) {
        toast({ title: 'Resposta inválida do servidor', variant: 'destructive' });
        return;
      }

      await saveCounterSaleDraft(GUEST_REQUEST_ID_KEY, data.id);
      setRequestId(data.id);
      setStatus('pending');
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelPending = () => {
    removeCounterSaleDraft(GUEST_REQUEST_ID_KEY);
    setRequestId(null);
    setStatus('idle');
  };

  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
              <Clock className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Aguardando liberação</CardTitle>
            <CardDescription>
              {name ? `Olá, ${name}!` : 'Seu pedido está em análise.'} A equipe vai vincular sua comanda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2 mb-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs font-bold opacity-50 uppercase tracking-wide">Atualizando automaticamente</p>
            </div>
            <Button variant="outline" className="w-full" onClick={cancelPending}>Cancelar solicitação</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex items-center justify-center h-24 w-24 rounded-full overflow-hidden bg-background shadow-lg border-4 border-primary/5">
            <QrCode className="h-10 w-10 text-primary/60" />
          </div>
          <CardTitle className="text-2xl font-black uppercase mb-1">Acesso da Mesa</CardTitle>
          <CardDescription>Informe seus dados para abrir/consultar a comanda e pedir pelo cardápio digital.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase opacity-70">Nome e sobrenome</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 text-base font-semibold"
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase opacity-70">Mesa</Label>
              <Input
                value={tableLabel}
                onChange={(event) => setTableLabel(event.target.value)}
                className="h-11"
                placeholder="Ex: Mesa 4"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase opacity-70">Comanda</Label>
              <Input
                value={comandaNumber}
                onChange={(event) => setComandaNumber(event.target.value)}
                className="h-11"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full h-12 text-base font-bold"
              disabled={isSubmitting || !name.trim()}
              onClick={() => void handleSendRequest('create')}
            >
              Solicitar criação de comanda
            </Button>
            <Button
              variant="secondary"
              className="w-full h-12 text-base font-bold"
              disabled={isSubmitting || !name.trim()}
              onClick={() => void handleSendRequest('view')}
            >
              Já tenho comanda
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t py-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-50">
            Após aprovação, você entra direto no cardápio e acompanha sua comanda.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function GuestRegisterFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function GuestRegisterPage() {
  return (
    <Suspense fallback={<GuestRegisterFallback />}>
      <GuestRegisterPageContent />
    </Suspense>
  );
}
