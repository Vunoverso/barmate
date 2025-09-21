import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// A conexão com o Supabase está desativada para forçar o modo 100% local.
// Todos os dados serão lidos e salvos no localStorage do navegador.
export const supabase = null;
