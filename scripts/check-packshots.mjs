// Verification for lib/packshotFilter.js — run: node scripts/check-packshots.mjs
// URLs below are real Google CSE results observed on 2026-10-11 for EAN queries.
import { filterPackshots } from '../src/lib/packshotFilter.js';

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + label); }
  else { failures++; console.error('FAIL  ' + label + '\n      expected ' + e + '\n      got      ' + a); }
}

const OFF_400 = 'https://images.openfoodfacts.org/images/products/341/558/050/1019/front_en.66.400.jpg';
const OFF_FULL = 'https://images.openfoodfacts.org/images/products/341/558/050/1019/front_en.66.full.jpg';
const OFF_200 = 'https://images.openfoodfacts.org/images/products/341/558/050/1019/front_en.66.200.jpg';
const OFF_ICON = 'https://static.openfoodfacts.org/images/icons/dist/packaging.svg';
const LOGO = 'https://nomatic.lu/img/logo-1765593985.jpg';
const INTERMARCHE = 'https://cdn.intermarche.com/fr/Content/images/pim/03760039985729/ce71687ce43a4cf3afbe3353b838c670.png';
const UNILEVER = 'https://assets.unileversolutions.com/v1/145698380.jpg';

check('svg icon dropped', filterPackshots([OFF_ICON]), []);
check('logo dropped', filterPackshots([LOGO]), []);
check('OFF size variants collapse to one', filterPackshots([OFF_400, OFF_FULL, OFF_200]), [OFF_400]);
check('retailer image ranked before OFF',
  filterPackshots([OFF_400, INTERMARCHE, OFF_FULL]), [INTERMARCHE, OFF_400]);
check('real mixed result', filterPackshots([OFF_400, LOGO, OFF_FULL]), [OFF_400]);
check('caps at 3', filterPackshots([UNILEVER, INTERMARCHE, UNILEVER + '?a', UNILEVER + '?b', OFF_400]).length, 3);
check('exact duplicates removed', filterPackshots([UNILEVER, UNILEVER]), [UNILEVER]);
check('non-http dropped', filterPackshots(['data:image/png;base64,xx', 'x-raw-image:///abc', null]), []);
check('empty input', filterPackshots(undefined), []);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
