export type BackendProvider = 'firebase' | 'supabase';

const configuredProvider = process.env.NEXT_PUBLIC_BACKEND_PROVIDER;

export const backendProvider: BackendProvider = configuredProvider === 'supabase'
  ? 'supabase'
  : 'firebase';

export const isFirebaseProvider = backendProvider === 'firebase';
export const isSupabaseProvider = backendProvider === 'supabase';