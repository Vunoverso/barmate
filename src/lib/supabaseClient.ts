import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? getSupabaseClient(supabaseUrl, supabaseAnonKey)
  : null;

type GlobalWithSupabase = typeof globalThis & {
  __barmateSupabaseClient?: SupabaseClient;
};

function getSupabaseClient(url: string, key: string) {
  const globalRef = globalThis as GlobalWithSupabase;
  if (globalRef.__barmateSupabaseClient) {
    return globalRef.__barmateSupabaseClient;
  }

  // O app usa next-auth para sessao; desativar auth do supabase evita locks de token no browser.
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  globalRef.__barmateSupabaseClient = client;
  return client;
}
