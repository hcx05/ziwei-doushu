/**
 * 大六壬 Claude Skill（.claude/skills/liuren）回歸：
 *   1) 倉庫裡的 scripts/liuren.mjs 與源碼重新打包的結果逐字節一致；
 *   2) ke 以時間起課、以課式覆核都可用，輸出月將、天地盤、四課、三傳、天將與假設；參數錯誤乾淨退出；
 *   3) sections / rules / check 可用，溯因節漏標會被抓到；
 *   4) SKILL.md frontmatter 合法，寫明推理分工與不做清單。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/liuren');
const bundle = path.join(skillDir, 'scripts/liuren.mjs');
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'liuren-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'liuren.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/liuren/scripts/liuren.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const k = run('ke', '--date', '2026-11-21', '--time', '15:20');
assert.equal(k.status, 0, k.stderr);
for (const must of ['上一中氣為霜降', '月將卯（太衝）', '日干支：己亥；占時：申', '旬空：辰巳；貴人：晝貴子，逆行', '巳：子／貴人',
  '第3課：午／亥；天空；下賊上', '【三傳】重審', '初傳：甲午　父母　天空', '⚠ 假设：貴人用通行歌訣', '⚠ 假设：占時用當地鐘錶時間']) {
  assert.ok(k.stdout.includes(must), `ke 輸出缺少「${must}」`);
}
// 換將：2026-02-18 在雨水（2/18 18:52 前後）之後應為亥將
assert.ok(run('ke', '--date', '2026-02-19', '--time', '10:00').stdout.includes('月將亥（登明）'));
assert.ok(run('ke', '--date', '2026-11-21', '--time', '23:30').stdout.includes('⚠ 假设：23 點後起課'));
// 書中明文：辛酉日酉加辛（干上酉）為別責
const bz = run('ke', '--day', '辛酉', '--hour', '子', '--jiang', '亥');
assert.ok(bz.stdout.includes('【三傳】別責') && bz.stdout.includes('柔日取支前三合丑'), bz.stdout);
// 返吟井欄
assert.ok(run('ke', '--day', '丁丑', '--hour', '子', '--jiang', '午').stdout.includes('【三傳】返吟（井欄）'));
assert.equal(run('ke', '--day', '甲丑', '--hour', '子', '--jiang', '亥').status, 2);
assert.equal(run('ke', '--day', '甲子', '--hour', '午').status, 2);
assert.equal(run('ke', '--date', '2026-13-01', '--time', '10:00').status, 2);

const sec = run('sections');
for (const must of ['**【課式】** ［演绎］', '**【四課三傳】** ［演绎］', '**【吉凶判斷】** ［溯因］', '**【應期】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假设大六壬（《六壬大全》九宗門）的规则成立') && rules.includes(MARK) && rules.includes('畢法賦'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'liuren'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('吉凶判斷'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'liuren', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'liuren'], { encoding: 'utf8', input: fixed }).status, 0);

const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'liuren');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假设：', '溯因重災區：可以回答，但必須標註', '工具做不到的，不做', '神煞', '尚未收入', 'check', 'docs/meihua-liuren-collation.md']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
console.log('✓ 六壬 Skill：打包產物最新、ke（時間起課與課式覆核）/ 小節 / 檢查可用、SKILL.md 規則齊全');
