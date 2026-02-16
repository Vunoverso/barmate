
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GuestRequest } from '@/types';
import { getGuestRequests, saveGuestRequests, getGuestSession, saveGuestSession } from '@/lib/data-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

type GuestStatus = 'FORM' | 'WAITING_APPROVAL' | 'APPROVED';

export default function RegisterClient() {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<GuestStatus>('FORM');
    const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const existingSession = getGuestSession();
        if (existingSession?.guestRequestId) {
            const allRequests = getGuestRequests();
            const myRequest = allRequests.find(r => r.id === existingSession.guestRequestId);
            
            if (myRequest) {
                if (myRequest.status === 'approved' && myRequest.associatedOrderId) {
                    router.replace(`/my-order/${myRequest.associatedOrderId}`);
                } else {
                    setGuestSessionId(myRequest.id);
                    setStatus('WAITING_APPROVAL');
                }
            } else {
                // Clean up stale session
                saveGuestSession(null);
            }
        }
    }, [router]);

    // Poll for approval when in 'WAITING_APPROVAL' state
    useEffect(() => {
        if (status !== 'WAITING_APPROVAL' || !guestSessionId) return;

        const interval = setInterval(() => {
            const allRequests = getGuestRequests();
            const myRequest = allRequests.find(r => r.id === guestSessionId);
            
            if (myRequest?.status === 'approved' && myRequest.associatedOrderId) {
                setStatus('APPROVED');
                router.replace(`/my-order/${myRequest.associatedOrderId}`);
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [status, guestSessionId, router]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ title: 'Nome inválido', description: 'Por favor, insira seu nome.', variant: 'destructive' });
            return;
        }

        const guestId = `guest-${Date.now()}`;

        const newRequest: GuestRequest = {
            id: guestId,
            name: name.trim(),
            status: 'pending',
            requestedAt: new Date().toISOString(),
        };

        const allRequests = getGuestRequests();
        saveGuestRequests([...allRequests, newRequest]);
        
        // Save session to guest's browser
        saveGuestSession({ guestRequestId: guestId });
        setGuestSessionId(guestId);

        setStatus('WAITING_APPROVAL');
    };

    if (status === 'WAITING_APPROVAL' || status === 'APPROVED') {
        return (
             <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Aguardando Aprovação</CardTitle>
                        <CardDescription>Seu pedido de acesso foi enviado. Por favor, aguarde a aprovação de um atendente.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center py-8">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground w-full">Você será redirecionado automaticamente assim que sua comanda for associada.</p>
                    </CardFooter>
                </Card>
             </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Acessar minha comanda</CardTitle>
                        <CardDescription>Digite seu nome para solicitar o acesso e acompanhar seus pedidos em tempo real.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label htmlFor="guestName">Seu Nome</Label>
                        <Input
                            id="guestName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: João da Silva"
                            autoFocus
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full">
                            <Send className="mr-2 h-4 w-4" />
                            Solicitar Acesso
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
