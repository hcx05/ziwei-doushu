/**
 * 流月 / 流日 / 小六壬 回归：把算法钉在出处上
 *   1) 小六壬：倪师示例「农历四月初五戌时 → 空亡」；各课含义与使用规矩都是倪师原话逐字子串；
 *   2) 斗君：子年起法与引擎表 SCHOOL_AX.ZNDJ（子年斗君表）12×12 逐格一致；
 *   3) 流日：倪师示例「正月在子宫：初一→丑、十三→丑、廿六→寅」；通行口径廿六→丑（两者确实不同）；
 *   4) 流日日干与 lunar-javascript 直接取的日干一致。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIUREN_MEANING, LIUREN_NAMES, LIUREN_USAGE, clockToBranch, xiaoLiuRen } from '../../lib/systems/ziwei/xiaoliuren';
import { douJunBranch, getLiuRi, liuRiBranch, liuYueBranch, lunarDayStem, solarToLunar } from '../../lib/systems/ziwei/liuyue';
import { SCHOOL_AX } from '../../lib/systems/ziwei/school-tables.generated';
import { generateChart } from '../../lib/systems/ziwei/algorithm';
import { formToBirthInfo } from '../../lib/systems/ziwei/share';

// ── 1) 小六壬 ───────────────────────────────────────────────
assert.equal(xiaoLiuRen(4, 5, 10).result, '空亡', '倪师示例：农历四月初五戌时应落空亡');
assert.equal(xiaoLiuRen(1, 1, 0).result, '大安');
assert.deepEqual(
  Array.from({ length: 12 }, (_, h) => xiaoLiuRen(1, 1, h).result),
  [...LIUREN_NAMES, ...LIUREN_NAMES],
  '时辰每进一位走一课',
);
assert.throws(() => xiaoLiuRen(13, 1, 0), RangeError);

const corpus = readFileSync(new URL('../../docs/tianji-ziwei/entries.jsonl', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l) as { quote: string; t_hms: string; part: number });
const hasQuote = (q: string, t: string) => corpus.some(e => e.part === 25 && e.t_hms === t && e.quote.includes(q));
for (const [name, m] of Object.entries(LIUREN_MEANING)) {
  assert.ok(hasQuote(m.quote, m.time), `${name} 的含义必须是倪师原话（分P25 ${m.time}）逐字子串：${m.quote}`);
}
for (const u of LIUREN_USAGE) assert.ok(hasQuote(u.quote, u.time), `使用规矩须为倪师原话：${u.quote}`);

assert.equal(clockToBranch(23, 0), 0);
assert.equal(clockToBranch(0, 59), 0);
assert.equal(clockToBranch(1, 0), 1);
assert.equal(clockToBranch(20, 30), 10); // 戌
assert.equal(clockToBranch(22, 59), 11);

// ── 2) 斗君 ─────────────────────────────────────────────────
const ZNDJ = SCHOOL_AX.ZNDJ as readonly (readonly number[])[];
for (let m = 1; m <= 12; m++) {
  for (let h = 0; h < 12; h++) {
    assert.equal(douJunBranch(0, m, h), ZNDJ[m][h + 1] - 1, `子年斗君 生月${m} 时${h} 与 ZNDJ 表不符`);
  }
}
// 其他年份：斗君随流年地支平移
assert.equal(douJunBranch(6, 5, 5), 7); // 午年、五月生、巳时 → 未
assert.equal(liuYueBranch(7, 3), 9);    // 斗君未，三月 → 酉

// ── 3) 流日 ─────────────────────────────────────────────────
assert.equal(liuRiBranch(0, 1), 1, '倪师：正月在子宫，初一顺转到丑宫');
assert.equal(liuRiBranch(0, 13), 1, '倪师：十三号还是在丑宫');
assert.equal(liuRiBranch(0, 26), 2, '倪师：二十六号在寅宫（V）');
assert.equal(liuRiBranch(0, 26, 'common'), 1, '通行口径廿六落丑，与倪师更正不同');

// ── 4) 流日四化 ─────────────────────────────────────────────
const chart = generateChart(formToBirthInfo({
  year: '1990', month: '6', day: '15', clockHour: '10', clockMinute: '30', gender: 'female',
  unknownTime: false, name: '', province: '', city: '', longitude: 120,
}));
const lr = getLiuRi(chart, 2026, 11, 21);
const lunar = solarToLunar(2026, 11, 21);
assert.deepEqual(lr.lunar, lunar);
assert.equal(lr.stemName, lunarDayStem(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth));
assert.equal(lr.branch, liuRiBranch(lr.liuyue.branch, lunar.day));

console.log('✓ 流月 / 流日 / 小六壬：倪师示例、斗君表、原话出处全部吻合');
