import DashboardPage from "./dashboard/page";

// Isso garante que a rota raiz "/" renderize o conteúdo do dashboard.
export default function Home() {
  return <DashboardPage />;
}
