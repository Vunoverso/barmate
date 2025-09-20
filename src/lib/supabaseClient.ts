
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// As variáveis de ambiente são mantidas para possível reintegração futura,
// mas o cliente não será mais inicializado por padrão.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// O cliente Supabase é inicializado como nulo para desativar a conectividade em nuvem.
// O aplicativo funcionará em modo 100% localStorage.
export const supabase: ReturnType<typeof createClient<Database>> | null = null;
