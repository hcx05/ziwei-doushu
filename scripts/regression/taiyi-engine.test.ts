/**
 * 太乙歲計引擎回歸（lib/systems/taiyi/）—— 以《太乙金鏡式經》原文為準
 *
 *   1) 卷三「陽局天目地目計神主客大小將立成」七十二局，逐局比對 太乙宮、天目、主算、客目、客算、計神
 *      （fixture 由 scripts/data/parse-taiyi-licheng.py 從原文取出）；原文與算法不符處只允許
 *      docs/taiyi-collation.md 記錄的兩處（局三十九、局五十主算，均差十）；
 *   2) 卷二「假令太乙在九宮大義為天目……計得十六」與卷六四個戰例的 主客算、大將、參將；
 *   3) 開元十二年甲子（724）：積年 1,937,281、太歲甲子、五福「在遼東十一年」（卷五）、
 *      大遊「上元甲寅太乙在七宮」且甲寅至開元十二年 371 年（卷五）；
 *   4) 太歲與一般年干支（儒略日以外的獨立推算）逐年一致；陽局週期 72 年、紀 60 年。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOD_NAME, computeTaiyiYear, generalOf, suan, yangJu } from '../../lib/systems/taiyi/engine';
import { ganZhiOf } from '../../lib/systems/bazi/constants';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fx = JSON.parse(readFileSync(path.join(root, 'scripts/regression/fixtures/taiyi-licheng.json'), 'utf8')) as {
  rows: { ju: number; gong: number; tianMu: string; zhuSuan: number; keMu: string; keSuan: number; jiShen: string }[];
};

// ── 1) 七十二局立成 ───────────────────────────────────────
const KNOWN_TEXT_ERRORS = new Map([['39:zhuSuan', { text: 25, computed: 35 }], ['50:zhuSuan', { text: 6, computed: 16 }]]);
assert.equal(fx.rows.length, 72);
let fieldsChecked = 0;
const found: string[] = [];
for (const r of fx.rows) {
  const j = yangJu(r.ju);
  const got = { gong: j.taiyi.gong, tianMu: GOD_NAME[j.tianMu], zhuSuan: j.zhu.suan, keMu: GOD_NAME[j.shiJi], keSuan: j.ke.suan, jiShen: j.jiShen };
  for (const [k, v] of Object.entries(got)) {
    fieldsChecked++;
    const want = r[k as keyof typeof r];
    if (v === want) continue;
    const known = KNOWN_TEXT_ERRORS.get(`${r.ju}:${k}`);
    assert.ok(known && known.text === want && known.computed === v, `局${r.ju} ${k}：立成作 ${want}，算得 ${v}（未記錄的不符）`);
    found.push(`${r.ju}:${k}`);
  }
}
assert.deepEqual(found.sort(), [...KNOWN_TEXT_ERRORS.keys()].sort(), '已記錄的原文不符應仍然存在（否則請更新 docs/taiyi-collation.md）');

// ── 2) 書中算例 ───────────────────────────────────────────
assert.equal(suan('亥', 9), 16, '卷二：太乙在九宮，大義為天目，後大義一算、地主八、和德三、高叢四，計得十六');
const cases: [number, number, number, number, number, number, number][] = [
  // 局, 主算, 主大將, 主參將, 客算, 客大將, 客參將（卷六戰例；第一例原文標「第二局」，數值與第一局相符）
  [1, 7, 7, 1, 13, 3, 9],
  [13, 18, 8, 4, 19, 9, 7],
  [22, 16, 6, 8, 30, 3, 9],
  [28, 14, 4, 2, 9, 9, 7],
];
for (const [ju, zs, zg, zd, ks, kg, kd] of cases) {
  const j = yangJu(ju);
  assert.deepEqual([j.zhu.suan, j.zhu.general, j.zhu.deputy, j.ke.suan, j.ke.general, j.ke.deputy], [zs, zg, zd, ks, kg, kd], `卷六戰例 局${ju}`);
}
assert.equal(GOD_NAME[yangJu(22).shiJi], '天道');
assert.equal(GOD_NAME[yangJu(13).shiJi], '太陽');
assert.equal(generalOf(30), 3, '「若得十置一」：三十置三');
assert.equal(generalOf(24), 4, '「若得二十四棄二十置四」');
assert.equal(generalOf(10), 1);

// ── 3) 開元十二年甲子 ─────────────────────────────────────
const k = computeTaiyiYear(724);
assert.equal(k.jiNian, 1937281);
assert.equal(k.taiSui, '甲子');
assert.equal(k.ju, 49);
assert.deepEqual([k.ji, k.jiYear], [3, 1], '積年去三百六十餘一百二十一，去六十得二，入第三紀第一年');
assert.equal(k.jiShen, '寅', '子年計神在寅');
assert.equal(k.heShen, '丑');
assert.deepEqual([k.wuFu.gong, k.wuFu.yearInGong], ['艮', 11], '卷五：「今開元十二年甲子在遼東十一年也」');
assert.deepEqual([computeTaiyiYear(354).daYou.gong, computeTaiyiYear(354).daYou.yearInGong], [7, 1], '卷五：上元甲寅（晉永和十年）大遊太乙在七宮');
assert.equal(computeTaiyiYear(354).taiSui, '甲寅');
assert.equal(computeTaiyiYear(723).jiNian, 1937280, '上考往古每年減一');

// ── 4) 太歲與週期 ────────────────────────────────────────
for (let y = -3000; y <= 3000; y += 7) {
  if (y === 0) continue;
  const astro = y < 0 ? y + 1 : y;
  const t = computeTaiyiYear(y);
  assert.equal(t.taiSui, ganZhiOf(astro - 4), `${y} 太歲`);
  if (y + 72 !== 0 && (y < 0) === (y + 72 < 0)) assert.equal(computeTaiyiYear(y + 72).ju, t.ju, '陽局七十二年一週');
  assert.ok(t.ju >= 1 && t.ju <= 72 && t.ji >= 1 && t.ji <= 6);
}
assert.equal(computeTaiyiYear(-1).jiNian + 1, computeTaiyiYear(1).jiNian, '公元前一年與公元一年相鄰（無公元 0 年）');
assert.throws(() => computeTaiyiYear(0), /非零整數/);

// 2026 的格局：始擊和德臨三宮掩太乙，客大將三宮囚
const y2026 = computeTaiyiYear(2026);
assert.deepEqual([y2026.ju, y2026.taiyi.gong, GOD_NAME[y2026.shiJi]], [55, 3, '和德']);
assert.ok(y2026.patterns.some(p => p.startsWith('掩')) && y2026.patterns.some(p => p.startsWith('囚：客大將')));

console.log(`✓ 太乙引擎：七十二局立成 ${fieldsChecked} 項中 ${fieldsChecked - found.length} 項與原文一致（另 ${found.length} 處為已記錄的原文誤差）；卷二、卷六算例與開元十二年各項吻合`);
