
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GuestRequest } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

type GuestStatus = 'FORM' | 'WAITING_APPROVAL' | 'APPROVED';
const SESSION_STORAGE_KEY = 'barmate_guest_request_id';

export default function RegisterClient() {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<GuestStatus>('FORM');
    const [guestRequestId, setGuestRequestId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const existingRequestId = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (existingRequestId) {
            setGuestRequestId(existingRequestId);
            setStatus('WAITING_APPROVAL');
        }
    }, []);

    // Listen for approval when in 'WAITING_APPROVAL' state
    useEffect(() => {
        if (status !== 'WAITING_APPROVAL' || !guestRequestId) return;

        const requestDocRef = doc(db, 'guestRequests', guestRequestId);
        
        const unsubscribe = onSnapshot(requestDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const myRequest = docSnap.data() as GuestRequest;
                if (myRequest.status === 'approved' && myRequest.associatedOrderId) {
                    setStatus('APPROVED');
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                    router.replace(`/my-order/${myRequest.associatedOrderId}`);
                }
            } else {
                // The request was likely rejected and deleted
                setStatus('FORM');
                setGuestRequestId(null);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                toast({
                    title: 'Solicitação não encontrada',
                    description: 'Sua solicitação pode ter sido rejeitada. Por favor, tente novamente.',
                    variant: 'destructive',
                });
            }
        }, (error) => {
            console.error("Error listening to request:", error);
            toast({
                title: 'Erro de conexão',
                description: 'Não foi possível verificar o status da sua solicitação.',
                variant: 'destructive'
            });
        });

        return () => unsubscribe();
    }, [status, guestRequestId, router, toast]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ title: 'Nome inválido', description: 'Por favor, insira seu nome.', variant: 'destructive' });
            return;
        }
        
        setStatus('WAITING_APPROVAL');

        try {
            const newRequest: Omit<GuestRequest, 'id'> = {
                name: name.trim(),
                status: 'pending',
                requestedAt: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, "guestRequests"), newRequest);
            
            // Save session to guest's browser
            sessionStorage.setItem(SESSION_STORAGE_KEY, docRef.id);
            setGuestRequestId(docRef.id);

        } catch (error) {
            console.error("Error creating guest request:", error);
            toast({
                title: 'Erro ao solicitar acesso',
                description: 'Não foi possível enviar sua solicitação. Tente novamente.',
                variant: 'destructive'
            });
            setStatus('FORM');
        }
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
