/**
 * 皇極經世 Claude Skill（.claude/skills/huangji）回歸：
 *   1) 倉庫裡的 scripts/huangji.mjs 與源碼重新打包的結果逐字節一致；
 *   2) year / search 可用：定位、原文引用、範圍外與缺頁的說明；參數錯誤乾淨退出；
 *   3) sections / rules / check 可用，溯因節漏標會被抓到；
 *   4) SKILL.md frontmatter 合法，寫明「原書無預言」與不做清單。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/huangji');
const bundle = path.join(skillDir, 'scripts/huangji.mjs');
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'huangji-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'huangji.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/huangji/scripts/huangji.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const now = run('year', '2026');
assert.equal(now.status, 0, now.stderr);
for (const must of ['公元 2026 年，干支丙午；本元第 69,043 年', '會：月午（第7會', '運：星乙（第192運，本會第12運；公元 1744 年至公元 2103 年）',
  '世：辰酉（第2302世，本運第10世；公元 2014 年至公元 2043 年）', '不在「以運經世」逐年紀事範圍']) {
  assert.ok(now.stdout.includes(must), `year 輸出缺少「${must}」`);
}
const yao = run('year', '-2357');
assert.ok(yao.stdout.includes('「甲辰唐帝堯肇位于平陽號陶唐氏'));
assert.ok(run('year', '450').stdout.includes('維基文庫轉錄於此缺頁'));
const s = run('search', '改元貞觀');
assert.ok(s.stdout.includes('- 公元 627 年（丁亥'));
assert.ok(run('search', '不存在的字串甲乙').stdout.includes('沒有找到'));
assert.equal(run('year', '0').status, 2);
assert.equal(run('year', '-99999').status, 2);
assert.equal(run('search').status, 2);

const sec = run('sections');
for (const must of ['**【元會運世】** ［演绎］', '**【經世原文】** ［演绎］', '**【時勢解讀】** ［溯因］']) assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
const rules = run('rules').stdout;
assert.ok(rules.includes(MARK) && rules.includes('書中沒有對後世年份的預言'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'huangji'], { encoding: 'utf8', input: draft }).status, 1);
const fixed = spawnSync(process.execPath, [bundle, 'check', 'huangji', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'huangji'], { encoding: 'utf8', input: fixed }).status, 0);

const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'huangji');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '溯因重災區：可以回答，但必須標註', '工具做不到的，不做', '原書沒有對後世年份的預言', '逐字引用', 'check', 'gen-huangji-chronicle.py']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
console.log('✓ 皇極經世 Skill：打包產物最新、year / search / 小節 / 檢查可用、SKILL.md 規則齊全');
