// Verification for lib/workDays.js time/week math — run: node scripts/check-workdays.mjs
import {
  parseHM, segMinutes, dayMinutes, fmtHM, fmtDelta,
  addDays, mondayOf, isoWeekOf, groupWeeks,
} from '../src/lib/workDays.js';

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + label); }
  else { failures++; console.error('FAIL  ' + label + '\n      expected ' + e + '\n      got      ' + a); }
}

check('parseHM 06:30', parseHM('06:30'), 390);
check('parseHM empty -> null', parseHM(''), null);
check('parseHM garbage -> null', parseHM('6h30'), null);

check('segMinutes 05:00-10:00', segMinutes({ start: '05:00', end: '10:00' }), 300);
check('segMinutes overnight 22:00-02:00', segMinutes({ start: '22:00', end: '02:00' }), 240);
check('segMinutes missing end -> 0', segMinutes({ start: '05:00', end: '' }), 0);
check('dayMinutes split shift', dayMinutes([{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }]), 480);
check('dayMinutes null -> 0', dayMinutes(null), 0);

check('fmtHM 2345', fmtHM(2345), '39h05');
check('fmtHM 2340', fmtHM(2340), '39h');
check('fmtHM 45', fmtHM(45), '0h45');
check('fmtDelta +135', fmtDelta(135), '+2h15');
check('fmtDelta -90', fmtDelta(-90), '−1h30');
check('fmtDelta 0', fmtDelta(0), '±0h');

check('addDays across month', addDays('2026-01-31', 1), '2026-02-01');
check('mondayOf sunday', mondayOf('2026-07-12'), '2026-07-06');
check('mondayOf monday', mondayOf('2026-07-13'), '2026-07-13');
check('isoWeekOf 2026-07-13', isoWeekOf('2026-07-13'), { year: 2026, week: 29, label: 'S29' });
// 2027-01-01 is a Friday -> belongs to ISO week 53 of 2026
check('isoWeekOf year boundary', isoWeekOf('2027-01-01'), { year: 2026, week: 53, label: 'S53' });

const weeks = groupWeeks([
  { day: '2026-07-14', segments: [{ start: '05:00', end: '10:00' }] },
  { day: '2026-07-06', segments: [{ start: '05:00', end: '09:00' }] },
  { day: '2026-07-07', segments: [{ start: '14:00', end: '17:00' }] },
]);
check('groupWeeks count', weeks.length, 2);
check('groupWeeks oldest first', weeks.map(w => w.monday), ['2026-07-06', '2026-07-13']);
check('groupWeeks minutes', weeks.map(w => w.minutes), [420, 300]);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
