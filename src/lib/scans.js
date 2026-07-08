import { isSupabaseConfigured, requireSupabase } from './supabase';

export async function insertScan(ean) {
  if (!isSupabaseConfigured) return;
  const supabase = requireSupabase();
  const { error } = await supabase.from('scans').insert({ ean });
  if (error) console.warn('scan insert:', error.message);
}

// Returns array of {ean, scanned_at} deduplicated by EAN (most recent first)
// Returns null on error so callers can fall back to localStorage.
// Pass `limit` to cap the result; omit it to fetch every scan.
export async function getRecentScans(limit) {
  if (!isSupabaseConfigured) return null;
  const supabase = requireSupabase();
  let query = supabase
    .from('scans')
    .select('ean, scanned_at')
    .order('scanned_at', { ascending: false });
  if (limit) query = query.limit(limit * 6);
  const { data, error } = await query;
  if (error) return null;
  const seen = new Set();
  const deduped = (data ?? [])
    .filter(s => { if (seen.has(s.ean)) return false; seen.add(s.ean); return true; });
  return limit ? deduped.slice(0, limit) : deduped;
}
