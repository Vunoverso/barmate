import { redirect } from 'next/navigation';

export default function Home() {
  // Redireciona permanentemente a rota raiz para a página de dashboard.
  redirect('/dashboard');
}
