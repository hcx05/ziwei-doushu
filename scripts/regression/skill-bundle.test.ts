/**
 * Claude Skill（.claude/skills/ziwei-doushu）回归：
 *   1) 仓库里的 scripts/ziwei.mjs 与源码重新打包的结果逐字节一致（改了引擎 / 规则忘记 npm run build:skill 会在这里失败）；
 *   2) 命令行工具能排盘，输出含流年与大限四化落宫；时辰不详带声明；非法日期干净地报错退出；
 *   3) 倪师原话搜索给出逐字原文与 B 站出处；
 *   4) SKILL.md 有合法的 frontmatter，并写明推理分工与溯因重灾区。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/ziwei-doushu');
const bundle = path.join(skillDir, 'scripts/ziwei.mjs');

// ── 1) 产物未过期 ───────────────────────────────────────────
const tmpOut = path.join(mkdtempSync(path.join(tmpdir(), 'ziwei-skill-')), 'ziwei.mjs');
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], {
  env: { ...process.env, SKILL_BUNDLE_OUT: tmpOut }, stdio: 'pipe',
});
assert.ok(
  readFileSync(tmpOut).equals(readFileSync(bundle)),
  'skill 打包产物已过期：请运行 npm run build:skill 并提交 .claude/skills/ziwei-doushu/scripts/ziwei.mjs',
);

// ── 2) 排盘 ─────────────────────────────────────────────────
const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const chart = run('chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州', '--year', '2026');
assert.equal(chart.status, 0, chart.stderr);
for (const must of ['【十二宫】', '命宫在丑', '【当前大限（', '【流年 2026（丙午年）】', '流年四化：化禄天同', '真太阳时校正', '夏令时']) {
  assert.ok(chart.stdout.includes(must), `排盘输出缺少「${must}」`);
}

const unknown = run('chart', '--date', '1990-06-15', '--unknown-time', '--gender', '男');
assert.equal(unknown.status, 0, unknown.stderr);
assert.ok(unknown.stdout.includes('⚠ 不确定：出生时辰不详，本盘按子时假设排出'));

const bad = run('chart', '--date', '1990-02-30', '--time', '01:00', '--gender', '男');
assert.equal(bad.status, 2);
assert.ok(bad.stderr.startsWith('错误：') && bad.stderr.length < 200, '非法日期应只输出一行错误');

const lunar = run('chart', '--date', '1990-05-23', '--lunar', '--time', '10:30', '--gender', '女');
assert.ok(lunar.stdout.includes('农历输入已换算为公历 1990-6-15'));

// ── 3) 原话检索 ─────────────────────────────────────────────
const q = run('quotes', '六亲', '比较差');
assert.ok(q.stdout.includes('「斗数批六亲本来就比较差一点。」'));
assert.ok(q.stdout.includes('https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=1527'));
assert.ok(!q.stdout.includes('cleaned'), '语料清洗标记不应出现在输出里');

const sec = run('sections', 'all');
assert.ok(sec.stdout.includes('**【命格定性】** ［溯因］') && sec.stdout.includes('## liunian'));

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm, 'SKILL.md 须以 name / description frontmatter 开头');
assert.equal(fm[1], 'ziwei-doushu');
assert.ok(fm[2].length <= 1024, 'description 不宜超过 1024 字符');
for (const must of ['⚠ 不确定：', '溯因重灾区', '定盘、校正时辰', '先查再引']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ Claude Skill：打包产物最新、排盘 / 原话 / 小节命令可用、SKILL.md 规则齐全');
