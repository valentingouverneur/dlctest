export function money(v) {
  return (v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
}

export function num(v) {
  return (v || 0).toLocaleString('fr-FR');
}

export function signedMoney(v) {
  return (v >= 0 ? '+' : '−') + money(Math.abs(v));
}

export function pct(v, digits = 1) {
  return (v * 100).toFixed(digits).replace('.', ',') + ' %';
}
