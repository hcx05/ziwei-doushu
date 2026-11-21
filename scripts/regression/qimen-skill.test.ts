/**
 * 奇門遁甲 Claude Skill（.claude/skills/qimen）回歸：
 *   1) 倉庫裡的 scripts/qimen.mjs 與源碼重新打包的結果逐字節一致；
 *   2) pan 以時間起局（含拆補、置閏對照與假設）、以局覆核都可用；參數錯誤乾淨退出；
 *   3) sections / rules / check 可用，溯因節漏標會被抓到；
 *   4) SKILL.md frontmatter 合法，寫明推理分工、流派與不做清單。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/qimen');
const bundle = path.join(skillDir, 'scripts/qimen.mjs');
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'qimen-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'qimen.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/qimen/scripts/qimen.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const p = run('pan', '--date', '2026-11-21', '--time', '15:20');
assert.equal(p.status, 0, p.stderr);
for (const must of ['拆補法：立冬中元，陰遁9局（本工具採用）', '置閏法：小雪中元（超神 6 日），陰遁8局', '⚠ 假设：定局採拆補法', '日己亥、時壬申；旬首甲子（遁戊）',
  '值符：天英（離9宮）加坤2宮', '- 青龍返首：天盤旬首戊加地盤丙，在2宮坤']) {
  assert.ok(p.stdout.includes(must), `pan 輸出缺少「${must}」`);
}
// 交節所在時辰即用新節氣：2026 年小雪 11-22 15:35 前後，申時已交
assert.ok(run('pan', '--date', '2026-11-22', '--time', '15:05').stdout.includes('拆補法：小雪'));
assert.ok(run('pan', '--date', '2026-11-22', '--time', '12:30').stdout.includes('拆補法：立冬'));
assert.ok(run('pan', '--date', '2026-11-21', '--time', '23:30').stdout.includes('⚠ 假设：23 點後起局'));
// 書中例：小滿中局陽二，壬申日丙午時
const e = run('pan', '--dun', '陽', '--ju', '2', '--day', '壬申', '--hour', '丙午');
assert.ok(e.stdout.includes('值符：天心（乾6宮）加離9宮；值使：開門加艮8宮'), e.stdout);
assert.equal(run('pan', '--dun', '陽', '--ju', '10', '--day', '壬申', '--hour', '丙午').status, 2);
assert.equal(run('pan', '--dun', '中', '--ju', '2', '--day', '壬申', '--hour', '丙午').status, 2);
assert.equal(run('pan', '--dun', '陽', '--ju', '2', '--day', '壬丑', '--hour', '丙午').status, 2);

const sec = run('sections');
for (const must of ['**【起局】** ［演绎］', '**【格局】** ［演绎］', '**【吉凶判斷】** ［溯因］', '**【方位與時機】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假设奇門遁甲（《遁甲演義》時家轉盤）的规则成立') && rules.includes(MARK) && rules.includes('拆補法與置閏法'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'qimen'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('吉凶判斷'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'qimen', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'qimen'], { encoding: 'utf8', input: fixed }).status, 0);

const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'qimen');
assert.ok(fm[2].length <= 1024, `description ${fm[2].length} 字`);
for (const must of [MARK, '⚠ 假设', '溯因重災區：可以回答，但必須標註', '工具做不到的，不做', '拆補法', '置閏法', 'check', 'docs/qimen-collation.md', '回覆寫法（先回答所問，不貼過程）']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
console.log('✓ 奇門 Skill：打包產物最新、pan（時間起局與覆核、兩法對照）/ 小節 / 檢查可用、SKILL.md 規則齊全');
