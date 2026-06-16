import { isSupabaseConfigured, requireSupabase } from './supabase';

const KEY = 'dlc_items';
const MAX = 200;
const VALID_STATUSES = new Set(['a_traiter', 'fait', 'retire']);

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (Number(c) ^ Math.random() * 16 >> Number(c) / 4).toString(16)
  );
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeLocalStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function readLocal() {
  const storage = safeLocalStorage();
  if (!storage) return [];
  return safeParse(storage.getItem(KEY));
}

function saveAll(items) {
  const storage = safeLocalStorage();
  if (!storage) return;
  try { storage.setItem(KEY, JSON.stringify(items.slice(0, MAX))); } catch {}
}

function sortItems(items) {
  return [...items].sort((a, b) =>
    String(a.expiryDate || '').localeCompare(String(b.expiryDate || '')) ||
    (b.createdAt || 0) - (a.createdAt || 0)
  );
}

function normalizeStatus(status) {
  return VALID_STATUSES.has(status) ? status : 'a_traiter';
}

function normalizeItem(input) {
  return {
    id: input.id || makeId(),
    ean: String(input.ean || '').replace(/\D/g, ''),
    title: input.title || input.ean,
    brand: input.brand || null,
    weight: input.weight || null,
    category: input.category || null,
    image_url: input.image_url || null,
    expiryDate: input.expiryDate,
    quantity: Math.max(1, Number(input.quantity || 1)),
    zone: input.zone || '',
    note: input.note || '',
    status: normalizeStatus(input.status),
    createdAt: input.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

function fromDb(row) {
  return {
    id: row.id,
    ean: row.ean,
    title: row.title || row.ean,
    brand: row.brand || null,
    weight: row.weight || null,
    category: row.category || null,
    image_url: row.image_url || null,
    expiryDate: row.expiry_date,
    quantity: row.quantity || 1,
    zone: row.zone || '',
    note: row.note || '',
    status: normalizeStatus(row.status),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

function toDb(item) {
  return {
    id: item.id,
    ean: item.ean,
    title: item.title || item.ean,
    brand: item.brand,
    weight: item.weight,
    category: item.category,
    image_url: item.image_url,
    expiry_date: item.expiryDate,
    quantity: item.quantity,
    zone: item.zone || null,
    note: item.note || null,
    status: item.status,
  };
}

function replaceLocal(item) {
  const next = [item, ...readLocal().filter(x => x.id !== item.id)].slice(0, MAX);
  saveAll(next);
  return item;
}

export function getDlcItems() {
  return sortItems(readLocal());
}

export async function getDlcItemsAsync(limit = MAX) {
  if (!isSupabaseConfigured) return getDlcItems();
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dlc_items')
    .select('*')
    .order('expiry_date', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('dlc_items select:', error.message);
    return getDlcItems();
  }
  const items = (data ?? []).map(fromDb);
  saveAll(items);
  return items;
}

export async function saveDlcItem(input) {
  const item = normalizeItem(input);
  replaceLocal(item);

  if (!isSupabaseConfigured) return item;
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dlc_items')
    .upsert(toDb(item), { onConflict: 'id' })
    .select('*')
    .single();
  if (error) {
    console.warn('dlc_items upsert:', error.message);
    return { ...item, syncError: error.message };
  }
  return replaceLocal(fromDb(data));
}

export async function updateDlcItemStatus(id, status) {
  const nextStatus = normalizeStatus(status);
  const local = readLocal().map(item => item.id === id ? { ...item, status: nextStatus, updatedAt: Date.now() } : item);
  saveAll(local);

  if (!isSupabaseConfigured) return local.find(item => item.id === id) || null;
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dlc_items')
    .update({ status: nextStatus })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.warn('dlc_items update:', error.message);
    return local.find(item => item.id === id) || null;
  }
  return replaceLocal(fromDb(data));
}

export async function deleteDlcItem(id) {
  const local = readLocal().filter(item => item.id !== id);
  saveAll(local);

  if (isSupabaseConfigured) {
    const supabase = requireSupabase();
    const { error } = await supabase.from('dlc_items').delete().eq('id', id);
    if (error) console.warn('dlc_items delete:', error.message);
  }
  return local;
}

export function getDlcUrgency(item, today = new Date()) {
  if (!item?.expiryDate) return 'none';
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const expiry = new Date(`${item.expiryDate}T00:00:00`);
  const days = Math.round((expiry.getTime() - start.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 3) return 'soon';
  return 'later';
}
