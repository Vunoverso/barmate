
import FinancialClient from "@/app/financial/components/financial-client";

export default function FinancialPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Controle Financeiro</h1>
      </div>
      <FinancialClient />
    </div>
  );
}
