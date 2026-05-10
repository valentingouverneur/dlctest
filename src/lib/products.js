import { supabase } from './supabase';

export async function getProductByEan(ean) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('ean', ean)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function searchProducts({ query = '', category = null, needsReview = false, limit = 50 } = {}) {
  let q = supabase.from('products').select('*').order('title', { ascending: true }).limit(limit);
  if (query) {
    const safe = query.replace(/[%,]/g, '');
    q = q.or(`title.ilike.%${safe}%,brand.ilike.%${safe}%,ean.ilike.%${safe}%`);
  }
  if (category) {
    q = q.eq('category', category);
  }
  if (needsReview) {
    q = q.is('image_url', null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null);
  if (error) throw error;
  const set = new Set(data.map(r => r.category).filter(Boolean));
  return [...set].sort();
}
