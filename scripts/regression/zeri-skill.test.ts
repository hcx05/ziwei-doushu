/**
 * 擇日 Claude Skill（.claude/skills/zeri）迴歸：
 *   1) 倉庫裡的 scripts/zeri.mjs 與源碼重新打包的結果逐字節一致；
 *   2) day / find / terms 可用：交節日兩種口徑、生肖相沖標記、白話用語會被攔下並給出對應；參數錯誤乾淨退出；
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
const skillDir = path.join(root, '.claude/skills/zeri');
const bundle = path.join(skillDir, 'scripts/zeri.mjs');
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'zeri-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'zeri.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/zeri/scripts/zeri.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) day / find / terms ───────────────────────────────────
const day = run('day', '2026-11-07', '--shengxiao', '蛇');
assert.equal(day.status, 0, day.stderr);
for (const must of ['⚠ 假設：本日 2026-11-07 17:52（北京時間）交立冬', '干支：丙午年 己亥月 乙酉日', '建除：開日', '朱雀（黑道，凶）',
  '沖煞：沖兔（己卯），煞東', '當事人屬蛇：本日不沖', '節前（戊戌月建）：建除閉', '- 亥時 21:00–22:59 丁亥', '※沖當事人']) {
  assert.ok(day.stdout.includes(must), `day 輸出缺少「${must}」`);
}
assert.ok(!run('day', '2026-11-21', '--no-times').stdout.includes('時辰（'));
const f = run('find', '--yi', '嫁娶', '--from', '2026-12-01', '--to', '2026-12-31', '--shengxiao', '馬');
assert.equal(f.status, 0, f.stderr);
assert.ok(f.stdout.includes('共 4 天（按日期先後，未排序、未評分）'));
assert.ok(f.stdout.includes('- 2026-12-04 星期五 壬子  除日  白虎黑道  鬼宿凶  沖馬  ※日沖當事人'));
assert.ok(f.stdout.includes('- 2026-12-17 星期四 乙丑  除日  天德黃道  斗宿吉  沖羊'));
const alias = run('find', '--yi', '搬家', '--from', '2026-12-01', '--to', '2026-12-31');
assert.equal(alias.status, 2);
assert.ok(alias.stderr.includes('常見對應為：移徙、入宅'));
assert.ok(run('terms', '--for', '籤合同').stdout.includes('立券、交易'));
assert.ok(run('terms').stdout.includes('嫁娶'));
assert.equal(run('find', '--yi', '嫁娶', '--from', '2026-01-01', '--to', '2027-03-01').status, 2);
assert.equal(run('day', '2026-02-30').status, 2);
assert.equal(run('day', '2026-12-01', '--shengxiao', '龍貓').status, 2);

// ── 3) sections / rules / check ─────────────────────────────
const sec = run('sections', 'all');
for (const must of ['## zeri', '## zeri-day', '**【候選日】** ［演繹］', '**【取捨建議】** ［溯因］', '**【綜合看法】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假設擇日（通書，《協紀辨方書》體系）的規則成立') && rules.includes(MARK) && rules.includes('沒有評分'));
const draft = run('sections', 'zeri', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'zeri'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('取捨建議'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'zeri', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'zeri'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'zeri');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假設：', '溯因重災區：可以回答，但必須標注', '工具做不到的，不做', '不評分、不排序', '當事人生肖', '與提問者確認',
  '尚未與印刷版通勝逐日校對', 'check']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 擇日 Skill：打包產物最新、day / find / terms / 小節 / 檢查可用、SKILL.md 規則齊全');
