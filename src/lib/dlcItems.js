const KEY = 'dlc_items';
const MAX = 100;

function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export function getDlcItems() {
  return safeParse(localStorage.getItem(KEY))
    .sort((a, b) => String(a.expiryDate || '').localeCompare(String(b.expiryDate || '')) || (b.createdAt || 0) - (a.createdAt || 0));
}

export function saveDlcItem(input) {
  const item = {
    id: input.id || nowId(),
    ean: input.ean,
    title: input.title || input.ean,
    brand: input.brand || null,
    weight: input.weight || null,
    category: input.category || null,
    image_url: input.image_url || null,
    expiryDate: input.expiryDate,
    quantity: Math.max(1, Number(input.quantity || 1)),
    zone: input.zone || '',
    note: input.note || '',
    status: input.status || 'a_traiter',
    createdAt: input.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  const existing = getDlcItems().filter(x => x.id !== item.id);
  const next = [item, ...existing].slice(0, MAX);
  saveAll(next);
  return item;
}

export function updateDlcItemStatus(id, status) {
  const allowed = new Set(['a_traiter', 'fait', 'retire']);
  const nextStatus = allowed.has(status) ? status : 'a_traiter';
  const next = getDlcItems().map(item => item.id === id ? { ...item, status: nextStatus, updatedAt: Date.now() } : item);
  saveAll(next);
  return next.find(item => item.id === id) || null;
}

export function deleteDlcItem(id) {
  const next = getDlcItems().filter(item => item.id !== id);
  saveAll(next);
  return next;
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
