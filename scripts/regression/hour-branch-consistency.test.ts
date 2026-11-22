/**
 * 紫微與八字的時辰判定同一口徑（2026-11-22 修正）：
 *   紫微排盤（formToBirthInfo）曾只做經度修正、漏了均時差，八字引擎與時辰交界提醒則用
 *   lib/calendar/true-solar-time.ts（鐘表時間＋經度修正＋均時差），同一個出生時間可能判出不同時辰。
 * 這裡用固定種子的偽隨機出生資料逐一比對兩邊的時辰支，並釘住發現問題的那一例。
 */
import assert from 'node:assert/strict';
import { formToBirthInfo, type BirthFormState } from '../../lib/systems/ziwei/share';
import { computeBazi } from '../../lib/systems/bazi/engine';
import { calculateTrueSolarTime } from '../../lib/calendar/true-solar-time';

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const form = (y: number, mo: number, d: number, h: number, mi: number, lon?: number): BirthFormState => ({
  name: '', year: String(y), month: String(mo), day: String(d), clockHour: String(h), clockMinute: String(mi),
  unknownTime: false, province: lon === undefined ? '' : '測試', city: '', longitude: lon ?? 120, gender: 'male',
});
const baziHour = (y: number, mo: number, d: number, h: number, mi: number, lon?: number) =>
  computeBazi({ year: y, month: mo, day: d, clock: { hour: h, minute: mi }, longitude: lon, gender: 'male' })
    .pillars.find(p => p.key === 'hour')!.ganZhi[1];

// 1) 發現問題的一例：1990-02-11 13:10 杭州（120.2°）真太陽時約 12:56（均時差約 −14 分鐘），應為午時
{
  const tst = calculateTrueSolarTime({ year: 1990, month: 2, day: 11, clockHour: 13, clockMinute: 10, longitude: 120.2, utcOffsetMinutes: 480 });
  assert.equal(BRANCHES[tst.branch], '午');
  assert.equal(BRANCHES[formToBirthInfo(form(1990, 2, 11, 13, 10, 120.2)).hour], '午', '紫微應與真太陽時同判午時');
  assert.equal(baziHour(1990, 2, 11, 13, 10, 120.2), '午');
}

// 2) 偽隨機 3000 例（1901–2099、東經 73–135°、含不給經度）：紫微時辰支 = 八字時柱地支
let seed = 20261122;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
let checked = 0;
for (let i = 0; i < 3000; i++) {
  const y = 1901 + rnd(199), mo = 1 + rnd(12), d = 1 + rnd(28), h = rnd(24), mi = rnd(60);
  const lon = rnd(5) === 0 ? undefined : 73 + rnd(6200) / 100;
  const z = BRANCHES[formToBirthInfo(form(y, mo, d, h, mi, lon)).hour];
  const b = baziHour(y, mo, d, h, mi, lon);
  assert.equal(z, b, `${y}-${mo}-${d} ${h}:${mi} 經度 ${lon ?? '未給'}：紫微 ${z}時、八字 ${b}時`);
  checked++;
}
console.log(`✓ 時辰口徑一致：紫微與八字在 ${checked} 例隨機出生資料上判出同一時辰（真太陽時含均時差）`);
