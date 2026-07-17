import { supabase, isSupabaseConfigured } from './supabase';

function mapError(error) {
  if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
    return new Error('TABLE_MISSING');
  }
  if (error.code === 'PGRST204' || error.code === '42703' || /column|constraint/i.test(error.message || '')) {
    return new Error('MIGRATION_MISSING');
  }
  return new Error(error.message || 'Erreur de sauvegarde');
}

/**
 * Save (upsert) an analysis. Identity = (rayon, week_label); when either is null
 * (no footer in the CSV) the row simply inserts — NULLs never conflict.
 */
export async function saveAnalysis({ fileName, label, rayon, rayonCode, weekLabel, periodDate, stats, rows }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré');
  }

  const payload = {
    file_name: label || fileName,
    stats: {
      total: stats.total,
      totalMpaf: stats.totalMpaf,
      totalUvc: stats.totalUvc,
      totalCasse: stats.totalCasse,
      count: stats.count,
      topCa: stats.topCa,
      topMpaf: stats.topMpaf,
      topEff: stats.topEff,
      stars: stats.stars,
      risky: stats.risky,
      zeros: stats.zeros,
      casse: stats.casse,
    },
    total_ca: stats.total,
    total_mpaf: stats.totalMpaf,
    total_uvc: stats.totalUvc,
    total_casse: stats.totalCasse,
    product_count: stats.count,
    rows,
    rayon,
    rayon_code: rayonCode,
    week_label: weekLabel,
    period_date: periodDate,
  };

  const { data, error } = await supabase
    .from('analyses')
    .upsert(payload, { onConflict: 'rayon,week_label' })
    .select('id')
    .single();

  if (error) throw mapError(error);
  return data.id;
}

/**
 * Load all saved analyses (summary list, newest first).
 */
export async function listAnalyses() {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('analyses')
    .select('id, created_at, file_name, total_ca, total_mpaf, total_uvc, total_casse, product_count, rayon, week_label, period_date')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    // Migration not applied yet: fall back to the legacy column set.
    const legacy = await supabase
      .from('analyses')
      .select('id, created_at, file_name, total_ca, total_mpaf, product_count')
      .order('created_at', { ascending: false })
      .limit(50);
    if (legacy.error) throw new Error(legacy.error.message);
    return legacy.data || [];
  }
  return data || [];
}

/**
 * Most recent analysis of the same rayon strictly before the given date.
 */
export async function getPreviousAnalysis(rayon, beforePeriodDate) {
  if (!isSupabaseConfigured || !supabase || !rayon || !beforePeriodDate) return null;

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('rayon', rayon)
    .not('period_date', 'is', null)
    .lt('period_date', beforePeriodDate)
    .order('period_date', { ascending: false })
    .limit(1);

  if (error) return null;
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Load a specific analysis by ID.
 */
export async function getAnalysis(id) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return null;
    throw new Error(error.message);
  }
  return data;
}

/**
 * Delete an analysis.
 */
export async function deleteAnalysis(id) {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
