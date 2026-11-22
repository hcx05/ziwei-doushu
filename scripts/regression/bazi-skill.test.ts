/**
 * 八字 Claude Skill（.claude/skills/bazi）回归：
 *   1) 仓库里的 scripts/bazi.mjs 与源码重新打包的结果逐字节一致；
 *   2) chart 输出四柱、十神、月令、干支作用、大运、流年；口径声明（晚子时、时辰不详、贴近立春）会出现；
 *   3) sections / rules / check 可用，溯因节漏标会被抓到；
 *   4) SKILL.md frontmatter 合法，写明推理分工、八字特有的溯因重灾区与不做清单。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(root, '.claude/skills/bazi');
const bundle = path.join(skillDir, 'scripts/bazi.mjs');
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

// ── 1) 产物未过期 ───────────────────────────────────────────
const tmpDir = mkdtempSync(path.join(tmpdir(), 'bazi-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'bazi.mjs')).equals(readFileSync(bundle)),
  'skill 打包产物已过期：请运行 npm run build:skill 并提交 .claude/skills/bazi/scripts/bazi.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) chart ────────────────────────────────────────────────
const c = run('chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州', '--year', '2026');
assert.equal(c.status, 0, c.stderr);
for (const must of ['年柱：庚午', '月柱：壬午', '日柱：辛亥', '时柱：癸巳', '日主：辛（阴金）', '日主金在月令为「死」',
  '亥巳冲', '逆排', '第4步 戊寅', '【流年 2026】', '流年干支：丙午', '真太阳时校正', '夏令时']) {
  assert.ok(c.stdout.includes(must), `chart 输出缺少「${must}」`);
}
// 时辰交界提醒：真太阳时离奇数整点 15 分钟内要提醒定盘；10:30 不提醒
const edge = run('chart', '--date', '1990-06-15', '--time', '10:55', '--gender', '女');
assert.ok(edge.stdout.includes('距巳、午两个时辰的交界只有 5 分钟'), edge.stdout.slice(0, 400));
assert.ok(!c.stdout.includes('两个时辰的交界'), '10:30 离交界远，不该提醒');
const edgeCity = run('chart', '--date', '1990-06-15', '--time', '11:05', '--gender', '女', '--city', '杭州');
assert.ok(edgeCity.stdout.includes('出生时刻（真太阳时 11:05）'), '有出生地时按真太阳时判断');
// SKILL.md：先问再排、定盘、命主说的事与盘上结论分开
for (const must of ['先问再排', '定盘', '双胞胎', '你提到']) assert.ok(readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8').includes(must), `SKILL.md 缺少「${must}」`);
const late = run('chart', '--date', '1990-06-15', '--time', '23:30', '--gender', '男');
assert.ok(late.stdout.includes('日柱：壬子') && late.stdout.includes('⚠ 假设：出生在晚子时'));
const lateSame = run('chart', '--date', '1990-06-15', '--time', '23:30', '--gender', '男', '--zishi', 'same-day');
assert.ok(lateSame.stdout.includes('日柱：辛亥') && lateSame.stdout.includes('时柱：庚子'));
assert.equal(run('chart', '--date', '1990-06-15', '--time', '23:30', '--gender', '男', '--zishi', 'x').status, 2);
const unknown = run('chart', '--date', '1990-06-15', '--unknown-time', '--gender', '女');
assert.ok(unknown.stdout.includes('⚠ 假设：出生时辰不详') && !unknown.stdout.includes('时柱：'));
const lichun = run('chart', '--date', '2004-02-04', '--time', '19:30', '--gender', '男', '--city', '成都');
assert.ok(lichun.stdout.includes('年柱：癸未') && lichun.stdout.includes('距立春'));
const lunar = run('chart', '--date', '1990-05-23', '--lunar', '--time', '10:30', '--gender', '女');
assert.ok(lunar.stdout.includes('农历输入已换算为公历 1990-6-15') && lunar.stdout.includes('日柱：辛亥'));
const bad = run('chart', '--date', '1990-02-30', '--time', '01:00', '--gender', '男');
assert.equal(bad.status, 2);
assert.ok(bad.stderr.startsWith('错误：'));

// ── 3) sections / rules / check ─────────────────────────────
const sec = run('sections', 'all');
for (const must of ['## bazi', '## bazi-dayun', '## bazi-liunian', '**【日主强弱】** ［溯因］', '**【格局与用神】** ［溯因］', '**【十神配置】** ［演绎］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
assert.ok(run('sections', 'bazi', '--skeleton').stdout.includes(`**【格局与用神】**（仅供参考）\n${MARK}`));
const rules = run('rules').stdout;
assert.ok(rules.includes('假设八字（子平术）的规则成立') && rules.includes(MARK) && rules.includes('扶抑、调候、格局') && rules.includes('神煞'));
const draft = ['**【起运与大运排列】**', '……', '', '**【当前大运与原局】**', '……', '', '**【大运吉凶取舍】**', '偏顺。'].join('\n');
const chk = spawnSync(process.execPath, [bundle, 'check', 'bazi-dayun'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('大运吉凶取舍'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'bazi-dayun', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'bazi-dayun'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm, 'SKILL.md 须以 name / description frontmatter 开头');
assert.equal(fm[1], 'bazi');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假设：', '溯因重灾区：可以回答，但必须标注', '工具做不到的，不做', '扶抑、调候、格局',
  '神煞', '合婚分数', '尚未收入本 skill', 'check', '--zishi same-day', '校正时辰']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 八字 Skill：打包产物最新、排盘 / 口径声明 / 小节 / 检查可用、SKILL.md 规则齐全');
