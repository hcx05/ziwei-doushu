/**
 * 六爻 Claude Skill（.claude/skills/liuyao）回归：
 *   1) 仓库里的 scripts/liuyao.mjs 与源码重新打包的结果逐字节一致；
 *   2) cast 两种起卦方法可用（电脑随机代掷已移除，--toss 报错），输出卦象、装卦、伏神、变爻、经文；参数错误干净退出；
 *   3) gua / sections / rules / check 可用，溯因节漏标会被抓到；
 *   4) SKILL.md frontmatter 合法，写明推理分工、六爻规矩与不做清单。
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
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'liuyao-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'liuyao.mjs')).equals(readFileSync(bundle)),
  'skill 打包产物已过期：请运行 npm run build:skill 并提交 .claude/skills/liuyao/scripts/liuyao.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) cast ─────────────────────────────────────────────────
const c = run('cast', '--yao', '987678', '--date', '2026-11-21', '--time', '15:20');
assert.equal(c.status, 0, c.stderr);
for (const must of ['本卦：水火既济（第63卦），坎宫三世卦', '变卦：泽山咸', '月建：己亥', '旬空：辰巳', '伏：妻财戊午火',
  '→ 化官鬼丙辰土（化空）', '二爻变：以本卦二变爻之辞占，以上爻为主', '「六四：繻有衣袽，终日戒。」', '【取用神参考】']) {
  assert.ok(c.stdout.includes(must), `cast 输出缺少「${must}」`);
}
const t = run('cast', '--time-cast', '--date', '2026-11-21', '--time', '15:20');
assert.ok(t.stdout.includes('除 8 余 6 → 上卦坎') && t.stdout.includes('本卦：水山蹇'));
const toss = run('cast', '--toss', '--date', '2026-11-21', '--time', '15:20');
assert.equal(toss.status, 2, '电脑随机代掷已移除，应报错');
assert.ok(toss.stderr.includes('不提供电脑随机代掷'), toss.stderr);
assert.equal(run('cast', '--yao', '98767', '--date', '2026-11-21', '--time', '15:20').status, 2);
assert.equal(run('cast', '--yao', '987678', '--time-cast', '--date', '2026-11-21', '--time', '15:20').status, 2, '起卦方法只能二选一');
assert.equal(run('cast', '--time-cast', '--now').status, 2, '--now 未给时区应报错');
assert.equal(run('cast', '--time-cast', '--date', '2026-02-30', '--time', '10:00').status, 2);
const late = run('cast', '--yao', '777777', '--date', '2026-11-21', '--time', '23:10');
assert.ok(late.stdout.includes('⚠ 假设：起卦在 23 点后'));

// ── 3) gua / sections / rules / check ───────────────────────
const g = run('gua', '乾');
assert.ok(g.stdout.includes('「初九：潜龙勿用。」') && g.stdout.includes('「用九：见群龙无首，吉。」'));
assert.ok(run('gua', '水雷屯').stdout.includes('第3卦'));
assert.equal(run('gua', '不存在').status, 2);
const sec = run('sections');
for (const must of ['**【装卦】** ［演绎］', '**【用神】** ［演绎］', '**【吉凶判断】** ［溯因］', '**【应期】** ［溯因］', '**【经文参考】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假设六爻（纳甲筮法）的规则成立') && rules.includes(MARK) && rules.includes('不重复起卦') && rules.includes('神煞'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因节')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'liuyao'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('吉凶判断') && chk.stdout.includes('应期'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'liuyao', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'liuyao'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'liuyao');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假设：', '溯因重灾区：可以回答，但必须标注', '工具做不到的，不做', '一卦只问一事', '同一件事不重复起卦',
  '神煞', 'check', '起卦当下的当地时间', 'docs/zhouyi-collation.md', '尚未收入']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 六爻 Skill：打包产物最新、两种起卦（已无随机代掷）/ 查卦 / 小节 / 检查可用、SKILL.md 规则齐全');
