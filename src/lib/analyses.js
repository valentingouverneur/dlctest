import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Save analysis results to Supabase.
 */
export async function saveAnalysis(fileName, stats) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré');
  }

  const payload = {
    file_name: fileName,
    stats: {
      total: stats.total,
      totalMpaf: stats.totalMpaf,
      totalUvc: stats.totalUvc,
      count: stats.rows,
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
    product_count: stats.rows,
  };

  const { data, error } = await supabase
    .from('analyses')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      throw new Error('TABLE_MISSING');
    }
    throw new Error(error.message || 'Erreur de sauvegarde');
  }
  return data.id;
}

/**
 * Load all saved analyses (summary list).
 */
export async function listAnalyses() {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('analyses')
    .select('id, created_at, file_name, total_ca, total_mpaf, product_count')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    throw new Error(error.message);
  }
  return data || [];
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
