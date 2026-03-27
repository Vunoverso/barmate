

import ReportsClient from "@/app/reports/components/reports-client";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Relatórios e Análises</h1>
      </div>
      <ReportsClient />
    </div>
  );
}
