"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (response?.error) {
      setError('Email ou senha invalidos.');
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070A] p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1016] p-8">
        <h1 className="text-3xl font-black">Entrar</h1>
        <p className="mt-2 text-white/65">Acesso ao painel da sua operacao.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none"
            placeholder="Seu email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none"
            placeholder="Sua senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-[#22d3c5] px-4 py-3 font-bold text-[#062621] disabled:opacity-60">
            {isLoading ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </form>

        <p className="mt-6 text-sm text-white/60">
          Ainda nao tem conta?{' '}
          <Link href="/cadastro" className="font-semibold text-[#22d3c5]">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#05070A] p-6 text-white">Carregando...</main>}>
      <LoginPageContent />
    </Suspense>
  );
}
