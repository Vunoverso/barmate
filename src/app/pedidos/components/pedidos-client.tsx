
"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import type { ActiveOrder, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, CheckCircle2, Clock, Printer, QrCode, Copy, CheckSquare, Square, Utensils } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { getCurrentOrgId } from '@/lib/data-access';

const KITCHEN_CATEGORIES = ['cat_lanches', 'cat_porcoes', 'cat_sobremesas'];

export default function PedidosClient() {
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShareDialogOpenState, setIsShareDialogOpenState] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const { toast } = useToast();
    const orgId = getCurrentOrgId();

    useEffect(() => {
        if (!db || !orgId) return;
        
        // Filtro por organizationId para isolar dados de diferentes bares
        const q = query(collection(db, 'open_orders'), where('organizationId', '==', orgId));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            } as any));
            setOrders(data);
            setIsLoading(false);
        }, async (err) => {
            const permissionError = new FirestorePermissionError({
                path: 'open_orders',
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
        return () => unsubscribe();
    }, [orgId]);

    const isDateToday = (dateSource?: string | Date) => {
        if (!dateSource) return false;
        return isToday(new Date(dateSource));
    };

    const groupedKitchenOrders = useMemo(() => {
        const groups: Record<string, { id: string, orderName: string, createdAt: Date, items: OrderItem[] }> = {};
        
        orders.forEach(order => {
            const pendingItems = order.items.filter(item => {
                const isKitchenCategory = KITCHEN_CATEGORIES.includes(item.categoryId || '');
                const isNotDelivered = !item.isDelivered;
                const isNewOrForced = isDateToday(item.addedAt) || item.forceKitchenVisible === true;
                
                return isKitchenCategory && isNotDelivered && isNewOrForced;
            });
            
            if (pendingItems.length > 0) {
                groups[order.id] = {
                    id: order.id,
                    orderName: order.name,
                    createdAt: order.createdAt,
                    items: pendingItems
                };
            }
        });
        
        return Object.values(groups).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [orders]);

    const handleUpdateItemStatus = async (orderId: string, lineItemId: string, updates: Partial<OrderItem>) => {
        if (!db) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => 
            item.lineItemId === lineItemId ? { ...item, ...updates } : item
        );

        const docRef = doc(db, 'open_orders', orderId);
        const data = { 
            items: updatedItems,
            updatedAt: new Date().toISOString()
        };

        updateDoc(docRef, data)
            .then(() => {
                if (updates.isDelivered) toast({ title: "Item entregue!" });
                else if (updates.isReady) toast({ title: "Sinalizado como pronto!" });
            })
            .catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: data,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const selectAllOrders = () => {
        if (selectedOrderIds.length === groupedKitchenOrders.length) {
            setSelectedOrderIds([]);
        } else {
            setSelectedOrderIds(groupedKitchenOrders.map(o => o.id));
        }
    };

    const handlePrintSelected = () => {
        const ordersToPrintRaw = selectedOrderIds.length > 0 
            ? groupedKitchenOrders.filter(o => selectedOrderIds.includes(o.id))
            : groupedKitchenOrders;

        const ordersToPrint = ordersToPrintRaw.map(group => ({
            ...group,
            items: group.items.filter(item => !item.isPreparing)
        })).filter(group => group.items.length > 0);

        if (ordersToPrint.length === 0) {
            toast({ title: "Nada para imprimir", description: "Todos os itens selecionados já estão em produção ou não há novos itens.", variant: "destructive" });
            return;
        }

        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            const content = ordersToPrint.map(group => {
                const itemsHtml = group.items.map(item => `
                    <div style="margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px;">
                        <span style="font-size: 28px; font-weight: 900; line-height: 1;">${item.quantity}x</span>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 22px; font-weight: bold; line-height: 1.1; text-transform: uppercase;">${item.name}</span>
                            <span style="font-size: 14px; font-weight: normal; opacity: 0.8; margin-top: 2px;">
                                VALOR: ${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>
                `).join('');

                return `
                    <div style="margin-bottom: 40px; page-break-after: always; border: 2px solid black; padding: 15px; border-radius: 8px;">
                        <div style="text-align: center; border-bottom: 2px dashed black; padding-bottom: 10px; margin-bottom: 15px;">
                            <h1 style="font-size: 32px; font-weight: 900; margin: 0; text-transform: uppercase;">${group.orderName}</h1>
                            <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">
                                ABERTO HÁ: ${formatDistanceToNow(group.createdAt, { locale: ptBR })}
                            </div>
                        </div>
                        <div style="text-align: left;">
                            ${itemsHtml}
                        </div>
                        <div style="text-align: center; border-top: 2px dashed black; margin-top: 15px; padding-top: 10px; font-size: 12px; font-weight: bold;">
                            EMISSÃO: ${new Date().toLocaleTimeString('pt-BR')} - BAR MATE
                        </div>
                    </div>
                `;
            }).join('<div style="border-top: 4px double black; margin: 30px 0;"></div>');

            printWindow.document.write(`
                <html>
                <head>
                    <title>Impressão de Produção</title>
                    <style>
                        body { font-family: sans-serif; padding: 0; margin: 0; background: white; color: black; }
                        @media print {
                            body { width: 100%; margin: 0; padding: 5px; }
                            @page { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div style="padding: 10px;">
                        ${content}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-20"><ChefHat className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpenState(true)}>
                        <QrCode className="mr-2 h-4 w-4" /> Monitor de Cozinha
                    </Button>
                    <Button 
                        variant={selectedOrderIds.length > 0 ? "secondary" : "outline"} 
                        size="sm" 
                        onClick={selectAllOrders}
                    >
                        {selectedOrderIds.length === groupedKitchenOrders.length ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                        {selectedOrderIds.length === groupedKitchenOrders.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </Button>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Badge variant="secondary" className="font-black text-xs px-3">
                        {groupedKitchenOrders.length} {groupedKitchenOrders.length === 1 ? 'MESA' : 'MESAS'} HOJE
                    </Badge>
                    <Button 
                        className="flex-1 sm:flex-none font-black uppercase text-xs h-9" 
                        onClick={handlePrintSelected}
                        disabled={groupedKitchenOrders.length === 0}
                    >
                        <Printer className="mr-2 h-4 w-4" /> 
                        {selectedOrderIds.length > 0 ? `IMPRIMIR NOVOS (${selectedOrderIds.length})` : "IMPRIMIR TUDO"}
                    </Button>
                </div>
            </div>

            {groupedKitchenOrders.length === 0 ? (
                <Card className="text-center py-20 bg-muted/20 border-dashed border-2">
                    <CardHeader>
                        <ChefHat className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                        <CardTitle className="text-muted-foreground">Nenhum pedido pendente hoje</CardTitle>
                        <CardDescription>Lanches e porções aparecerão aqui automaticamente.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupedKitchenOrders.map((group) => {
                        const isSelected = selectedOrderIds.includes(group.id);
                        return (
                            <Card key={group.id} className={`border-t-4 shadow-xl flex flex-col transition-all cursor-pointer ${isSelected ? 'border-t-primary scale-[1.02] ring-2 ring-primary/20' : 'border-t-muted-foreground/30 opacity-80'}`} onClick={() => toggleOrderSelection(group.id)}>
                                <CardHeader className="pb-3 bg-muted/5">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleOrderSelection(group.id)}
                                                    className="h-5 w-5 border-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <Badge className={`text-xl font-black uppercase px-3 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    {group.orderName}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center text-[10px] text-muted-foreground font-bold uppercase pt-1">
                                                <Clock className="mr-1 h-3 w-3" />
                                                Aguardando {formatDistanceToNow(group.createdAt, { locale: ptBR })}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground"
                                            onClick={(e) => { e.stopPropagation(); handlePrintSelected(); }}
                                        >
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <Separator />
                                <CardContent className="flex-grow pt-4 space-y-4">
                                    {group.items.map((item) => (
                                        <div key={item.lineItemId} className="flex flex-col gap-2 p-2 rounded-lg border border-transparent transition-colors hover:bg-muted/30">
                                            <div className="flex items-center justify-between gap-3 group">
                                                <div className="flex items-start gap-2 min-w-0">
                                                    <span className="text-primary font-black text-xl leading-none">{item.quantity}x</span>
                                                    <div className="min-w-0">
                                                        <span className={item.isReady ? "text-blue-600 line-through font-bold text-sm uppercase leading-tight truncate block" : "font-bold text-sm uppercase leading-tight truncate block"}>
                                                            {item.name}
                                                        </span>
                                                        {item.forceKitchenVisible && (
                                                            <span className="text-[8px] font-black text-orange-600 uppercase">Envio Manual</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <Button 
                                                        size="sm" 
                                                        variant={item.isPreparing ? "default" : "outline"} 
                                                        className={`h-8 w-8 rounded-full ${item.isPreparing ? 'bg-orange-500 hover:bg-orange-600' : 'text-muted-foreground'}`}
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateItemStatus(group.id, item.lineItemId!, { isPreparing: !item.isPreparing, isReady: false }); }}
                                                        title={item.isPreparing ? "Em Produção" : "Começar Produção"}
                                                    >
                                                        <Clock className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant={item.isReady ? "default" : "outline"} 
                                                        className={`h-8 w-8 rounded-full ${item.isReady ? 'bg-blue-600 hover:bg-blue-700' : 'text-muted-foreground'}`}
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateItemStatus(group.id, item.lineItemId!, { isReady: !item.isReady, isPreparing: false }); }}
                                                        title="Pronto para Mesa"
                                                    >
                                                        <Utensils className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary" 
                                                        className="h-8 w-8 rounded-full hover:bg-green-600 hover:text-white transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateItemStatus(group.id, item.lineItemId!, { isDelivered: true, isPreparing: false, isReady: false }); }}
                                                        title="Marcar como Entregue"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {item.isPreparing && (
                                                <Badge variant="outline" className="w-fit text-[9px] font-black text-orange-600 border-orange-500/30 bg-orange-500/5 uppercase tracking-widest animate-pulse">
                                                    Em Produção
                                                </Badge>
                                            )}
                                            {item.isReady && (
                                                <Badge variant="outline" className="w-fit text-[9px] font-black text-blue-600 border-blue-500/30 bg-blue-500/5 uppercase tracking-widest animate-bounce">
                                                    PRONTO P/ SERVIR
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="pt-2 pb-4 bg-muted/5 mt-auto" onClick={(e) => e.stopPropagation()}>
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs h-10"
                                        onClick={async () => {
                                            for(const item of group.items) {
                                                await handleUpdateItemStatus(group.id, item.lineItemId!, { isDelivered: true, isPreparing: false, isReady: false });
                                            }
                                        }}
                                    >
                                        ENTREGAR TUDO
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            <ShareKitchenDialog isOpen={isShareDialogOpenState} onOpenChange={setIsShareDialogOpenState} />
        </div>
    );
}

function ShareKitchenDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (o: boolean) => void }) {
    const [url, setUrl] = useState('');
    const { toast } = useToast();
    
    useEffect(() => {
        if (isOpen) {
            let origin = window.location.origin;
            if (origin.includes('cloudworkstations.dev') && !origin.includes('9000-')) origin = origin.replace(/\d+-/, '9000-');
            setUrl(`${origin}/kitchen-view`);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Monitor da Cozinha</DialogTitle>
                    <DialogDescription>Use este QR Code para abrir os pedidos em um tablet ou celular na cozinha.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-4 rounded-xl border-2 border-primary/10">
                        {url && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`} alt="QR Code Cozinha" className="w-48 h-48" />}
                    </div>
                    <div className="flex gap-2 w-full">
                        <Input value={url} readOnly />
                        <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Link copiado!" }); }}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
