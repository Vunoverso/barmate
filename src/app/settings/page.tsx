
import SettingsClient from "@/app/settings/components/settings-client";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </div>
      <SettingsClient />
    </div>
  );
}
