/**
 * 择日 Claude Skill（.claude/skills/zeri）回归：
 *   1) 仓库里的 scripts/zeri.mjs 与源码重新打包的结果逐字节一致；
 *   2) day / find / terms 可用：交节日两种口径、生肖相冲标记、白话用语会被拦下并给出对应；参数错误干净退出；
 *   3) sections / rules / check 可用，溯因节漏标会被抓到；
 *   4) SKILL.md frontmatter 合法，写明推理分工与不做清单。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/zeri');
const bundle = path.join(skillDir, 'scripts/zeri.mjs');
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'zeri-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'zeri.mjs')).equals(readFileSync(bundle)),
  'skill 打包产物已过期：请运行 npm run build:skill 并提交 .claude/skills/zeri/scripts/zeri.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) day / find / terms ───────────────────────────────────
const day = run('day', '2026-11-07', '--shengxiao', '蛇');
assert.equal(day.status, 0, day.stderr);
for (const must of ['⚠ 假设：本日 2026-11-07 17:52（北京时间）交立冬', '干支：丙午年 己亥月 乙酉日', '建除：开日', '朱雀（黑道，凶）',
  '冲煞：冲兔（己卯），煞东', '当事人属蛇：本日不冲', '节前（戊戌月建）：建除闭', '- 亥时 21:00–22:59 丁亥', '※冲当事人']) {
  assert.ok(day.stdout.includes(must), `day 输出缺少「${must}」`);
}
assert.ok(!run('day', '2026-11-21', '--no-times').stdout.includes('时辰（'));
const f = run('find', '--yi', '嫁娶', '--from', '2026-12-01', '--to', '2026-12-31', '--shengxiao', '马');
assert.equal(f.status, 0, f.stderr);
assert.ok(f.stdout.includes('共 4 天（按日期先后，未排序、未评分）'));
assert.ok(f.stdout.includes('- 2026-12-04 星期五 壬子  除日  白虎黑道  鬼宿凶  冲马  ※日冲当事人'));
assert.ok(f.stdout.includes('- 2026-12-17 星期四 乙丑  除日  天德黄道  斗宿吉  冲羊'));
const alias = run('find', '--yi', '搬家', '--from', '2026-12-01', '--to', '2026-12-31');
assert.equal(alias.status, 2);
assert.ok(alias.stderr.includes('常见对应为：移徙、入宅'));
assert.ok(run('terms', '--for', '签合同').stdout.includes('立券、交易'));
assert.ok(run('terms').stdout.includes('嫁娶'));
assert.equal(run('find', '--yi', '嫁娶', '--from', '2026-01-01', '--to', '2027-03-01').status, 2);
assert.equal(run('day', '2026-02-30').status, 2);
assert.equal(run('day', '2026-12-01', '--shengxiao', '龙猫').status, 2);

// ── 3) sections / rules / check ─────────────────────────────
const sec = run('sections', 'all');
for (const must of ['## zeri', '## zeri-day', '**【候选日】** ［演绎］', '**【取舍建议】** ［溯因］', '**【综合看法】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假设择日（通书，《协纪辨方书》体系）的规则成立') && rules.includes(MARK) && rules.includes('没有评分'));
const draft = run('sections', 'zeri', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因节')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'zeri'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('取舍建议'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'zeri', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'zeri'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'zeri');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假设：', '溯因重灾区：可以回答，但必须标注', '工具做不到的，不做', '不评分、不排序', '当事人生肖', '与提问者确认',
  '尚未与印刷版通胜逐日校对', 'check']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 择日 Skill：打包产物最新、day / find / terms / 小节 / 检查可用、SKILL.md 规则齐全');
