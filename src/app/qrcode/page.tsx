import QRCodeDisplay from './components/qrcode-display';
import GuestRequestsClient from './components/guest-requests-client';

export default function QRCodePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Acesso e Aprovação de Clientes</h1>
        <p className="text-muted-foreground mt-2">Use o QR Code para acesso do cliente e gerencie as solicitações pendentes abaixo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <QRCodeDisplay />
        </div>
        <div className="lg:col-span-2">
            <GuestRequestsClient />
        </div>
      </div>
    </div>
  );
}
