/**
 * 五运六气引擎回归（lib/systems/wuyun/）
 *
 *   1) 六十甲子逐年对照《素问·六元正纪大论》的排列（司天 / 中运 / 在泉，按六组手写，不经程序推导）；
 *   2) 运气同化：天符十二年、岁会八年、太乙天符四年、同天符六年、同岁会六年，逐年列名比对；
 *      运气关系五类各十二年；
 *   3) 主运初运太少（壬甲丙乙癸太角、丁己辛戊庚少角）、客运五步、主气客气六步、客主加临；
 *   4) 日期：运气年始于大寒、六步交于春分小满大暑秋分小雪 —— 以 Meeus 太阳黄经独立求节气，1901–2098 每年比对；
 *      大寒至立春之间的日期须带「⚠ 假设」。
 */
import assert from 'node:assert/strict';
import { computeWuyun, locateDate } from '../../lib/systems/wuyun/engine';
import { jdn, jdToBeijing, termJd } from './_oracles';

const ganZhiYear = (gz: string) => {
  // 1984 = 甲子；找 1984–2043 中干支相同的一年
  for (let y = 1984; y < 2044; y++) if (computeWuyun(y).ganZhi === gz) return y;
  throw new Error(gz);
};

// ── 1) 《素问·六元正纪大论》六组（上：司天；中：中运；下：在泉） ──────
const LIUYUAN: [string, string, [string, string][]][] = [
  ['太阳寒水', '太阴湿土', [['壬辰壬戌', '太角'], ['戊辰戊戌', '太徵'], ['甲辰甲戌', '太宫'], ['庚辰庚戌', '太商'], ['丙辰丙戌', '太羽']]],
  ['阳明燥金', '少阴君火', [['丁卯丁酉', '少角'], ['癸卯癸酉', '少徵'], ['己卯己酉', '少宫'], ['乙卯乙酉', '少商'], ['辛卯辛酉', '少羽']]],
  ['少阳相火', '厥阴风木', [['壬寅壬申', '太角'], ['戊寅戊申', '太徵'], ['甲寅甲申', '太宫'], ['庚寅庚申', '太商'], ['丙寅丙申', '太羽']]],
  ['太阴湿土', '太阳寒水', [['丁丑丁未', '少角'], ['癸丑癸未', '少徵'], ['己丑己未', '少宫'], ['乙丑乙未', '少商'], ['辛丑辛未', '少羽']]],
  ['少阴君火', '阳明燥金', [['壬子壬午', '太角'], ['戊子戊午', '太徵'], ['甲子甲午', '太宫'], ['庚子庚午', '太商'], ['丙子丙午', '太羽']]],
  ['厥阴风木', '少阳相火', [['丁巳丁亥', '少角'], ['癸巳癸亥', '少徵'], ['己巳己亥', '少宫'], ['乙巳乙亥', '少商'], ['辛巳辛亥', '少羽']]],
];
let checked = 0;
for (const [siTian, zaiQuan, rows] of LIUYUAN) {
  for (const [pair, yun] of rows) {
    for (const gz of [pair.slice(0, 2), pair.slice(2)]) {
      const c = computeWuyun(ganZhiYear(gz));
      assert.equal(c.siTian.name, siTian, `${gz} 司天`);
      assert.equal(c.zaiQuan.name, zaiQuan, `${gz} 在泉`);
      assert.ok(c.suiYun.label.endsWith(`（${yun}）`), `${gz} 中运应为${yun}：${c.suiYun.label}`);
      assert.equal(c.keYun[0].label, yun, `${gz} 客运初运即中运`);
      checked++;
    }
  }
}
assert.equal(checked, 60);

// ── 2) 运气同化与运气关系 ──────────────────────────────────
const all = Array.from({ length: 60 }, (_, i) => computeWuyun(1984 + i));
const named = (prefix: string) => all.filter(c => c.tongHua.some(t => t.startsWith(prefix))).map(c => c.ganZhi).sort();
const sorted = (s: string) => (s.match(/../g) ?? []).sort();
assert.deepEqual(named('太乙天符'), sorted('戊午乙酉己丑己未'));
const tianFu = all.filter(c => c.tongHua.some(t => t.startsWith('天符') || t.startsWith('太乙天符'))).map(c => c.ganZhi).sort();
assert.deepEqual(tianFu, sorted('己丑己未戊寅戊申戊子戊午乙卯乙酉丁巳丁亥丙辰丙戌'), '天符十二年');
const suiHui = all.filter(c => c.tongHua.some(t => t.startsWith('岁会') || t.startsWith('太乙天符'))).map(c => c.ganZhi).sort();
assert.deepEqual(suiHui, sorted('丁卯戊午甲辰甲戌己丑己未乙酉丙子'), '岁会八年');
assert.deepEqual(named('同天符'), sorted('甲辰甲戌庚子庚午壬寅壬申'), '同天符六年');
assert.deepEqual(named('同岁会'), sorted('辛丑辛未癸卯癸酉癸巳癸亥'), '同岁会六年');
for (const k of ['天符', '顺化', '天刑', '小逆', '不和'] as const) {
  assert.equal(all.filter(c => c.relation.kind === k).length, 12, `运气关系「${k}」应为十二年`);
}
assert.equal(computeWuyun(1984).relation.kind, '顺化', '甲子：少阴君火生土运');
assert.equal(computeWuyun(1990).relation.kind, '天刑', '庚午：少阴君火克金运');

// ── 3) 主运、客运、六气 ────────────────────────────────────
for (const c of all) {
  const taiJiao = '壬甲丙乙癸'.includes(c.stem);
  assert.equal(c.zhuYun[0].label, taiJiao ? '太角' : '少角', `${c.ganZhi} 主运初运`);
  assert.deepEqual(c.zhuYun.map(s => s.yin), ['角', '徵', '宫', '商', '羽']);
  // 太少相生：相邻两步太少交替（主运五步与客运五步皆然）
  for (const steps of [c.zhuYun, c.keYun]) for (let k = 1; k < 5; k++) assert.notEqual(steps[k].tai, steps[k - 1].tai);
  // 主运中与岁运同音的一步，太少与岁运一致
  assert.equal(c.zhuYun.find(s => s.wuXing === c.suiYun.wuXing)!.tai, c.suiYun.excess, `${c.ganZhi} 主运与中运同步`);
  assert.deepEqual(c.steps.map(s => s.zhu.short), ['厥阴', '少阴', '少阳', '太阴', '阳明', '太阳']);
  assert.equal(c.steps[2].ke.name, c.siTian.name);
  assert.equal(c.steps[5].ke.name, c.zaiQuan.name);
}
const jiaZi = computeWuyun(1984);
assert.deepEqual(jiaZi.steps.map(s => s.ke.short), ['太阳', '厥阴', '少阴', '太阴', '少阳', '阳明'], '子午年客气六步');
assert.deepEqual(jiaZi.keYun.map(s => s.label), ['太宫', '少商', '太羽', '少角', '太徵'], '甲年客运');
assert.deepEqual(jiaZi.zhuYun.map(s => s.label), ['太角', '少徵', '太宫', '少商', '太羽'], '甲年主运');
assert.ok(jiaZi.steps[2].relation.startsWith('君位臣'), '子年三之气：客少阴加主少阳');
assert.equal(computeWuyun(1986).steps[2].relation, '客主同气', '丙寅：少阳司天，三之气客少阳加主少阳');
const chenYear = computeWuyun(1988); // 戊辰：太阳司天，二之气客阳明加主少阴（火克金：主胜逆）
assert.equal(chenYear.steps[1].ke.short, '阳明');
assert.ok(chenYear.steps[1].relation.startsWith('主胜客：逆'));
const siYear = computeWuyun(1989); // 己巳：厥阴司天，初之气客阳明加主厥阴（金克木：客胜从）
assert.equal(siYear.steps[0].ke.short, '阳明');
assert.ok(siYear.steps[0].relation.startsWith('客胜主：从'));
// 臣位君：客少阳加于主少阴，出现在卯酉年的二之气
const maoYear = computeWuyun(1987); // 丁卯：阳明司天，客气 太阴 少阳 阳明 太阳 厥阴 少阴
assert.deepEqual(maoYear.steps.map(s => s.ke.short), ['太阴', '少阳', '阳明', '太阳', '厥阴', '少阴']);
assert.ok(maoYear.steps[1].relation.startsWith('臣位君：逆'));

// ── 4) 日期：大寒与六步交司以 Meeus 独立求 ─────────────────────
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
assert.ok(maxDiff <= 20, `六步交司时刻与 Meeus 独立推算最大相差 ${maxDiff} 分钟（应 ≤ 20）`);

const early = locateDate(2026, 1, 25);
assert.equal(early.chart.ganZhi, '丙午', '2026-01-25 已过大寒，属丙午运气年');
assert.ok(early.chart.assumptions[0].startsWith('⚠ 假设：'));
const before = locateDate(2026, 1, 15);
assert.equal(before.chart.ganZhi, '乙巳', '大寒前仍属上一运气年');
assert.equal(before.chart.assumptions.length, 0);
const nov = locateDate(2026, 11, 21);
assert.deepEqual([nov.yunStep, nov.qiStep], [4, 4], '2026-11-21：五运（太羽）、五之气（小雪前）');
assert.equal(locateDate(2026, 11, 22, 16, 0).qiStep, 5, '小雪 15:23 之后为终之气');
assert.throws(() => computeWuyun(2099), /1901–2098/);

console.log(`✓ 五运六气引擎：六十甲子与《六元正纪大论》排列一致；同化与运气关系年数正确；主客运气与客主加临正确；1901–2098 六步交司与 Meeus 推算最大相差 ${maxDiff} 分钟`);
