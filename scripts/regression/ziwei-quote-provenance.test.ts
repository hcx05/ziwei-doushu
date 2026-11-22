/**
 * 引文出處迴歸：給模型看的文字裡，凡寫成「倪師說「……」」「倪師講「……」」的，
 * 引號內的話都必須能在倪師語料（docs/tianji-ziwei/ 的 entries.jsonl 與逐字稿）裡逐字找到（忽略標點）。
 * 2026-11-22 發現格局說明裡有 4 句「倪師說」在語料裡一句也找不到，模型會當成原話引用。
 * 另外檢查格局輸出不截斷、有寫明說明文字不是原話。
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { generateChart } from '../../lib/systems/ziwei/algorithm';
import { buildDigest } from '../../lib/systems/ziwei/digest';
import { detectPatterns } from '../../lib/systems/ziwei/patterns';

const norm = (s: string) => s.replace(/[\s，。、！？；：「」『』"“”…·—\-]/g, '');
const dir = 'docs/tianji-ziwei';
const corpus = norm(readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.jsonl'))
  .map(f => readFileSync(`${dir}/${f}`, 'utf8')).join('\n'));

const files = ['lib/systems/ziwei/patterns.ts', 'lib/systems/ziwei/tasks.ts', 'lib/systems/ziwei/digest.ts',
  'lib/systems/ziwei/xiaoliuren.ts', '.claude/skills/ziwei-doushu/SKILL.md'];
const bad: string[] = [];
let checked = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/倪(?:師|海廈)[^「」\n]{0,12}(?:說|講|曰|原話|舉例)[^「」\n]{0,4}「([^」]{4,120})」/g)) {
    checked++;
    if (!corpus.includes(norm(m[1]))) bad.push(`${f}：「${m[1]}」`);
  }
}
assert.deepEqual(bad, [], `以下「倪師說」在語料裡找不到：\n${bad.join('\n')}`);

let seed = 7;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
for (let i = 0; i < 200; i++) {
  const chart = generateChart({ year: 1940 + rnd(80), month: 1 + rnd(12), day: 1 + rnd(28), hour: rnd(12), gender: rnd(2) ? 'male' : 'female' } as never);
  for (const p of detectPatterns(chart)) {
    assert.ok(!/倪師(說|講)/.test(p.description), `${p.name} 的說明文字不應歸給倪師`);
  }
  const digest = buildDigest(chart);
  for (const p of detectPatterns(chart)) assert.ok(digest.includes(`說明：${p.description}`), `${p.name} 的說明被截斷或漏列`);
}
const demo = buildDigest(generateChart({ year: 1990, month: 6, day: 15, hour: 5, gender: 'female' } as never));
assert.ok(demo.includes('不是倪師原話、也不是古籍原文'));
assert.ok(demo.includes('- 太陽化祿入命（中性）｜成立：太陽化祿坐命宮；破格／減力：太陽亮度不，力量減'), '太陽不得地化祿應標減力並降一檔');

console.log(`✓ 引文出處：${checked} 句「倪師說」都在語料裡；格局說明不截斷、不歸給倪師，亮度與煞忌列為減力條件`);
