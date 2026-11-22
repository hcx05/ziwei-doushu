/**
 * 太乙 Claude Skill（.claude/skills/taiyi）回歸：
 *   1) 倉庫裡的 scripts/taiyi.mjs 與源碼重新打包的結果逐字節一致；
 *   2) year / table / ju 可用，輸出積年、局、諸神、主客算、掩囚格、三基五福；參數錯誤乾淨退出；
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
const skillDir = path.join(root, '.claude/skills/taiyi');
const bundle = path.join(skillDir, 'scripts/taiyi.mjs');
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'taiyi-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'taiyi.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/taiyi/scripts/taiyi.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const y = run('year', '2026');
assert.equal(y.status, 0, y.stderr);
for (const must of ['⚠ 假設：歲計以公曆年', '⚠ 假設：積年採《太乙金鏡式經》', '公元 2026 年，太歲丙午；上元積年 1,938,583 算', '陽遁第55局',
  '太乙：3宮（艮），入宮第1年（理天）', '文昌（天目、主目）：武德（申），間神', '始擊（客目）：和德（艮），正宮', '主算 16：主大將 6宮（兌），主參將 8宮（坎）',
  '- 掩：始擊臨太乙宮（艮）', '五福：乾', '不得憑記憶引用']) {
  assert.ok(y.stdout.includes(must), `year 輸出缺少「${must}」`);
}
assert.ok(run('year', '-221').stdout.includes('公元前 221 年，太歲庚辰'));
assert.ok(run('table', '--from', '2024', '--to', '2026').stdout.includes('| 2026 | 丙午 | 55 | 3艮 | 武德 | 和德 | 16 | 3 | 掩、囚 |'));
assert.ok(run('ju', '22').stdout.includes('主算 16（大將 6、參將 8）；客算 30（大將 3、參將 9）'));
assert.equal(run('year', '0').status, 2);
assert.equal(run('year', 'abc').status, 2);
assert.equal(run('ju', '73').status, 2);
assert.equal(run('table', '--from', '2000', '--to', '2100').status, 2);

const sec = run('sections');
for (const must of ['**【積年與局】** ［演繹］', '**【格局】** ［演繹］', '**【年勢判斷】** ［溯因］', '**【分野與世事對應】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假設太乙神數（《太乙金鏡式經》歲計）的規則成立') && rules.includes(MARK) && rules.includes('事後附會'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'taiyi'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('年勢判斷'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'taiyi', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'taiyi'], { encoding: 'utf8', input: fixed }).status, 0);

const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'taiyi');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假設：', '溯因重災區：可以回答，但必須標註', '工具做不到的，不做', '個人命運', '尚未收入', 'check', 'docs/taiyi-collation.md', '事後附會']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
console.log('✓ 太乙 Skill：打包產物最新、year / table / ju / 小節 / 檢查可用、SKILL.md 規則齊全');
