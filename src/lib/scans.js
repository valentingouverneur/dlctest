import { isSupabaseConfigured, requireSupabase } from './supabase';

export async function insertScan(ean) {
  if (!isSupabaseConfigured) return;
  const supabase = requireSupabase();
  const { error } = await supabase.from('scans').insert({ ean });
  if (error) console.warn('scan insert:', error.message);
}

// Returns array of {ean, scanned_at} deduplicated by EAN (most recent first)
// Returns null on error so callers can fall back to localStorage
export async function getRecentScans(limit = 20) {
  if (!isSupabaseConfigured) return null;
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('scans')
    .select('ean, scanned_at')
    .order('scanned_at', { ascending: false })
    .limit(limit * 6);
  if (error) return null;
  const seen = new Set();
  return (data ?? [])
    .filter(s => { if (seen.has(s.ean)) return false; seen.add(s.ean); return true; })
    .slice(0, limit);
}
