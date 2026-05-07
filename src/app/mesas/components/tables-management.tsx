"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TablesManagement() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Gestão de Mesas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Configure as mesas do seu estabelecimento e gere QR Codes para o cardápio digital.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/qrcode">Ver QR Codes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
