/**
 * 規則條目（lib/systems/ziwei/refs.ts）迴歸：
 *   1) 《全書》卷二十二宮都解析到，星段切分正確（命宮章一星一大段；他宮逗號結尾的續行歸前一星）；
 *   2) refs 輸出的每一句《全書》條文都逐字在原文資料裡，每一句倪師原話都逐字在語料裡（不得生成或改寫）；
 *   3) 示範盤的感情條目、大限同名宮條目正確；沒有條目時明說「沒有」。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateChart } from '../../lib/systems/ziwei/algorithm';
import { buildRefs, palaceStarTable, type Quote } from '../../lib/systems/ziwei/refs';
import { ziWeiQuanShuText } from '../../lib/systems/ziwei/classics/data/quanshu-text.data';
import { LAYER_PALACE_NAMES, branchOfLayerPalace, yearContext } from '../../lib/systems/ziwei/layers';

const quotes = readFileSync('docs/tianji-ziwei/entries.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Quote);
const qsTexts = new Set(ziWeiQuanShuText.chapters.flatMap(c => c.paragraphs.map(p => p.text)));
const quoteTexts = new Set(quotes.map(q => q.quote));

// 1) 解析
const table = palaceStarTable();
assert.deepEqual([...table.keys()].sort(), [...LAYER_PALACE_NAMES].sort(), '十二宮都要解析到');
const ziwei = table.get('命宮')!.get('紫微')!.map(l => l.text);
assert.ok(ziwei[0].startsWith('紫微土，南北斗化帝座'));
assert.ok(ziwei.some(t => t.startsWith('紫微入限吉凶訣')), '命宮章的入限訣歸本星');
assert.ok(!ziwei.some(t => t.startsWith('天機屬木')), '下一星開段不得併入');
const fuqi = table.get('夫妻')!;
assert.ok(fuqi.get('天同')![0].text.startsWith('天同遲娶諧老'));
assert.ok(fuqi.get('太陽')!.some(l => l.text.startsWith('太陰同內助，巨門同無羊陀火鈴空劫不克')), '逗號結尾的續行歸前一星');
assert.ok(!fuqi.get('太陰')!.some(l => l.text.startsWith('太陰同內助，巨門同')), '續行不得誤歸到句首星');
assert.ok(fuqi.get('左輔') && fuqi.get('右弼'), '「左輔右弼」合稱拆給兩顆星');
for (const [palace, byStar] of table) assert.ok(byStar.size >= 10, `${palace} 至少要解析出十顆星`);

// 2) 逐字
function checkVerbatim(text: string, where: string) {
  for (const line of text.split('\n')) {
    const m = line.match(/^\s+- (?:《全書》[^：]+：)?(.+)$/);
    if (!m || line.includes('倪師') || line.includes('「')) continue;
    if (m[1].startsWith('……') || m[1].startsWith('書上與') || m[1].startsWith('沒有')) continue;
    const body = m[1].replace(/……$/, '');
    if (!m[0].includes('《全書》卷一')) assert.ok(qsTexts.has(body), `${where}：《全書》條文不在原文裡：${body}`);
    else assert.ok([...qsTexts].some(t => t.startsWith(body)), `${where}：《全書》卷一總論不是原文開頭：${body}`);
  }
  for (const m of text.matchAll(/「([^」]+)」——/g)) assert.ok(quoteTexts.has(m[1]), `${where}：倪師原話不在語料裡：${m[1]}`);
}
let seed = 99;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
for (let i = 0; i < 120; i++) {
  const chart = generateChart({ year: 1940 + rnd(80), month: 1 + rnd(12), day: 1 + rnd(28), hour: rnd(12), gender: rnd(2) ? 'male' : 'female' } as never);
  checkVerbatim(buildRefs(chart, { palaces: [...LAYER_PALACE_NAMES], quotes }), `第 ${i} 盤`);
}

// 3) 示範盤
const demo = generateChart({ year: 1990, month: 6, day: 15, hour: 5, gender: 'female' } as never);
const love = buildRefs(demo, { palaces: ['夫妻'], quotes });
assert.ok(love.includes('## 本命夫妻：亥宮（本命夫妻）'));
assert.ok(love.includes('  - 天同遲娶諧老，夫宜長妻宜少'));
assert.ok(love.includes('- **天同化忌**'));
const ctx = yearContext(demo, 2026);
const dx = ctx.layers.find(l => l.label === '大限')!;
const dxLove = buildRefs(demo, { palaces: ['夫妻'], branches: [{ label: '大限夫妻', branch: branchOfLayerPalace(dx.mingBranch, '夫妻') }], quotes });
assert.ok(dxLove.includes('## 大限夫妻：申宮（本命疾厄）'));
assert.ok(dxLove.includes('  - 廉貞三度作新郎'), '大限夫妻在申：申宮的廉貞要用《全書》妻妾宮的斷語');
assert.ok(!dxLove.includes('廉貞襁褓災瘡'), '不得混用本命疾厄宮的斷語');

console.log(`✓ 規則條目：十二宮星段解析正確；120 張盤的條目逐字取自《全書》與倪師語料；大限同名宮按該層宮名取條文`);
