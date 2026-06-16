import { createClient } from '@supabase/supabase-js';

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);
export const missingSupabaseMessage = 'Configuration Supabase manquante : ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local.';

export function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(missingSupabaseMessage);
  }
  return supabase;
}

export const supabase = isSupabaseConfigured ? createClient(url, key) : null;
