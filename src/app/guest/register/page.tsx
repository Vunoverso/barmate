
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function GuestRegisterPage() {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'pending' | 'approved'>('idle');
    const [barInfo, setBarInfo] = useState({ name: 'BarMate', logo: '', logoScale: 1 });
    
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const savedName = localStorage.getItem('barmate_guest_name');
        if (savedName) setName(savedName);

        const lastOrderId = localStorage.getItem('barmate_last_order_id');
        const savedRequestId = localStorage.getItem('barmate_guest_request_id');
        
        if (lastOrderId && !savedRequestId) {
            router.push(`/my-order/${lastOrderId}`);
            return;
        }

        if (savedRequestId) {
            setRequestId(savedRequestId);
            setStatus('pending');
        }
    }, [router]);

    useEffect(() => {
        if (!db) return;
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBarInfo({
                    name: data.barName || 'BarMate',
                    logo: data.barLogo || '',
                    logoScale: data.barLogoScale || 1
                });
            }
        }, async (err) => {
            const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!requestId || !db) return;
        const requestRef = doc(db, 'guest_requests', requestId);
        const unsubscribe = onSnapshot(requestRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'approved' && data.associatedOrderId) {
                    localStorage.setItem('barmate_last_order_id', data.associatedOrderId);
                    localStorage.removeItem('barmate_guest_request_id');
                    router.push(`/my-order/${data.associatedOrderId}`);
                } else if (data.status === 'rejected') {
                    localStorage.removeItem('barmate_guest_request_id');
                    setRequestId(null);
                    setStatus('idle');
                    toast({ title: "Solicitação Recusada", variant: "destructive" });
                }
            }
        }, async (err) => {
            const permissionError = new FirestorePermissionError({
                path: requestRef.path,
                operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
        return () => unsubscribe();
    }, [requestId, router, toast]);

    const handleSendRequest = async (intent: 'create' | 'view') => {
        if (!name.trim() || !db) return;
        setIsSubmitting(true);
        localStorage.setItem('barmate_guest_name', name.trim());
        
        const requestData = {
            name: name.trim(),
            status: 'pending',
            intent: intent,
            requestedAt: serverTimestamp(),
        };

        const requestsCol = collection(db, 'guest_requests');

        addDoc(requestsCol, requestData)
            .then((docRef) => {
                localStorage.setItem('barmate_guest_request_id', docRef.id);
                setRequestId(docRef.id);
                setStatus('pending');
            })
            .catch(async (error) => {
                const permissionError = new FirestorePermissionError({
                    path: requestsCol.path,
                    operation: 'create',
                    requestResourceData: requestData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => { 
                setIsSubmitting(false); 
            });
    };

    if (status === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
                <Card className="w-full max-w-md text-center shadow-xl">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4"><Clock className="h-10 w-10 text-primary animate-pulse" /></div>
                        <CardTitle className="text-2xl">Aguardando Liberação</CardTitle>
                        <CardDescription>Olá, <strong>{name}</strong>! Sua solicitação foi enviada.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center gap-2 mb-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><p className="text-xs font-bold opacity-50">SINCRO EM TEMPO REAL</p></div>
                        <Button variant="outline" className="w-full" onClick={() => { localStorage.removeItem('barmate_guest_request_id'); setRequestId(null); setStatus('idle'); }}>Cancelar</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary overflow-hidden">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 flex items-center justify-center h-32 w-32 rounded-full overflow-hidden bg-background shadow-lg border-4 border-primary/5">
                        {barInfo.logo ? (
                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
                                <img 
                                    src={barInfo.logo} 
                                    alt="Logo" 
                                    className="max-w-none transition-transform" 
                                    style={{ transform: `scale(${barInfo.logoScale})`, width: '128px', height: '128px', objectFit: 'contain' }}
                                />
                            </div>
                        ) : (
                            <UserCircle2 className="h-16 w-16 text-primary/20" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-black uppercase mb-1">{barInfo.name}</CardTitle>
                    <CardDescription>Identifique-se para acessar seu consumo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase opacity-70">Nome e Sobrenome</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-lg font-semibold" placeholder="Ex: João Silva" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button className="w-full h-14 text-lg font-bold flex flex-col" disabled={isSubmitting || !name.trim()} onClick={() => handleSendRequest('create')}>
                            <span>Solicitar Criação de Comanda</span>
                            <span className="text-[10px] font-normal opacity-70">Ainda não tenho uma conta</span>
                        </Button>
                        <Button variant="secondary" className="w-full h-14 text-lg font-bold flex flex-col" disabled={isSubmitting || !name.trim()} onClick={() => handleSendRequest('view')}>
                            <span>Ver Minha Comanda Aberta</span>
                            <span className="text-[10px] font-normal opacity-70">Já estou consumindo</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="justify-center border-t py-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-50">Sincronização Online BarMate</p>
                </CardFooter>
            </Card>
        </div>
    );
}
