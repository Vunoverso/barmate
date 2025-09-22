
import ClientsClient from "@/app/clients/components/clients-client";

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gerenciamento de Clientes</h1>
      </div>
      <ClientsClient />
    </div>
  );
}
