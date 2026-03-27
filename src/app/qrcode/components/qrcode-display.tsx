
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Printer, QrCode } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function QRCodeDisplay() {
    const [registerUrl, setRegisterUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Force origin to reflect the current port (useful for cloud workstations)
            let origin = window.location.origin;
            
            // If in Studio environment and needs to fix port to 9000
            if (origin.includes('cloudworkstations.dev') && !origin.includes('9000-')) {
                origin = origin.replace(/\d+-/, '9000-');
            }

            const url = `${origin}/guest/register`;
            setRegisterUrl(url);
            setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`);
        }
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(registerUrl).then(() => {
            toast({ title: "Link copiado!", description: "O link de cadastro foi copiado." });
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col items-center text-center">
                <CardHeader>
                    <CardTitle>QR Code de Auto-Cadastro</CardTitle>
                    <CardDescription>
                        Imprima este código e coloque nas mesas. O cliente escaneia, digita o nome e aguarda você liberar a comanda.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 pb-8">
                    <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-primary/10">
                        {qrCodeUrl ? (
                            <Image
                                src={qrCodeUrl}
                                alt="QR Code Geral"
                                width={300}
                                height={300}
                                className="rounded-lg print:w-[15cm]"
                                unoptimized
                            />
                        ) : (
                            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted animate-pulse rounded-lg">
                                <QrCode className="h-12 w-12 text-muted-foreground opacity-20" />
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full space-y-2 text-left">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Link Direto</Label>
                        <div className="flex gap-2">
                            <Input value={registerUrl} readOnly className="bg-muted/50" />
                            <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <Button className="w-full" size="lg" onClick={handlePrint}>
                        <Printer className="mr-2 h-5 w-5" /> Imprimir QR Code
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Como utilizar?</CardTitle>
                    <CardDescription>Instruções para o fluxo de atendimento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">1</div>
                        <p className="text-sm">O cliente chega e escaneia este QR Code.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">2</div>
                        <p className="text-sm">Ele digita o nome dele (ex: "Carlos - Mesa 4") e clica em entrar.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">3</div>
                        <p className="text-sm">No seu painel de <strong>Comandas</strong>, aparecerá uma notificação de "Cliente Aguardando".</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">4</div>
                        <p className="text-sm">Você escolhe uma comanda já aberta ou cria uma nova para ele. Pronto! O cliente já visualiza os itens no celular.</p>
                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
                @media print {
                    nav, header, aside, .no-print, button {
                        display: none !important;
                    }
                    .print-area {
                        display: block !important;
                    }
                    body {
                        background: white;
                    }
                    .card {
                        border: none !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
