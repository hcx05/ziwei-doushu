/**
 * 六爻 Claude Skill（.claude/skills/liuyao）迴歸：
 *   1) 倉庫裡的 scripts/liuyao.mjs 與源碼重新打包的結果逐字節一致；
 *   2) cast 兩種起卦方法可用（電腦隨機代擲已移除，--toss 報錯），輸出卦象、裝卦、伏神、變爻、經文；參數錯誤乾淨退出；
 *   3) gua / sections / rules / check 可用，溯因節漏標會被抓到；
 *   4) SKILL.md frontmatter 合法，寫明推理分工、六爻規矩與不做清單。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/liuyao');
const bundle = path.join(skillDir, 'scripts/liuyao.mjs');
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'liuyao-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'liuyao.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/liuyao/scripts/liuyao.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) cast ─────────────────────────────────────────────────
const c = run('cast', '--yao', '987678', '--date', '2026-11-21', '--time', '15:20');
assert.equal(c.status, 0, c.stderr);
for (const must of ['本卦：水火既濟（第63卦），坎宮三世卦', '變卦：澤山咸', '月建：己亥', '旬空：辰巳', '伏：妻財戊午火',
  '→ 化官鬼丙辰土（化空）', '二爻變：以本卦二變爻之辭占，以上爻為主', '「六四：繻有衣袽，終日戒。」', '【取用神參考】']) {
  assert.ok(c.stdout.includes(must), `cast 輸出缺少「${must}」`);
}
const t = run('cast', '--time-cast', '--date', '2026-11-21', '--time', '15:20');
assert.ok(t.stdout.includes('除 8 餘 6 → 上卦坎') && t.stdout.includes('本卦：水山蹇'));
const toss = run('cast', '--toss', '--date', '2026-11-21', '--time', '15:20');
assert.equal(toss.status, 2, '電腦隨機代擲已移除，應報錯');
assert.ok(toss.stderr.includes('不提供電腦隨機代擲'), toss.stderr);
assert.equal(run('cast', '--yao', '98767', '--date', '2026-11-21', '--time', '15:20').status, 2);
assert.equal(run('cast', '--yao', '987678', '--time-cast', '--date', '2026-11-21', '--time', '15:20').status, 2, '起卦方法只能二選一');
assert.equal(run('cast', '--time-cast', '--now').status, 2, '--now 未給時區應報錯');
assert.equal(run('cast', '--time-cast', '--date', '2026-02-30', '--time', '10:00').status, 2);
const late = run('cast', '--yao', '777777', '--date', '2026-11-21', '--time', '23:10');
assert.ok(late.stdout.includes('⚠ 假設：起卦在 23 點後'));

// ── 3) gua / sections / rules / check ───────────────────────
const g = run('gua', '乾');
assert.ok(g.stdout.includes('「初九：潛龍勿用。」') && g.stdout.includes('「用九：見群龍無首，吉。」'));
assert.ok(run('gua', '水雷屯').stdout.includes('第3卦'));
assert.equal(run('gua', '不存在').status, 2);
const sec = run('sections');
for (const must of ['**【裝卦】** ［演繹］', '**【用神】** ［演繹］', '**【吉凶判斷】** ［溯因］', '**【應期】** ［溯因］', '**【經文參考】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假設六爻（納甲筮法）的規則成立') && rules.includes(MARK) && rules.includes('不重複起卦') && rules.includes('神煞'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'liuyao'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('吉凶判斷') && chk.stdout.includes('應期'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'liuyao', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'liuyao'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'liuyao');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假設：', '溯因重災區：可以回答，但必須標注', '工具做不到的，不做', '一卦只問一事', '同一件事不重複起卦',
  '神煞', 'check', '起卦當下的當地時間', 'docs/zhouyi-collation.md', '尚未收入']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 六爻 Skill：打包產物最新、兩種起卦（已無隨機代擲）/ 查卦 / 小節 / 檢查可用、SKILL.md 規則齊全');
