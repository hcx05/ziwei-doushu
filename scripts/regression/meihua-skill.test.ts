/**
 * 梅花易數 Claude Skill（.claude/skills/meihua）回歸：
 *   1) 倉庫裡的 scripts/meihua.mjs 與源碼重新打包的結果逐字節一致；
 *   2) cast 四種起卦法、topic 可用；參數錯誤乾淨退出；
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
const skillDir = path.join(root, '.claude/skills/meihua');
const bundle = path.join(skillDir, 'scripts/meihua.mjs');
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'meihua-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'meihua.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/meihua/scripts/meihua.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });
const at = ['--date', '2026-11-21', '--time', '15:20'];

const t = run('cast', '--time-cast', ...at, '--topic', '求財');
assert.equal(t.status, 0, t.stderr);
for (const must of ['年 7＋月 10＋日 13 = 30，以八除餘 6，上卦坎', '本卦：水山蹇', '第三爻動', '互卦：上離下坎', '變卦：水地比', '月建 亥（冬季）',
  '體卦：上卦坎', '用：艮（山，土），克體', '【原文：求財占第十】', '「占求財，以體為主，以用為財。', '「艮卦克體，', '「九三：往蹇來反。」', '坎：「水、雨、雪']) {
  assert.ok(t.stdout.includes(must), `cast --time-cast 輸出缺少「${must}」`);
}
// 書中占例：鄰夜扣門（一聲、五聲，酉時）
const knock = run('cast', '--numbers', '1,5', '--add-hour', '--date', '2026-11-21', '--time', '18:10');
assert.ok(knock.stdout.includes('本卦：天風姤') && knock.stdout.includes('第四爻動') && knock.stdout.includes('變卦：巽為風'), knock.stdout);
// 後天端法：老人（乾）往巽方，卯時 → 姤之九四
const old = run('cast', '--trigrams', '乾,東南', '--date', '2026-11-21', '--time', '06:30');
assert.ok(old.stdout.includes('本卦：天風姤') && old.stdout.includes('第四爻動') && old.stdout.includes('克體'), old.stdout);
assert.ok(run('cast', '--number', '5', ...at).stdout.includes('數 5，以八除餘 5，上卦巽'));
assert.ok(run('cast', '--time-cast', '--plus', '4', ...at).stdout.includes('＋加數 4'));
assert.ok(run('cast', '--time-cast', '--date', '2026-02-10', '--time', '12:00').stdout.includes('⚠ 假設：此日在立春與春節之間'));
assert.ok(run('topic').stdout.includes('墳墓占第十八'));
assert.ok(run('topic', '失物').stdout.includes('又以變卦為失物之所在'));
assert.equal(run('cast', ...at).status, 2, '沒有指定起卦法');
assert.equal(run('cast', '--numbers', '1', ...at).status, 2);
assert.equal(run('cast', '--trigrams', '乾,上', ...at).status, 2);
assert.equal(run('topic', '算命').status, 2);

const sec = run('sections');
for (const must of ['**【起卦】** ［演繹］', '**【書中占法】** ［演繹］', '**【吉凶判斷】** ［溯因］', '**【類象與爻辭】** ［溯因］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
const rules = run('rules').stdout;
assert.ok(rules.includes('假設梅花易數（《梅花易數》體用法）的規則成立') && rules.includes(MARK) && rules.includes('不因事不占'));
const draft = run('sections', '--skeleton').stdout.split('\n').filter(l => !l.startsWith('## ') && !l.startsWith('溯因節')).join('\n').replaceAll(MARK, '');
const chk = spawnSync(process.execPath, [bundle, 'check', 'meihua'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('吉凶判斷'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'meihua', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'meihua'], { encoding: 'utf8', input: fixed }).status, 0);

const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm);
assert.equal(fm[1], 'meihua');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假設：', '溯因重災區：可以回答，但必須標註', '工具做不到的，不做', '三要十應', 'check', 'docs/meihua-liuren-collation.md', '不因事不占']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
console.log('✓ 梅花 Skill：打包產物最新、四種起卦法 / 占法原文 / 小節 / 檢查可用、SKILL.md 規則齊全');
