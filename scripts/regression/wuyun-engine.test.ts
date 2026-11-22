/**
 * 五運六氣引擎迴歸（lib/systems/wuyun/）
 *
 *   1) 六十甲子逐年對照《素問·六元正紀大論》的排列（司天 / 中運 / 在泉，按六組手寫，不經程序推導）；
 *   2) 運氣同化：天符十二年、歲會八年、太乙天符四年、同天符六年、同歲會六年，逐年列名比對；
 *      運氣關係五類各十二年；
 *   3) 主運初運太少（壬甲丙乙癸太角、丁己辛戊庚少角）、客運五步、主氣客氣六步、客主加臨；
 *   4) 日期：運氣年始於大寒、六步交於春分小滿大暑秋分小雪 —— 以 Meeus 太陽黃經獨立求節氣，1901–2098 每年比對；
 *      大寒至立春之間的日期須帶「⚠ 假設」。
 */
import assert from 'node:assert/strict';
import { computeWuyun, locateDate } from '../../lib/systems/wuyun/engine';
import { jdn, jdToBeijing, termJd } from './_oracles';

const ganZhiYear = (gz: string) => {
  // 1984 = 甲子；找 1984–2043 中干支相同的一年
  for (let y = 1984; y < 2044; y++) if (computeWuyun(y).ganZhi === gz) return y;
  throw new Error(gz);
};

// ── 1) 《素問·六元正紀大論》六組（上：司天；中：中運；下：在泉） ──────
const LIUYUAN: [string, string, [string, string][]][] = [
  ['太陽寒水', '太陰溼土', [['壬辰壬戌', '太角'], ['戊辰戊戌', '太徵'], ['甲辰甲戌', '太宮'], ['庚辰庚戌', '太商'], ['丙辰丙戌', '太羽']]],
  ['陽明燥金', '少陰君火', [['丁卯丁酉', '少角'], ['癸卯癸酉', '少徵'], ['己卯己酉', '少宮'], ['乙卯乙酉', '少商'], ['辛卯辛酉', '少羽']]],
  ['少陽相火', '厥陰風木', [['壬寅壬申', '太角'], ['戊寅戊申', '太徵'], ['甲寅甲申', '太宮'], ['庚寅庚申', '太商'], ['丙寅丙申', '太羽']]],
  ['太陰溼土', '太陽寒水', [['丁丑丁未', '少角'], ['癸丑癸未', '少徵'], ['己丑己未', '少宮'], ['乙丑乙未', '少商'], ['辛丑辛未', '少羽']]],
  ['少陰君火', '陽明燥金', [['壬子壬午', '太角'], ['戊子戊午', '太徵'], ['甲子甲午', '太宮'], ['庚子庚午', '太商'], ['丙子丙午', '太羽']]],
  ['厥陰風木', '少陽相火', [['丁巳丁亥', '少角'], ['癸巳癸亥', '少徵'], ['己巳己亥', '少宮'], ['乙巳乙亥', '少商'], ['辛巳辛亥', '少羽']]],
];
let checked = 0;
for (const [siTian, zaiQuan, rows] of LIUYUAN) {
  for (const [pair, yun] of rows) {
    for (const gz of [pair.slice(0, 2), pair.slice(2)]) {
      const c = computeWuyun(ganZhiYear(gz));
      assert.equal(c.siTian.name, siTian, `${gz} 司天`);
      assert.equal(c.zaiQuan.name, zaiQuan, `${gz} 在泉`);
      assert.ok(c.suiYun.label.endsWith(`（${yun}）`), `${gz} 中運應為${yun}：${c.suiYun.label}`);
      assert.equal(c.keYun[0].label, yun, `${gz} 客運初運即中運`);
      checked++;
    }
  }
}
assert.equal(checked, 60);

// ── 2) 運氣同化與運氣關係 ──────────────────────────────────
const all = Array.from({ length: 60 }, (_, i) => computeWuyun(1984 + i));
const named = (prefix: string) => all.filter(c => c.tongHua.some(t => t.startsWith(prefix))).map(c => c.ganZhi).sort();
const sorted = (s: string) => (s.match(/../g) ?? []).sort();
assert.deepEqual(named('太乙天符'), sorted('戊午乙酉己丑己未'));
const tianFu = all.filter(c => c.tongHua.some(t => t.startsWith('天符') || t.startsWith('太乙天符'))).map(c => c.ganZhi).sort();
assert.deepEqual(tianFu, sorted('己丑己未戊寅戊申戊子戊午乙卯乙酉丁巳丁亥丙辰丙戌'), '天符十二年');
const suiHui = all.filter(c => c.tongHua.some(t => t.startsWith('歲會') || t.startsWith('太乙天符'))).map(c => c.ganZhi).sort();
assert.deepEqual(suiHui, sorted('丁卯戊午甲辰甲戌己丑己未乙酉丙子'), '歲會八年');
assert.deepEqual(named('同天符'), sorted('甲辰甲戌庚子庚午壬寅壬申'), '同天符六年');
assert.deepEqual(named('同歲會'), sorted('辛丑辛未癸卯癸酉癸巳癸亥'), '同歲會六年');
for (const k of ['天符', '順化', '天刑', '小逆', '不和'] as const) {
  assert.equal(all.filter(c => c.relation.kind === k).length, 12, `運氣關係「${k}」應為十二年`);
}
assert.equal(computeWuyun(1984).relation.kind, '順化', '甲子：少陰君火生土運');
assert.equal(computeWuyun(1990).relation.kind, '天刑', '庚午：少陰君火克金運');

// ── 3) 主運、客運、六氣 ────────────────────────────────────
for (const c of all) {
  const taiJiao = '壬甲丙乙癸'.includes(c.stem);
  assert.equal(c.zhuYun[0].label, taiJiao ? '太角' : '少角', `${c.ganZhi} 主運初運`);
  assert.deepEqual(c.zhuYun.map(s => s.yin), ['角', '徵', '宮', '商', '羽']);
  // 太少相生：相鄰兩步太少交替（主運五步與客運五步皆然）
  for (const steps of [c.zhuYun, c.keYun]) for (let k = 1; k < 5; k++) assert.notEqual(steps[k].tai, steps[k - 1].tai);
  // 主運中與歲運同音的一步，太少與歲運一致
  assert.equal(c.zhuYun.find(s => s.wuXing === c.suiYun.wuXing)!.tai, c.suiYun.excess, `${c.ganZhi} 主運與中運同步`);
  assert.deepEqual(c.steps.map(s => s.zhu.short), ['厥陰', '少陰', '少陽', '太陰', '陽明', '太陽']);
  assert.equal(c.steps[2].ke.name, c.siTian.name);
  assert.equal(c.steps[5].ke.name, c.zaiQuan.name);
}
const jiaZi = computeWuyun(1984);
assert.deepEqual(jiaZi.steps.map(s => s.ke.short), ['太陽', '厥陰', '少陰', '太陰', '少陽', '陽明'], '子午年客氣六步');
assert.deepEqual(jiaZi.keYun.map(s => s.label), ['太宮', '少商', '太羽', '少角', '太徵'], '甲年客運');
assert.deepEqual(jiaZi.zhuYun.map(s => s.label), ['太角', '少徵', '太宮', '少商', '太羽'], '甲年主運');
assert.ok(jiaZi.steps[2].relation.startsWith('君位臣'), '子年三之氣：客少陰加主少陽');
assert.equal(computeWuyun(1986).steps[2].relation, '客主同氣', '丙寅：少陽司天，三之氣客少陽加主少陽');
const chenYear = computeWuyun(1988); // 戊辰：太陽司天，二之氣客陽明加主少陰（火克金：主勝逆）
assert.equal(chenYear.steps[1].ke.short, '陽明');
assert.ok(chenYear.steps[1].relation.startsWith('主勝客：逆'));
const siYear = computeWuyun(1989); // 己巳：厥陰司天，初之氣客陽明加主厥陰（金克木：客勝從）
assert.equal(siYear.steps[0].ke.short, '陽明');
assert.ok(siYear.steps[0].relation.startsWith('客勝主：從'));
// 臣位君：客少陽加於主少陰，出現在卯酉年的二之氣
const maoYear = computeWuyun(1987); // 丁卯：陽明司天，客氣 太陰 少陽 陽明 太陽 厥陰 少陰
assert.deepEqual(maoYear.steps.map(s => s.ke.short), ['太陰', '少陽', '陽明', '太陽', '厥陰', '少陰']);
assert.ok(maoYear.steps[1].relation.startsWith('臣位君：逆'));

// ── 4) 日期：大寒與六步交司以 Meeus 獨立求 ─────────────────────
let maxDiff = 0;
const minutesOf = (s: string) => {
  const [d, t] = s.split(' ');
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  return jdn(y, m, dd) * 1440 + h * 60 + mi;
};
const toMin = (jd: number) => { const b = jdToBeijing(jd); return jdn(b.y, b.m, b.d) * 1440 + b.minutesOfDay; };
const STEP_LON = [300, 0, 60, 120, 180, 240];
const STEP_NEAR: [number, number][] = [[1, 20], [3, 21], [5, 21], [7, 23], [9, 23], [11, 22]];
for (let y = 1901; y <= 2098; y++) {
  const c = computeWuyun(y);
  c.steps.forEach((s, k) => {
    const jd = termJd(STEP_LON[k], jdn(y, STEP_NEAR[k][0], STEP_NEAR[k][1]));
    const diff = Math.abs(minutesOf(s.start) - toMin(jd));
    maxDiff = Math.max(maxDiff, diff);
  });
  assert.equal(c.span.start, c.steps[0].start);
  assert.equal(c.zhuYun[0].start, c.span.start);
  assert.equal(c.zhuYun[4].end, c.span.end);
}
assert.ok(maxDiff <= 20, `六步交司時刻與 Meeus 獨立推算最大相差 ${maxDiff} 分鐘（應 ≤ 20）`);

const early = locateDate(2026, 1, 25);
assert.equal(early.chart.ganZhi, '丙午', '2026-01-25 已過大寒，屬丙午運氣年');
assert.ok(early.chart.assumptions[0].startsWith('⚠ 假設：'));
const before = locateDate(2026, 1, 15);
assert.equal(before.chart.ganZhi, '乙巳', '大寒前仍屬上一運氣年');
assert.equal(before.chart.assumptions.length, 0);
const nov = locateDate(2026, 11, 21);
assert.deepEqual([nov.yunStep, nov.qiStep], [4, 4], '2026-11-21：五運（太羽）、五之氣（小雪前）');
assert.equal(locateDate(2026, 11, 22, 16, 0).qiStep, 5, '小雪 15:23 之後為終之氣');
assert.throws(() => computeWuyun(2099), /1901–2098/);

console.log(`✓ 五運六氣引擎：六十甲子與《六元正紀大論》排列一致；同化與運氣關係年數正確；主客運氣與客主加臨正確；1901–2098 六步交司與 Meeus 推算最大相差 ${maxDiff} 分鐘`);
