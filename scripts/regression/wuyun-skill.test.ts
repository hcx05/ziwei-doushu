/**
 * 五运六气 Claude Skill（.claude/skills/wuyun-liuqi）回归：
 *   1) 仓库里的 scripts/wuyun.mjs 与源码重新打包的结果逐字节一致；
 *   2) year / date / table 可用，输出岁运、司天在泉、六步、同化；参数错误干净退出；
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
const skillDir = path.join(root, '.claude/skills/wuyun-liuqi');
const bundle = path.join(skillDir, 'scripts/wuyun.mjs');
const MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'wuyun-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'wuyun.mjs')).equals(readFileSync(bundle)),
  'skill 打包产物已过期：请运行 npm run build:skill 并提交 .claude/skills/wuyun-liuqi/scripts/wuyun.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) year / date / table ──────────────────────────────────
const y = run('year', '2026');
assert.equal(y.status, 0, y.stderr);
for (const must of ['运气年：丙午年（2026-01-20 09:44 大寒交司', '岁运（中运）：水运太过（太羽）', '司天：少阴君火（午年）；在泉：阳明燥金',
  '运气关系：不和（运克气）', '初运 太角（木）', '初运 太羽（水）；二运 少角（木）', '三之气  2026-05-21 08:36 起（小满）  主气 少阳相火  客气 少阴君火  → 君位臣：顺',
  '⚠ 假设：五运交接日', '不得凭记忆引用']) {
  assert.ok(y.stdout.includes(must), `year 输出缺少「${must}」`);
}
const d = run('date', '2026-01-25');
assert.ok(d.stdout.includes('⚠ 假设：2026-01-25 12:00 在大寒之后、立春之前') && d.stdout.includes('未给时刻，按当日 12:00'));
assert.ok(run('date', '2026-11-21', '--time', '15:20').stdout.includes('2026-11-21 15:20：主运五运 太羽、客运太商；五之气，主气阳明燥金、客气少阳相火'));
const tb = run('table', '--from', '2024', '--to', '2025');
assert.ok(tb.stdout.includes('| 2024 | 甲辰 | 土运太过（太宫） | 太阳寒水 | 太阴湿土 | 不和 | 岁会'));
assert.equal(run('year', '26').status, 2);
assert.equal(run('year', '2099').status, 2);
assert.equal(run('date', '2026-02-30').status, 2);
assert.equal(run('table', '--from', '2000', '--to', '2070').status, 2);

// ── 3) sections / rules / check ─────────────────────────────
const sec = run('sections');
for (const must of ['**【年局】** ［演绎］', '**【六气】** ［演绎］', '**【气候倾向】** ［溯因］', '**【健康与调养】** ［溯因］', '**【世事对应】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假设五运六气（《素问》运气学说）的规则成立') && rules.includes(MARK) && rules.includes('事后附会'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因节')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'wuyun'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('气候倾向') && chk.stdout.includes('世事对应'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'wuyun', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'wuyun'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'wuyun-liuqi');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假设：', '溯因重灾区：可以回答，但必须标注', '工具做不到的，不做', '运气年以大寒交司', '尚未收入', '不诊断', 'check', '事后附会']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 五运六气 Skill：打包产物最新、year / date / table / 小节 / 检查可用、SKILL.md 规则齐全');
