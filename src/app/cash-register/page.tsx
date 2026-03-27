
import CashRegisterClient from "@/app/cash-register/components/cash-register-client";

export default function CashRegisterPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestão de Caixa</h1>
      </div>
      <CashRegisterClient />
    </div>
  );
}
