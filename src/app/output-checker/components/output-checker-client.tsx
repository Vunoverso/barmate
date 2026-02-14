
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function OutputCheckerClient() {

  return (
    <Card>
        <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
              <ClipboardCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center">Verificação de Saídas</CardTitle>
            <CardDescription className="text-center">
                Esta tela está em desenvolvimento.
                <br />
                Aqui você poderá conferir os itens de cada comanda antes da saída, com verificação manual e auxílio de IA.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-muted-foreground">Em breve...</p>
        </CardContent>
    </Card>
  );
}
