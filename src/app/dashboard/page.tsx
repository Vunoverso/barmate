
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HandCoins, PartyPopper } from "lucide-react";

export default function DashboardPage() {
  const version = "v1.3.2";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
           <div className="mx-auto bg-muted rounded-full p-4 w-fit mb-4">
              <PartyPopper className="h-12 w-12 text-primary" />
            </div>
          <CardTitle>Bem-vindo ao BarMate!</CardTitle>
          <CardDescription>Seu sistema de gestão para bares está pronto para começar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/orders" passHref>
            <Button size="lg">
              <HandCoins className="mr-2 h-5 w-5" />
              Começar a Gerenciar Comandas
            </Button>
          </Link>
        </CardContent>
      </Card>
       <footer className="absolute bottom-4">
        <span className="text-xs text-muted-foreground">{version}</span>
      </footer>
    </div>
  );
}
