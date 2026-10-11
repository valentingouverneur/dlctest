// Verification for lib/packshotCache.js — run: node scripts/check-packshot-cache.mjs
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
const { getCachedPackshots, setCachedPackshots } = await import('../src/lib/packshotCache.js');

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + label); }
  else { failures++; console.error('FAIL  ' + label + '\n      expected ' + e + '\n      got      ' + a); }
}

const realNow = Date.now;
const T0 = 1_800_000_000_000;
const H = 3600 * 1000;
Date.now = () => T0;

check('unknown ean -> null (miss)', getCachedPackshots('1'), null);

setCachedPackshots('1', ['https://a/1.jpg']);
check('hit returns urls', getCachedPackshots('1'), ['https://a/1.jpg']);

// Empty Google answer must be remembered, otherwise the product is searched
// again on every Affiche load and burns quota for nothing.
setCachedPackshots('2', []);
check('empty result cached as [] (not a miss)', getCachedPackshots('2'), []);

Date.now = () => T0 + 25 * H;
check('empty result expires after 24h', getCachedPackshots('2'), null);
check('non-empty result still cached after 25h', getCachedPackshots('1'), ['https://a/1.jpg']);

Date.now = () => T0 + 8 * 24 * H;
check('non-empty result expires after 7 days', getCachedPackshots('1'), null);

Date.now = realNow;
console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
