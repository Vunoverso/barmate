
import OutputCheckerClient from "@/app/output-checker/components/output-checker-client";

export default function OutputCheckerPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Verificação de Saídas</h1>
      </div>
      <OutputCheckerClient />
    </div>
  );
}
