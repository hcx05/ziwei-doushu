/**
 * 八字引擎回归（lib/systems/bazi/）
 *
 * 独立校验：四柱不只信 lunar-javascript，另用与它无关的方法重算——
 *   · 日柱：儒略日数（JDN）推六十甲子，1949-10-01 为甲子日（JDN − 11 ≡ 0 mod 60）；
 *   · 时柱：五鼠遁（甲己还加甲……），日干按排盘采用的那一天；
 *   · 年柱、月柱：Meeus 低精度太阳视黄经（约 0.01°，即十几分钟）判断立春与交节，再用五虎遁起月干。
 * 节气前后 90 分钟内的样本跳过年月柱比对（低精度算法的误差范围），其余逐一比对。
 * 另外：十神、藏干与 lunar-javascript 的表逐项一致；干支关系、旺相休囚死、旬空按定义抽查；
 * 大运方向与首步干支、立春时刻（1901–2099）与独立算法相差不超过 20 分钟。
 */
import assert from 'node:assert/strict';
import { LunarUtil, Solar } from 'lunar-javascript';
import { computeBazi, findRelations, seasonState, xunKongOf } from '../../lib/systems/bazi/engine';
import { BRANCHES, HIDDEN_STEMS, STEMS, ganZhiOf, shiShen } from '../../lib/systems/bazi/constants';
import { calculateTrueSolarTime, shiftGregorianDate } from '../../lib/calendar/true-solar-time';

// ── 独立算法 ────────────────────────────────────────────────
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
const dayGanZhi = (y: number, m: number, d: number) => ganZhiOf(jdn(y, m, d) - 11);
assert.equal(dayGanZhi(1949, 10, 1), '甲子', '独立算法自检：1949-10-01 甲子日');

/** 北京时间 → 儒略日（UT） */
const jdOfBeijing = (y: number, m: number, d: number, h: number, mi: number) => jdn(y, m, d) - 0.5 + (h - 8) / 24 + mi / 1440;
const rad = (x: number) => (x * Math.PI) / 180;
/** Meeus 第 25 章低精度太阳视黄经（度） */
function sunLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M))
    + (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M)) + 0.000289 * Math.sin(rad(3 * M));
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  return ((lambda % 360) + 360) % 360;
}
/** 某公历年立春（黄经 315°）的儒略日，二分法 */
function liChunJd(year: number): number {
  let lo = jdn(year, 1, 25), hi = jdn(year, 2, 15);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const diff = ((sunLongitude(mid) - 315 + 540) % 360) - 180;
    if (diff < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function oracleYearMonth(y: number, m: number, d: number, h: number, mi: number): { year: string; month: string; nearJie: boolean } {
  const jd = jdOfBeijing(y, m, d, h, mi);
  const lam = sunLongitude(jd);
  const sinceYin = (lam - 315 + 360) % 360; // 寅月起于立春
  const k = Math.floor(sinceYin / 30); // 0 = 寅月
  const nearJie = Math.min(sinceYin % 30, 30 - (sinceYin % 30)) < 0.065; // ≈ 90 分钟
  const yearNum = jd < liChunJd(y) ? y - 1 : y;
  const yearGz = ganZhiOf(yearNum - 4);
  const yStem = STEMS.indexOf(yearGz[0] as (typeof STEMS)[number]);
  const monthStem = ((yStem % 5) * 2 + 2 + k) % 10;
  return { year: yearGz, month: STEMS[monthStem] + BRANCHES[(2 + k) % 12], nearJie };
}

// ── 1) 立春时刻：lunar-javascript 与独立算法相差 ≤ 20 分钟 ──────
let maxLichunDiff = 0;
for (let y = 1901; y <= 2099; y++) {
  const lc = Solar.fromYmd(y, 2, 12).getLunar().getPrevJie(false);
  assert.equal(lc.getName(), '立春');
  const s = lc.getSolar();
  const diffMin = Math.abs(jdOfBeijing(s.getYear(), s.getMonth(), s.getDay(), s.getHour(), s.getMinute()) - liChunJd(y)) * 1440;
  maxLichunDiff = Math.max(maxLichunDiff, diffMin);
}
assert.ok(maxLichunDiff <= 20, `立春时刻差异过大：${maxLichunDiff.toFixed(1)} 分钟`);

// ── 2) 随机样本四柱逐一比对 ─────────────────────────────────
let seed = 20261121;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
let checked = 0, ymChecked = 0;
for (let n = 0; n < 4000; n++) {
  const y = ri(1901, 2099), m = ri(1, 12), d = ri(1, 28), h = ri(0, 23), mi = ri(0, 59);
  const lon = ri(7500, 13500) / 100;
  const lateZishi = rand() < 0.5 ? 'next-day' : 'same-day';
  const c = computeBazi({ year: y, month: m, day: d, clock: { hour: h, minute: mi }, longitude: lon, gender: rand() < 0.5 ? 'male' : 'female', lateZishi });
  const [Y, M, D, H] = c.pillars.map(p => p.ganZhi);

  // 日柱、时柱
  const tst = calculateTrueSolarTime({ year: y, month: m, day: d, clockHour: h, clockMinute: mi, longitude: lon, utcOffsetMinutes: 480 });
  const tDate = shiftGregorianDate({ year: y, month: m, day: d }, tst.dayOffset);
  const late = tst.hour === 23;
  const next = shiftGregorianDate(tDate, 1);
  const dayForPillar = late && lateZishi === 'next-day' ? next : tDate;
  const dayForHourStem = late ? next : tDate; // 两派时柱都按次日日干起子时
  assert.equal(D, dayGanZhi(dayForPillar.year, dayForPillar.month, dayForPillar.day), `日柱不符：${y}-${m}-${d} ${h}:${mi} 经度${lon} ${lateZishi}`);
  const hb = tst.branch;
  const ds = STEMS.indexOf(dayGanZhi(dayForHourStem.year, dayForHourStem.month, dayForHourStem.day)[0] as (typeof STEMS)[number]);
  assert.equal(H, STEMS[((ds % 5) * 2 + hb) % 10] + BRANCHES[hb], `时柱不符：${y}-${m}-${d} ${h}:${mi} 经度${lon}`);

  // 年柱、月柱（标准时间对节气）
  const o = oracleYearMonth(y, m, d, h, mi);
  if (!o.nearJie) {
    assert.equal(Y, o.year, `年柱不符：${y}-${m}-${d} ${h}:${mi}`);
    assert.equal(M, o.month, `月柱不符：${y}-${m}-${d} ${h}:${mi}`);
    ymChecked++;
  }
  checked++;
}
assert.ok(ymChecked > 3800, `年月柱比对样本太少：${ymChecked}`);

// ── 3) 十神、藏干与 lunar-javascript 的表一致 ────────────────
const U = LunarUtil as unknown as { SHI_SHEN: Record<string, string>; ZHI_HIDE_GAN: Record<string, string[]> };
for (const a of STEMS) for (const b of STEMS) assert.equal(shiShen(a, b), U.SHI_SHEN[a + b], `十神不符：${a}见${b}`);
for (const br of BRANCHES) assert.deepEqual(HIDDEN_STEMS[br], U.ZHI_HIDE_GAN[br], `藏干不符：${br}`);

// ── 4) 定义抽查 ─────────────────────────────────────────────
assert.equal(seasonState('火', '火'), '旺');
assert.equal(seasonState('火', '土'), '相');
assert.equal(seasonState('火', '木'), '休');
assert.equal(seasonState('火', '水'), '囚');
assert.equal(seasonState('火', '金'), '死');
assert.deepEqual(xunKongOf('甲子'), ['戌', '亥']);
assert.deepEqual(xunKongOf('辛亥'), ['寅', '卯']);
assert.deepEqual(xunKongOf('癸亥'), ['子', '丑']);
const kinds = (items: [string, string][]) => findRelations(items.map(([label, ganZhi]) => ({ label, ganZhi }))).map(r => r.kind + ':' + r.detail.slice(0, 6));
const k1 = kinds([['年柱', '甲子'], ['月柱', '己丑'], ['日柱', '庚午'], ['时柱', '丙辰']]);
assert.ok(k1.some(k => k.startsWith('天干五合:甲己合')), '甲己合');
assert.ok(k1.some(k => k.startsWith('地支六合:子丑合')), '子丑合');
assert.ok(k1.some(k => k.startsWith('地支六冲:子午冲')), '子午冲');
assert.ok(k1.some(k => k.startsWith('天干相冲:庚丙')) === false, '庚丙不是四冲');
assert.ok(k1.some(k => k.startsWith('地支半合:子辰')) || k1.some(k => k.startsWith('地支半合:辰子')), '子辰半合（申子辰缺申）');
const k2 = kinds([['年柱', '壬寅'], ['月柱', '乙巳'], ['日柱', '戊申'], ['时柱', '丁巳']]);
assert.ok(k2.some(k => k.startsWith('地支三刑:寅巳申')), '寅巳申三刑');
assert.ok(k2.some(k => k.startsWith('天干相冲:丁癸')) === false);
assert.ok(k2.some(k => /^天干五合:(丁壬|壬丁)合/.test(k)), '丁壬合');
const k3 = kinds([['年柱', '甲寅'], ['月柱', '丙午'], ['日柱', '壬戌'], ['时柱', '辛亥']]);
assert.ok(k3.some(k => k.startsWith('地支三合:寅午戌')), '寅午戌三合');

// ── 5) 大运：阳男阴女顺、阴男阳女逆；首步为月柱的下一 / 上一甲子 ──
for (const [y, gender, fwd] of [[1990, 'male', true], [1990, 'female', false], [1991, 'male', false], [1991, 'female', true]] as const) {
  const c = computeBazi({ year: y, month: 6, day: 15, clock: { hour: 10, minute: 30 }, longitude: 120, gender });
  assert.equal(c.yun.forward, fwd, `${y} ${gender} 大运方向`);
  const mIdx = Array.from({ length: 60 }, (_, i) => ganZhiOf(i)).indexOf(c.pillars[1].ganZhi);
  assert.equal(c.yun.steps[0].ganZhi, ganZhiOf(mIdx + (fwd ? 1 : -1)), '首步大运');
  assert.ok(c.yun.start.years >= 0 && c.yun.start.years <= 10, '起运岁数应在 0–10 年');
  for (let i = 1; i < c.yun.steps.length; i++) assert.equal(c.yun.steps[i].startYear, c.yun.steps[i - 1].endYear + 1, '大运年份应连续');
}

// ── 6) 口径声明 ─────────────────────────────────────────────
const lc = computeBazi({ year: 2004, month: 2, day: 4, clock: { hour: 19, minute: 30 }, longitude: 104, gender: 'male' });
assert.deepEqual(lc.pillars.slice(0, 2).map(p => p.ganZhi), ['癸未', '乙丑'], '立春 19:56 前出生：癸未年乙丑月');
assert.ok(lc.assumptions.some(a => a.includes('立春') && a.includes('26 分钟')), '贴近立春须提醒');
const late = computeBazi({ year: 1990, month: 6, day: 15, clock: { hour: 23, minute: 30 }, longitude: 120, gender: 'male' });
assert.equal(late.pillars[2].ganZhi, '壬子', '晚子时默认按次日排日柱');
assert.ok(late.assumptions.some(a => a.startsWith('⚠ 假设：出生在晚子时')));
const lateSame = computeBazi({ year: 1990, month: 6, day: 15, clock: { hour: 23, minute: 30 }, longitude: 120, gender: 'male', lateZishi: 'same-day' });
assert.equal(lateSame.pillars[2].ganZhi, '辛亥', '夜子时日柱留在当天');
assert.equal(lateSame.pillars[3].ganZhi, '庚子', '夜子时时柱仍按次日日干（壬）起子时');
const unknown = computeBazi({ year: 1990, month: 6, day: 15, clock: null, gender: 'female' });
assert.equal(unknown.pillars.length, 3, '时辰不详只排三柱');
assert.ok(unknown.assumptions.some(a => a.includes('时辰不详')));
const ln = computeBazi({ year: 1990, month: 6, day: 15, clock: { hour: 10, minute: 30 }, longitude: 120, gender: 'female', liunianYear: 2026 });
assert.equal(ln.liunian?.ganZhi, '丙午');
assert.equal(ln.liunian?.daYun?.ganZhi, '戊寅');

assert.throws(() => computeBazi({ year: 1990, month: 2, day: 30, clock: null, gender: 'male' }), /公历日期不存在/);
assert.throws(() => computeBazi({ year: 1800, month: 2, day: 3, clock: null, gender: 'male' }), /1901–2099/);

console.log(`✓ 八字引擎：${checked} 个随机时刻日时柱、${ymChecked} 个年月柱与独立算法一致；立春 1901–2099 最大差 ${maxLichunDiff.toFixed(1)} 分钟；十神、藏干、干支关系、大运、口径声明正确`);
