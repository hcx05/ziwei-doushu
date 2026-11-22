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
const tmpDir = mkdtempSync(path.join(tmpdir(), 'ziwei-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], {
  env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe',
});
assert.ok(
  readFileSync(path.join(tmpDir, 'ziwei.mjs')).equals(readFileSync(bundle)),
  'skill 打包产物已过期：请运行 npm run build:skill 并提交 .claude/skills/ziwei-doushu/scripts/ziwei.mjs',
);

// ── 2) 排盘 ─────────────────────────────────────────────────
const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const chart = run('chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州', '--year', '2026');
assert.equal(chart.status, 0, chart.stderr);
for (const must of ['【十二宫】', '命宫在丑', '【当前大限（', '【流年 2026（丙午年）】', '流年四化：化禄天同', '真太阳时校正', '夏令时']) {
  assert.ok(chart.stdout.includes(must), `排盘输出缺少「${must}」`);
}

const edge = run('chart', '--date', '1990-06-15', '--time', '10:55', '--gender', '女');
assert.ok(edge.stdout.includes('距巳、午两个时辰的交界只有 5 分钟'), '时辰交界要提醒定盘');
assert.ok(!chart.stdout.includes('两个时辰的交界'), '10:30 离交界远，不该提醒');
{
  const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  for (const must of ['先问再排', '定盘', '双胞胎', '你提到']) assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
const unknown = run('chart', '--date', '1990-06-15', '--unknown-time', '--gender', '男');
assert.equal(unknown.status, 0, unknown.stderr);
assert.ok(unknown.stdout.includes('⚠ 假设：出生时辰不详，本盘按子时假设排出'));

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

const liuren = run('liuren', '--lunar-month', '4', '--lunar-day', '5', '--hour', '戌');
assert.equal(liuren.status, 0, liuren.stderr);
assert.ok(liuren.stdout.includes('**空亡**') && liuren.stdout.includes('你可以断念了'));
assert.equal(run('liuren', '--now').status, 2, 'liuren --now 未给时区应报错（不能用服务器时区代替命主的当地时间）');

const ly = run('liuyue', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--year', '2026', '--month', '3');
assert.equal(ly.status, 0, ly.stderr);
assert.ok(ly.stdout.includes('斗君（流年正月）在未宫') && ly.stdout.includes('## 农历3月（壬干）'));

const lr = run('liuri', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--on', '2026-11-21');
assert.equal(lr.status, 0, lr.stderr);
assert.ok(lr.stdout.includes('倪师口径') && lr.stdout.includes('通行口径'));

const rules = run('rules');
assert.ok(rules.stdout.includes('⚠ 仅供参考（模型在此类推理有能力限制）：'));

const sec = run('sections', 'all');
assert.ok(sec.stdout.includes('**【命格定性】** ［溯因］') && sec.stdout.includes('## liunian'));
for (const k of ['## liuyue', '## liuri', '## xiaoliuren']) assert.ok(sec.stdout.includes(k), `sections 缺 ${k}`);

// ── 3b) 溯因标注检查 ───────────────────────────────────────
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';
const draft = '**【起课】**\n……\n\n**【课象】**\n……\n\n**【应期】**\n……\n\n**【对所问之事的含义】**\n可能有第三者。';
const chk = spawnSync(process.execPath, [bundle, 'check', 'xiaoliuren'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1, '漏标的溯因节应让 check 以非零退出');
assert.ok(chk.stdout.includes('对所问之事的含义'));
const fix = spawnSync(process.execPath, [bundle, 'check', 'xiaoliuren', '--fix'], { encoding: 'utf8', input: draft });
assert.ok(fix.stdout.includes(`${MARK}可能有第三者。`), 'check --fix 应补上标记');
const ok = spawnSync(process.execPath, [bundle, 'check', 'xiaoliuren'], { encoding: 'utf8', input: fix.stdout });
assert.equal(ok.status, 0, ok.stdout);
const sk = run('sections', 'overview', '--skeleton');
assert.ok(sk.stdout.includes(`**【命格定性】**（仅供参考）\n${MARK}`), 'sections --skeleton 应给出预填标记的骨架');
assert.ok(run('rules', 'xiaoliuren').stdout.includes('假设小六壬的规则成立'));
assert.equal(run('rules', 'nope').status, 2);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm, 'SKILL.md 须以 name / description frontmatter 开头');
assert.equal(fm[1], 'ziwei-doushu');
assert.ok(fm[2].length <= 1024, 'description 不宜超过 1024 字符');
for (const must of ['⚠ 仅供参考（模型在此类推理有能力限制）：', '⚠ 假设：', '溯因重灾区：可以回答，但必须标注',
  '工具做不到，不做', '定盘、校正时辰', 'check', '先查再引', '小六壬', '同一个念', '流日', '不给分数']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ Claude Skill：打包产物最新、排盘 / 原话 / 小节命令可用、SKILL.md 规则齐全');
