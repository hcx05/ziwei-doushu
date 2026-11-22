/**
 * 繁體迴歸：倉庫原始碼與各工具的實際輸出都不得出現簡體字。
 *
 * 1) 掃描受版本控制的文字檔（外部函式庫打包產物、簡繁對照表與轉換規則本身除外）；
 * 2) 實際跑紫微、八字、擇日、六爻、奇門、五運六氣的工具，輸出也要是繁體
 *    （lunar-javascript 與 iztro 只輸出簡體，靠 lib/calendar/zh.ts 在邊界轉換）。
 * 檢查用的是一組只在簡體出現、繁體不會用到的常用字。
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SIMPLIFIED = new Set([...'们这个时来为说对会过还没东车门问间开关见长马鸟书学国义从众优传陈阴阳气运宫贵禄权杀贞军机门财迁仆岁节历农']);
const EXEMPT = [
  /^\.claude\/skills\/[^/]+\/scripts\/[^/]+\.mjs$/, // 打包產物內含函式庫原文
  /^lib\/calendar\/zh-trad\.data\.ts$/,
  /^lib\/systems\/huangji\/chronicle\.data\.ts$/, // 《皇極經世書》底本原字照錄（含宫、来、禄等異體）
  /^scripts\/i18n\//,
  /^scripts\/regression\/traditional-chinese\.test\.ts$/,
  /\.png$/,
];

function hits(text: string): string[] {
  const found = new Set<string>();
  for (const ch of text) if (SIMPLIFIED.has(ch)) found.add(ch);
  return [...found];
}

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const bad: string[] = [];
for (const f of files) {
  if (EXEMPT.some(re => re.test(f))) continue;
  let text: string;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  const h = hits(text);
  if (h.length) bad.push(`${f}：${h.join('')}`);
}
assert.deepEqual(bad, [], `以下檔案含簡體字：\n${bad.join('\n')}`);
console.log(`✓ ${files.length} 個受控檔案沒有簡體字`);

const run = (skill: string, script: string, args: string[]) =>
  execFileSync('node', [`.claude/skills/${skill}/scripts/${script}`, ...args], { encoding: 'utf8' });
const outputs: [string, string][] = [
  ['紫微 chart', run('ziwei-doushu', 'ziwei.mjs', ['chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州', '--year', '2026'])],
  ['紫微 liuyue', run('ziwei-doushu', 'ziwei.mjs', ['liuyue', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--year', '2026', '--month', '3'])],
  ['八字 chart', run('bazi', 'bazi.mjs', ['chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州'])],
  ['擇日 day', run('zeri', 'zeri.mjs', ['day', '--date', '2026-12-01'])],
  ['六爻 cast', run('liuyao', 'liuyao.mjs', ['cast', '--yao', '789678', '--date', '2026-11-22', '--time', '10:00'])],
  ['奇門 pan', run('qimen', 'qimen.mjs', ['pan', '--date', '2026-11-22', '--time', '10:00'])],
  ['五運六氣 year', run('wuyun-liuqi', 'wuyun.mjs', ['year', '--year', '2026'])],
];
for (const [name, out] of outputs) {
  assert.deepEqual(hits(out), [], `${name} 輸出含簡體字`);
}
console.log(`✓ ${outputs.length} 個工具輸出都是繁體`);
