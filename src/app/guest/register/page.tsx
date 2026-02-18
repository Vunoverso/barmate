
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GuestRegisterPage() {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'pending' | 'approved'>('idle');
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        // Recuperar ID da solicitação se já existir no dispositivo
        const savedId = localStorage.getItem('barmate_guest_request_id');
        if (savedId) {
            setRequestId(savedId);
            setStatus('pending');
        }
    }, []);

    useEffect(() => {
        if (!requestId || !db) return;

        const docRef = doc(db, 'guest_requests', requestId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'approved' && data.associatedOrderId) {
                    localStorage.removeItem('barmate_guest_request_id');
                    router.push(`/my-order/${data.associatedOrderId}`);
                } else if (data.status === 'rejected') {
                    localStorage.removeItem('barmate_guest_request_id');
                    setRequestId(null);
                    setStatus('idle');
                    toast({ title: "Solicitação Recusada", description: "Por favor, tente novamente ou fale com um atendente.", variant: "destructive" });
                }
            }
        });

        return () => unsubscribe();
    }, [requestId, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !db) return;

        setIsSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, 'guest_requests'), {
                name: name.trim(),
                status: 'pending',
                requestedAt: serverTimestamp(),
            });
            localStorage.setItem('barmate_guest_request_id', docRef.id);
            setRequestId(docRef.id);
            setStatus('pending');
        } catch (error) {
            console.error("Erro ao registrar:", error);
            toast({ title: "Erro na Conexão", description: "Não foi possível enviar sua solicitação.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
                <Card className="w-full max-w-md text-center shadow-xl">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                            <Clock className="h-10 w-10 text-primary animate-pulse" />
                        </div>
                        <CardTitle className="text-2xl">Aguardando Liberação</CardTitle>
                        <CardDescription>
                            Olá, <strong>{name || 'Cliente'}</strong>! Sua solicitação foi enviada para o balcão. Por favor, aguarde um instante enquanto vinculamos sua comanda.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Sincronizando em tempo real</p>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => {
                            localStorage.removeItem('barmate_guest_request_id');
                            setRequestId(null);
                            setStatus('idle');
                        }}>Cancelar e Voltar</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                        <UserCircle2 className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black italic tracking-tighter">BarMate</CardTitle>
                    <CardDescription>
                        Bem-vindo! Digite seu nome ou o número da sua mesa para ver sua comanda.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="guestName">Como podemos te chamar?</Label>
                            <Input
                                id="guestName"
                                placeholder="Ex: João - Mesa 5"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12 text-lg"
                                required
                                autoFocus
                            />
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full h-12 text-lg font-bold" 
                            disabled={isSubmitting || !name.trim()}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Entrar na Comanda"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-50">Sua comanda aparecerá automaticamente aqui.</p>
                </CardFooter>
            </Card>
        </div>
    );
}
