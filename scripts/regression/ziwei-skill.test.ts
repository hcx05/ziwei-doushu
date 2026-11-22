/**
 * Claude Skill（.claude/skills/ziwei-doushu）迴歸：
 *   1) 倉庫裡的 scripts/ziwei.mjs 與源碼重新打包的結果逐字節一致（改了引擎 / 規則忘記 npm run build:skill 會在這裡失敗）；
 *   2) 命令行工具能排盤，輸出含流年與大限四化落宮；時辰不詳帶聲明；非法日期乾淨地報錯退出；
 *   3) 倪師原話搜索給出逐字原文與 B 站出處；
 *   4) SKILL.md 有合法的 frontmatter，並寫明推理分工與溯因重災區。
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

// ── 1) 產物未過期 ───────────────────────────────────────────
const tmpDir = mkdtempSync(path.join(tmpdir(), 'ziwei-skill-'));
execFileSync(process.execPath, [path.join(root, 'scripts/skill/build.mjs')], {
  env: { ...process.env, SKILL_BUNDLE_OUT_DIR: tmpDir }, stdio: 'pipe',
});
assert.ok(
  readFileSync(path.join(tmpDir, 'ziwei.mjs')).equals(readFileSync(bundle)),
  'skill 打包產物已過期：請運行 npm run build:skill 並提交 .claude/skills/ziwei-doushu/scripts/ziwei.mjs',
);

// ── 2) 排盤 ─────────────────────────────────────────────────
const run = (...args: string[]) => spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', cwd: skillDir });

const chart = run('chart', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--city', '杭州', '--year', '2026');
assert.equal(chart.status, 0, chart.stderr);
for (const must of ['【十二宮】', '命宮在丑', '【2026 年所在大限】36–45歲，大限命宮在戌宮（即當前大限）', '【流年 2026（丙午年）】', '流年四化：化祿天同',
  '化忌廉貞（落申宮：本命疾厄／大限夫妻／流年福德）', '【三盤疊宮（2026 年）】', '申宮：本命疾厄／大限夫妻／流年福德', '真太陽時校正', '夏令時']) {
  assert.ok(chart.stdout.includes(must), `排盤輸出缺少「${must}」`);
}

const edge = run('chart', '--date', '1990-06-15', '--time', '10:55', '--gender', '女');
assert.ok(edge.stdout.includes('距巳、午兩個時辰的交界只有 5 分鐘'), '時辰交界要提醒定盤');
assert.ok(!chart.stdout.includes('兩個時辰的交界'), '10:30 離交界遠，不該提醒');
{
  const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  for (const must of ['先問再排', '定盤', '雙胞胎', '你提到']) assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}
const unknown = run('chart', '--date', '1990-06-15', '--unknown-time', '--gender', '男');
assert.equal(unknown.status, 0, unknown.stderr);
assert.ok(unknown.stdout.includes('⚠ 假設：出生時辰不詳，本盤按子時假設排出'));

const bad = run('chart', '--date', '1990-02-30', '--time', '01:00', '--gender', '男');
assert.equal(bad.status, 2);
assert.ok(bad.stderr.startsWith('錯誤：') && bad.stderr.length < 200, '非法日期應只輸出一行錯誤');

const lunar = run('chart', '--date', '1990-05-23', '--lunar', '--time', '10:30', '--gender', '女');
assert.ok(lunar.stdout.includes('農曆輸入已換算為公曆 1990-6-15'));

// ── 3) 原話檢索 ─────────────────────────────────────────────
const q = run('quotes', '六親', '比較差');
assert.ok(q.stdout.includes('「斗數批六親本來就比較差一點。」'));
assert.ok(q.stdout.includes('https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=1527'));
assert.ok(!q.stdout.includes('cleaned'), '語料清洗標記不應出現在輸出裡');

const refs = run('refs', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--topic', 'love', '--year', '2026', '--layer', '大限');
assert.equal(refs.status, 0, refs.stderr);
assert.ok(refs.stdout.includes('## 大限夫妻：申宮（本命疾厄）') && refs.stdout.includes('廉貞三度作新郎'), 'refs 應按大限同名宮取《全書》條文');
assert.equal(run('refs', '--date', '1990-06-15', '--time', '10:30', '--gender', '女').status, 2, 'refs 沒給主題應報錯');
assert.ok(readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8').includes('查規則條目（解讀前必做）'));

const cls = run('classics', '紫微居午');
assert.ok(cls.stdout.includes('《紫微斗數全書》卷一·斗數骨髓賦：紫微居午無殺湊位至三公'), 'classics 應給出《全書》原文');
const cls2 = run('classics', '天同', '夫妻');
assert.ok(cls2.stdout.includes('卷二·三妻妾：天同遲娶諧老'), '宮名「夫妻」應對到《全書》卷二「妻妾」');
assert.ok(run('classics', '落陷之人').stdout.includes('沒有'), '上游的白話改寫已移除，不應再搜得到');

const liuren = run('liuren', '--lunar-month', '4', '--lunar-day', '5', '--hour', '戌');
assert.equal(liuren.status, 0, liuren.stderr);
assert.ok(liuren.stdout.includes('**空亡**') && liuren.stdout.includes('你可以斷念了'));
assert.equal(run('liuren', '--now').status, 2, 'liuren --now 未給時區應報錯（不能用服務器時區代替命主的當地時間）');

const ly = run('liuyue', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--year', '2026', '--month', '3');
assert.equal(ly.status, 0, ly.stderr);
assert.ok(ly.stdout.includes('斗君（流年正月）在未宮') && ly.stdout.includes('## 農曆3月（壬干）'));

const lr = run('liuri', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--on', '2026-11-21');
assert.equal(lr.status, 0, lr.stderr);
assert.ok(lr.stdout.includes('倪師口徑') && lr.stdout.includes('通行口徑'));

const yrs = run('years', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--from', '2026', '--to', '2028', '--palace', '婚姻');
assert.equal(yrs.status, 0, yrs.stderr);
for (const must of ['## 2026（丙午年）虛歲 37｜大限 36–45歲（命宮在戌）', '涉及夫妻：流年化祿天同入本命夫妻；流年化忌廉貞入大限夫妻',
  '終身不變（生年四化對本命夫妻）：生年化忌天同入本命夫妻', '## 2028（戊申年）']) {
  assert.ok(yrs.stdout.includes(must), `years 輸出缺少「${must}」`);
}
assert.equal(run('years', '--date', '1990-06-15', '--time', '10:30', '--gender', '女', '--palace', '不存在').status, 2);
assert.ok(ly.stdout.includes('流月命宮：') && ly.stdout.includes('／流月命宮；主星'), '流月輸出要帶各層宮名');

const rules = run('rules');
assert.ok(rules.stdout.includes('⚠ 僅供參考（模型在此類推理有能力限制）：'));

const sec = run('sections', 'all');
assert.ok(sec.stdout.includes('**【命格定性】** ［溯因］') && sec.stdout.includes('## liunian'));
for (const k of ['## liuyue', '## liuri', '## xiaoliuren']) assert.ok(sec.stdout.includes(k), `sections 缺 ${k}`);

// ── 3b) 溯因標注檢查 ───────────────────────────────────────
const MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';
const draft = '**【起課】**\n……\n\n**【課象】**\n……\n\n**【應期】**\n……\n\n**【對所問之事的含義】**\n可能有第三者。';
const chk = spawnSync(process.execPath, [bundle, 'check', 'xiaoliuren'], { encoding: 'utf8', input: draft });
assert.equal(chk.status, 1, '漏標的溯因節應讓 check 以非零退出');
assert.ok(chk.stdout.includes('對所問之事的含義'));
const fix = spawnSync(process.execPath, [bundle, 'check', 'xiaoliuren', '--fix'], { encoding: 'utf8', input: draft });
assert.ok(fix.stdout.includes(`${MARK}可能有第三者。`), 'check --fix 應補上標記');
const ok = spawnSync(process.execPath, [bundle, 'check', 'xiaoliuren'], { encoding: 'utf8', input: fix.stdout });
assert.equal(ok.status, 0, ok.stdout);
const sk = run('sections', 'overview', '--skeleton');
assert.ok(sk.stdout.includes(`**【命格定性】**（僅供參考）\n${MARK}`), 'sections --skeleton 應給出預填標記的骨架');
assert.ok(run('rules', 'xiaoliuren').stdout.includes('假設小六壬的規則成立'));
assert.equal(run('rules', 'nope').status, 2);

// ── 4) SKILL.md ─────────────────────────────────────────────
const md = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const fm = md.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/);
assert.ok(fm, 'SKILL.md 須以 name / description frontmatter 開頭');
assert.equal(fm[1], 'ziwei-doushu');
assert.ok(fm[2].length <= 1024, 'description 不宜超過 1024 字符');
for (const must of ['⚠ 僅供參考（模型在此類推理有能力限制）：', '⚠ 假設：', '溯因重災區：可以回答，但必須標注',
  '工具做不到，不做', '定盤、校正時辰', 'check', '先查再引', '小六壬', '同一個念', '流日', '不給分數']) {
  assert.ok(md.includes(must), `SKILL.md 缺少「${must}」`);
}

console.log('✓ Claude Skill：打包產物最新、排盤 / 原話 / 小節命令可用、SKILL.md 規則齊全');
