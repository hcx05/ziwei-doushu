/**
 * 五運六氣 Claude Skill（.claude/skills/wuyun-liuqi）迴歸：
 *   1) 倉庫裡的 scripts/wuyun.mjs 與源碼重新打包的結果逐字節一致；
 *   2) year / date / table 可用，輸出歲運、司天在泉、六步、同化；參數錯誤乾淨退出；
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
const skillDir = path.join(root, '.claude/skills/wuyun-liuqi');
const bundle = path.join(skillDir, 'scripts/wuyun.mjs');
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'wuyun-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'wuyun.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/wuyun-liuqi/scripts/wuyun.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) year / date / table ──────────────────────────────────
const y = run('year', '2026');
assert.equal(y.status, 0, y.stderr);
for (const must of ['運氣年：丙午年（2026-01-20 09:44 大寒交司', '歲運（中運）：水運太過（太羽）', '司天：少陰君火（午年）；在泉：陽明燥金',
  '運氣關係：不和（運克氣）', '初運 太角（木）', '初運 太羽（水）；二運 少角（木）', '三之氣  2026-05-21 08:36 起（小滿）  主氣 少陽相火  客氣 少陰君火  → 君位臣：順',
  '⚠ 假設：五運交接日', '不得憑記憶引用']) {
  assert.ok(y.stdout.includes(must), `year 輸出缺少「${must}」`);
}
const d = run('date', '2026-01-25');
assert.ok(d.stdout.includes('⚠ 假設：2026-01-25 12:00 在大寒之後、立春之前') && d.stdout.includes('未給時刻，按當日 12:00'));
assert.ok(run('date', '2026-11-21', '--time', '15:20').stdout.includes('2026-11-21 15:20：主運五運 太羽、客運太商；五之氣，主氣陽明燥金、客氣少陽相火'));
const tb = run('table', '--from', '2024', '--to', '2025');
assert.ok(tb.stdout.includes('| 2024 | 甲辰 | 土運太過（太宮） | 太陽寒水 | 太陰溼土 | 不和 | 歲會'));
assert.equal(run('year', '26').status, 2);
assert.equal(run('year', '2099').status, 2);
assert.equal(run('date', '2026-02-30').status, 2);
assert.equal(run('table', '--from', '2000', '--to', '2070').status, 2);

// ── 3) sections / rules / check ─────────────────────────────
const sec = run('sections');
for (const must of ['**【年局】** ［演繹］', '**【六氣】** ［演繹］', '**【氣候傾向】** ［溯因］', '**【健康與調養】** ［溯因］', '**【世事對應】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假設五運六氣（《素問》運氣學說）的規則成立') && rules.includes(MARK) && rules.includes('事後附會'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'wuyun'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('氣候傾向') && chk.stdout.includes('世事對應'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'wuyun', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'wuyun'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'wuyun-liuqi');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假設：', '溯因重災區：可以回答，但必須標注', '工具做不到的，不做', '運氣年以大寒交司', '尚未收入', '不診斷', 'check', '事後附會']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 五運六氣 Skill：打包產物最新、year / date / table / 小節 / 檢查可用、SKILL.md 規則齊全');
