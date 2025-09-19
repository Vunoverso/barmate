
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HandCoins, Store, Banknote, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const version = "v1.3.1";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as funções mais importantes com um clique.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/orders" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <HandCoins className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Comandas</span>
                    <span className="text-xs font-normal text-muted-foreground">Gerenciar comandas</span>
                </Button>
            </Link>
            <Link href="/counter-sale" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <Store className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Venda Balcão</span>
                    <span className="text-xs font-normal text-muted-foreground">Realizar venda rápida</span>
                </Button>
            </Link>
            <Link href="/cash-register" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <Banknote className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Ir para o Caixa</span>
                    <span className="text-xs font-normal text-muted-foreground">Gerenciar caixa diário</span>
                </Button>
            </Link>
            <Link href="/financial" passHref>
                <Button size="lg" className="w-full h-24 flex-col items-start justify-start p-4" variant="outline">
                    <TrendingUp className="h-6 w-6 mb-2" />
                    <span className="text-base font-semibold">Financeiro</span>
                    <span className="text-xs font-normal text-muted-foreground">Ver relatórios</span>
                </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <footer className="flex justify-center p-4 mt-auto">
        <span className="text-xs text-muted-foreground">{version}</span>
      </footer>
    </div>
  );
}
