// Verification for lib/infomil.js — run: node scripts/check-infomil.mjs
import { readFileSync } from 'node:fs';
import { parseInfomilCsv, deriveWeek, buildLabel } from '../src/lib/infomil.js';

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + label); }
  else { failures++; console.error('FAIL  ' + label + '\n      expected ' + e + '\n      got      ' + a); }
}

const text = readFileSync(new URL('../fixtures/infomil-sample.csv', import.meta.url), 'utf8');
const p = parseInfomilCsv(text);

check('no parse error', p.error, undefined);
check('row count', p.rows.length, 3);
check('ean unwrapped', p.rows[0].ean, '3000000000017');
check('designation', p.rows[0].designation, 'PRODUIT ALPHA 500G');
check('ca_ttc', p.rows[0].ca_ttc, 100);
check('uvc', p.rows[0].uvc, 10);
check('mpaf_ht_pct', p.rows[0].mpaf_ht_pct, 20);
check('freq (col 10, was swapped with panier in old parser)', p.rows[0].freq, 8);
check('panier (col 11)', p.rows[0].panier, 12.5);
check('mpaf', p.rows[0].mpaf, 20);
check('casse_paf on beta', p.rows[1].casse_paf, 1.5);
check('casse_uvc on beta', p.rows[1].casse_uvc, 2);
check('empty cell -> null (gamma mpaf_ht_pct)', p.rows[2].mpaf_ht_pct, null);
check('all canonical columns found', p.columns.missing, []);
check('totals ca_ttc', p.totals.ca_ttc, 150);
check('totals uvc', p.totals.uvc, 15);
check('totals mpaf', p.totals.mpaf, 35);
check('integrity ok', p.integrity.ok, true);
check('meta rayon', p.meta.rayon, 'SURGELES');
check('meta rayonCode', p.meta.rayonCode, '0013');
check('meta exportedAt', p.meta.exportedAt && p.meta.exportedAt.toISOString().slice(0, 10), '2026-07-13');

// Week derivation: from export date (Monday 13/07/2026 minus 1 day = Sunday of ISO week 28)
check('week from date', deriveWeek('fixture.csv', p.meta), { num: 28, key: '2026-S28' });
// Filename takes priority
check('week from filename', deriveWeek('s30.csv', p.meta), { num: 30, key: '2026-S30' });
check('label', buildLabel(deriveWeek('s28.csv', p.meta), p.meta, 's28.csv'), 'S28 · Surgeles');
check('label fallback', buildLabel(null, { rayon: null, rayonCode: null, exportedAt: null }, 'x.csv'), 'x.csv');

// Missing optional columns: header without Fréq/Panier/casse columns
const noCasse = [
  'EAN;Désignation;CA TTC;UVC;MPAF HT(%);MPAF',
  '"=""3000000000017""";PRODUIT ALPHA 500G;100.00;10;20.0;20.00',
].join('\n');
const p2 = parseInfomilCsv(noCasse);
check('optional missing listed', p2.columns.missing.sort(), ['casse_paf', 'casse_uvc', 'freq', 'panier']);
check('missing column -> null', p2.rows[0].freq, null);
check('no totals row -> integrity ok', p2.integrity.ok, true);
check('no footer -> meta nulls', p2.meta, { rayon: null, rayonCode: null, exportedAt: null });

// Missing required column -> error
const noUvc = 'EAN;Désignation;CA TTC\n"=""3000000000017""";X;1.00';
check('required missing -> error', !!parseInfomilCsv(noUvc).error, true);
check('error names the column', parseInfomilCsv(noUvc).error.includes('UVC'), true);

// Already-normalized EAN (plain digits, no ="" wrapper) still parses
const plain = 'EAN;Désignation;CA TTC;UVC\n3000000000017;X;1.00;1';
check('plain ean accepted', parseInfomilCsv(plain).rows[0].ean, '3000000000017');

// Unrecognized file
check('garbage -> error', !!parseInfomilCsv('hello\nworld').error, true);

// ---- analyseStats ----
const { computeStats, inferColumns } = await import('../src/lib/analyseStats.js');
const s = computeStats(p.rows);
check('stats total', s.total, 150);
check('stats totalMpaf', s.totalMpaf, 35);
check('stats totalUvc', s.totalUvc, 15);
check('stats totalCasse', s.totalCasse, 1.5);
check('stats count', s.count, 3);
check('zeros = gamma', s.zeros.map(r => r.ean), ['3000000000031']);
check('casse list = beta', s.casse.map(r => r.ean), ['3000000000024']);
check('topCa order', s.topCa.map(r => r.ean), ['3000000000017', '3000000000024', '3000000000031']);
check('stars empty (no CA > 300)', s.stars.length, 0);
check('risky excludes uvc=0', s.risky.every(r => r.uvc > 0), true);
const inferred = inferColumns(p2.rows);
check('inferColumns missing', inferred.missing.sort(), ['casse_paf', 'casse_uvc', 'freq', 'panier']);
check('computeStats on null-metric rows does not throw', computeStats(p2.rows).total, 100);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
