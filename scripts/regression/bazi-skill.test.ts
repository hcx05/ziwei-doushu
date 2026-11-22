/**
 * 八字 Claude Skill（.claude/skills/bazi）迴歸：
 *   1) 倉庫裡的 scripts/bazi.mjs 與源碼重新打包的結果逐字節一致；
 *   2) chart 輸出四柱、十神、月令、干支作用、大運、流年；口徑聲明（晚子時、時辰不詳、貼近立春）會出現；
 *   3) sections / rules / check 可用，溯因節漏標會被抓到；
 *   4) SKILL.md frontmatter 合法，寫明推理分工、八字特有的溯因重災區與不做清單。
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
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';

// ── 1) 產物未過期 ───────────────────────────────────────────
const tmpDir = mkdtempSync(path.join(tmpdir(), 'bazi-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], { env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe' });
assert.ok(readFileSync(path.join(tmpDir, 'bazi.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/bazi/scripts/bazi.mjs');

const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

// ── 2) chart ────────────────────────────────────────────────
const c = run('chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州', '--year', '2026');
assert.equal(c.status, 0, c.stderr);
for (const must of ['年柱：庚午', '月柱：壬午', '日柱：辛亥', '時柱：癸巳', '日主：辛（陰金）', '日主金在月令為「死」',
  '亥巳沖', '逆排', '第4步 戊寅', '【流年 2026】', '流年干支：丙午', '真太陽時校正', '夏令時']) {
  assert.ok(c.stdout.includes(must), `chart 輸出缺少「${must}」`);
}
// 時辰交界提醒：真太陽時離奇數整點 15 分鐘內要提醒定盤；10:30 不提醒
const edge = run('chart', '--date', '1990-06-15', '--time', '10:55', '--gender', '女');
assert.ok(edge.stdout.includes('距巳、午兩個時辰的交界只有 5 分鐘'), edge.stdout.slice(0, 400));
assert.ok(!c.stdout.includes('兩個時辰的交界'), '10:30 離交界遠，不該提醒');
const edgeCity = run('chart', '--date', '1990-06-15', '--time', '11:05', '--gender', '女', '--city', '杭州');
assert.ok(edgeCity.stdout.includes('出生時刻（真太陽時 11:05）'), '有出生地時按真太陽時判斷');
// SKILL.md：先問再排、定盤、命主說的事與盤上結論分開
for (const must of ['先問再排', '定盤', '雙胞胎', '你提到']) assert.ok(readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8').includes(must), `SKILL.md 缺少「${must}」`);
const late = run('chart', '--date', '1990-06-15', '--time', '23:30', '--gender', '男');
assert.ok(late.stdout.includes('日柱：壬子') && late.stdout.includes('⚠ 假設：出生在晚子時'));
const lateSame = run('chart', '--date', '1990-06-15', '--time', '23:30', '--gender', '男', '--zishi', 'same-day');
assert.ok(lateSame.stdout.includes('日柱：辛亥') && lateSame.stdout.includes('時柱：庚子'));
assert.equal(run('chart', '--date', '1990-06-15', '--time', '23:30', '--gender', '男', '--zishi', 'x').status, 2);
const unknown = run('chart', '--date', '1990-06-15', '--unknown-time', '--gender', '女');
assert.ok(unknown.stdout.includes('⚠ 假設：出生時辰不詳') && !unknown.stdout.includes('時柱：'));
const lichun = run('chart', '--date', '2004-02-04', '--time', '19:30', '--gender', '男', '--city', '成都');
assert.ok(lichun.stdout.includes('年柱：癸未') && lichun.stdout.includes('距立春'));
const lunar = run('chart', '--date', '1990-05-23', '--lunar', '--time', '10:30', '--gender', '女');
assert.ok(lunar.stdout.includes('農曆輸入已換算為公曆 1990-6-15') && lunar.stdout.includes('日柱：辛亥'));
const bad = run('chart', '--date', '1990-02-30', '--time', '01:00', '--gender', '男');
assert.equal(bad.status, 2);
assert.ok(bad.stderr.startsWith('錯誤：'));

// ── 3) sections / rules / check ─────────────────────────────
const sec = run('sections', 'all');
for (const must of ['## bazi', '## bazi-dayun', '## bazi-liunian', '**【日主強弱】** ［溯因］', '**【格局與用神】** ［溯因］', '**【十神配置】** ［演繹］']) {
  assert.ok(sec.stdout.includes(must), `sections 缺少「${must}」`);
}
assert.ok(run('sections', 'bazi', '--skeleton').stdout.includes(`**【格局與用神】**（僅供參考）\n${MARK}`));
const rules = run('rules').stdout;
assert.ok(rules.includes('假設八字（子平術）的規則成立') && rules.includes(MARK) && rules.includes('扶抑、調候、格局') && rules.includes('神煞'));
const draft = ['**【起運與大運排列】**', '……', '', '**【當前大運與原局】**', '……', '', '**【大運吉凶取捨】**', '偏順。'].join('\n');
const chk = spawnSync(process.execPath, [bundle, 'check', 'bazi-dayun'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1);
assert.ok(chk.stdout.includes('大運吉凶取捨'));
const fixed = spawnSync(process.execPath, [bundle, 'check', 'bazi-dayun', '--fix'], { encoding: 'utf8', input: draft }).stdout;
assert.equal(spawnSync(process.execPath, [bundle, 'check', 'bazi-dayun'], { encoding: 'utf8', input: fixed }).status, 0);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm, 'SKILL.md 須以 name / description frontmatter 開頭');
assert.equal(fm[1], 'bazi');
assert.ok(fm[2].length <= 1024);
for (const must of [MARK, '⚠ 假設：', '溯因重災區：可以回答，但必須標注', '工具做不到的，不做', '扶抑、調候、格局',
  '神煞', '合婚分數', '尚未收入本 skill', 'check', '--zishi same-day', '校正時辰']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ 八字 Skill：打包產物最新、排盤 / 口徑聲明 / 小節 / 檢查可用、SKILL.md 規則齊全');
