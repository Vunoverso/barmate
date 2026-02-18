
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle2, Clock, PlusCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GuestRegisterPage() {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'pending' | 'approved'>('idle');
    const [barInfo, setBarInfo] = useState({ name: 'BarMate', logo: '', logoScale: 1 });
    
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('barmate_guest_request_id') : null;
        if (savedId) {
            setRequestId(savedId);
            setStatus('pending');
        }
    }, []);

    // Busca marca e logo em tempo real da nuvem
    useEffect(() => {
        if (!db) return;
        const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBarInfo({
                    name: data.barName || 'BarMate',
                    logo: data.barLogo || '',
                    logoScale: data.barLogoScale || 1
                });
            }
        });
        return () => unsubscribe();
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
                    toast({ title: "Solicitação Recusada", description: "Por favor, fale com um atendente.", variant: "destructive" });
                }
            }
        });

        return () => unsubscribe();
    }, [requestId, router, toast]);

    const handleSendRequest = async (intent: 'create' | 'view') => {
        if (!name.trim() || !db) {
            toast({ title: "Atenção", description: "Por favor, digite seu Nome e Sobrenome.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, 'guest_requests'), {
                name: name.trim(),
                status: 'pending',
                intent: intent,
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
                            Olá, <strong>{name || 'Cliente'}</strong>! Sua solicitação foi enviada. Aguarde enquanto vinculamos sua comanda.
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
                        }}>Cancelar</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-6 flex items-center justify-center min-h-[140px] w-full">
                        {barInfo.logo ? (
                            <img 
                                src={barInfo.logo} 
                                alt="Logo" 
                                className="h-32 w-auto max-w-full object-contain transition-transform duration-200" 
                                style={{ transform: `scale(${barInfo.logoScale})` }}
                            />
                        ) : (
                            <div className="bg-primary/10 rounded-full p-4 w-fit mx-auto">
                                <UserCircle2 className="h-10 w-10 text-primary" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-2xl font-black italic tracking-tighter uppercase mb-1">{barInfo.name}</CardTitle>
                    <CardDescription>Identifique-se para acessar seu consumo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="guestName" className="font-bold text-xs uppercase opacity-70">Nome e Sobrenome</Label>
                        <Input
                            id="guestName"
                            placeholder="Ex: João Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 text-lg font-semibold"
                            required
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <Button 
                            className="w-full h-14 text-lg font-bold flex flex-col items-center justify-center" 
                            disabled={isSubmitting || !name.trim()}
                            onClick={() => handleSendRequest('create')}
                        >
                            <span className="flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Solicitar Nova Comanda</span>
                            <span className="text-[10px] opacity-70 font-normal">Quero começar a consumir</span>
                        </Button>

                        <Button 
                            variant="secondary"
                            className="w-full h-14 text-lg font-bold flex flex-col items-center justify-center" 
                            disabled={isSubmitting || !name.trim()}
                            onClick={() => handleSendRequest('view')}
                        >
                            <span className="flex items-center gap-2"><Search className="h-5 w-5" /> Ver Minha Comanda Aberta</span>
                            <span className="text-[10px] opacity-70 font-normal">Já tenho uma conta ativa</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="justify-center border-t pt-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-50 text-center">
                        {isSubmitting ? "Sincronizando..." : "Sua comanda aparecerá automaticamente após o vínculo."}
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
