"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QRCodePage() {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [pageUrl, setPageUrl] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = `${window.location.protocol}//${window.location.host}/guest/register`;
            setPageUrl(url);
            setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`);
        }
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(pageUrl).then(() => {
            toast({ title: "Link copiado!", description: "O link de acesso do cliente foi copiado para sua área de transferência." });
        }).catch(err => {
            console.error('Failed to copy: ', err);
            toast({ title: "Erro ao copiar", description: "Não foi possível copiar o link.", variant: "destructive" });
        });
    };

    return (
        <div className="flex flex-col gap-6 items-center">
            <div className="text-center">
                 <h1 className="text-2xl font-semibold">Acesso do Cliente via QR Code</h1>
                 <p className="text-muted-foreground mt-2">Exiba este QR Code ou compartilhe o link para que seus clientes possam acompanhar as comandas.</p>
            </div>
           
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>QR Code para Clientes</CardTitle>
                    <CardDescription>
                        Imprima e coloque este código nas mesas do seu estabelecimento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4">
                    {qrCodeUrl ? (
                        <Image
                            src={qrCodeUrl}
                            alt="QR Code para acesso do cliente"
                            width={250}
                            height={250}
                            className="rounded-lg border"
                            unoptimized
                        />
                    ) : (
                        <div className="h-[250px] w-[250px] bg-muted rounded-lg flex items-center justify-center">
                            <p className="text-muted-foreground">Gerando QR Code...</p>
                        </div>
                    )}
                     <div className="w-full space-y-2 text-center">
                        <p className="text-sm font-medium">Ou compartilhe este link:</p>
                        <div className="flex w-full items-center space-x-2">
                            <Input value={pageUrl} readOnly />
                            <Button type="button" size="icon" onClick={copyToClipboard}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
