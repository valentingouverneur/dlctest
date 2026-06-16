import { requireSupabase } from './supabase';

export async function getProductByEan(ean) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('ean', ean)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function searchProducts({ query = '', category = null, needsReview = false, limit = 50 } = {}) {
  const supabase = requireSupabase();
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

export async function createProduct(product) {
  const supabase = requireSupabase();
  const allowed = ['ean', 'title', 'brand', 'weight', 'category', 'image_url'];
  const payload = Object.fromEntries(
    Object.entries(product).filter(([k]) => allowed.includes(k))
  );
  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(ean, updates) {
  const supabase = requireSupabase();
  const allowed = ['title', 'brand', 'weight', 'category', 'image_url'];
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('ean', ean)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(ean) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('products').delete().eq('ean', ean);
  if (error) throw error;
}

export async function listCategories() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null);
  if (error) throw error;
  const set = new Set(data.map(r => r.category).filter(Boolean));
  return [...set].sort();
}
