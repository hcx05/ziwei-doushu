/**
 * 紫微与八字的时辰判定同一口径（2026-11-22 修正）：
 *   紫微排盘（formToBirthInfo）曾只做经度修正、漏了均时差，八字引擎与时辰交界提醒则用
 *   lib/calendar/true-solar-time.ts（钟表时间＋经度修正＋均时差），同一个出生时间可能判出不同时辰。
 * 这里用固定种子的伪随机出生资料逐一比对两边的时辰支，并钉住发现问题的那一例。
 */
import assert from 'node:assert/strict';
import { formToBirthInfo, type BirthFormState } from '../../lib/systems/ziwei/share';
import { computeBazi } from '../../lib/systems/bazi/engine';
import { calculateTrueSolarTime } from '../../lib/calendar/true-solar-time';

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const form = (y: number, mo: number, d: number, h: number, mi: number, lon?: number): BirthFormState => ({
  name: '', year: String(y), month: String(mo), day: String(d), clockHour: String(h), clockMinute: String(mi),
  unknownTime: false, province: lon === undefined ? '' : '测试', city: '', longitude: lon ?? 120, gender: 'male',
});
const baziHour = (y: number, mo: number, d: number, h: number, mi: number, lon?: number) =>
  computeBazi({ year: y, month: mo, day: d, clock: { hour: h, minute: mi }, longitude: lon, gender: 'male' })
    .pillars.find(p => p.key === 'hour')!.ganZhi[1];

// 1) 发现问题的一例：1990-02-11 13:10 杭州（120.2°）真太阳时约 12:56（均时差约 −14 分钟），应为午时
{
  const tst = calculateTrueSolarTime({ year: 1990, month: 2, day: 11, clockHour: 13, clockMinute: 10, longitude: 120.2, utcOffsetMinutes: 480 });
  assert.equal(BRANCHES[tst.branch], '午');
  assert.equal(BRANCHES[formToBirthInfo(form(1990, 2, 11, 13, 10, 120.2)).hour], '午', '紫微应与真太阳时同判午时');
  assert.equal(baziHour(1990, 2, 11, 13, 10, 120.2), '午');
}

// 2) 伪随机 3000 例（1901–2099、东经 73–135°、含不给经度）：紫微时辰支 = 八字时柱地支
let seed = 20261122;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
let checked = 0;
for (let i = 0; i < 3000; i++) {
  const y = 1901 + rnd(199), mo = 1 + rnd(12), d = 1 + rnd(28), h = rnd(24), mi = rnd(60);
  const lon = rnd(5) === 0 ? undefined : 73 + rnd(6200) / 100;
  const z = BRANCHES[formToBirthInfo(form(y, mo, d, h, mi, lon)).hour];
  const b = baziHour(y, mo, d, h, mi, lon);
  assert.equal(z, b, `${y}-${mo}-${d} ${h}:${mi} 经度 ${lon ?? '未给'}：紫微 ${z}时、八字 ${b}时`);
  checked++;
}
console.log(`✓ 时辰口径一致：紫微与八字在 ${checked} 例随机出生资料上判出同一时辰（真太阳时含均时差）`);
