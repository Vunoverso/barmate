
import QRCodeDisplay from "./components/qrcode-display";

export default function QRCodePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">QR Code Geral do Bar</h1>
      </div>
      <QRCodeDisplay />
    </div>
  );
}
