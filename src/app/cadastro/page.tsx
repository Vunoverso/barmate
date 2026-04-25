"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function CadastroPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        tradeName,
        legalName: tradeName,
        document,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.message || 'Nao foi possivel criar a conta.');
      setIsLoading(false);
      return;
    }

    const loginResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/dashboard',
    });

    setIsLoading(false);

    if (loginResult?.error) {
      router.push('/login');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070A] p-6 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0A1016] p-8">
        <h1 className="text-3xl font-black">Criar conta e iniciar teste de 7 dias</h1>
        <p className="mt-2 text-white/65">Primeiro passo para ativar sua organizacao no BarMate SaaS.</p>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none"
            placeholder="Nome completo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none"
            placeholder="Nome do estabelecimento"
            value={tradeName}
            onChange={(event) => setTradeName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none"
            placeholder="Documento (CNPJ/CPF)"
            value={document}
            onChange={(event) => setDocument(event.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none md:col-span-2"
            placeholder="Crie uma senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
          <button type="submit" disabled={isLoading} className="rounded-lg bg-[#22d3c5] px-4 py-3 font-bold text-[#062621] md:col-span-2 disabled:opacity-60">
            {isLoading ? 'Criando conta...' : 'Ativar teste gratis'}
          </button>
        </form>

        <p className="mt-6 text-sm text-white/60">
          Ja possui acesso?{' '}
          <Link href="/login" className="font-semibold text-[#22d3c5]">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
