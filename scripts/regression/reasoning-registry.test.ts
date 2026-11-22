/**
 * 推理层与体系注册表回归（lib/reasoning/、lib/systems/）
 *
 * 钉住：
 *   1) 紫微斗数的推理规则文本在抽成通用层后逐字不变；
 *   2) 每个登记的体系都有：规则用语、小节集合（每节标好推理类型、至少一个溯因节）、溯因重灾区、不做清单；
 *   3) 输出检查：缺标记的溯因节会被找出并补上；已标注的、演绎节、假设声明不被误改；
 *   4) 给模型照填的骨架本身通过检查。
 */
import assert from 'node:assert/strict';
import { ASSUMPTION_MARK, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { checkMarks, enforceMarks } from '../../lib/reasoning/check';
import { SYSTEMS, findSectionSet } from '../../lib/systems';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
import { REASONING_RULES, ZIWEI_VOCABULARY } from '../../lib/ai/tasks';

// ── 1) 紫微规则全文钉住（2026-11-21 起加「回复写法」：先回答所问、不贴计算过程） ──
const ZIWEI_RULES_BEFORE = [
  '【推理分工规则（最高优先级）】',
  '前提：假设紫微斗数的规则成立，不讨论其真伪，也不加「命理仅供娱乐」之类的免责话术。',
  '每个小节都标了推理类型（这是你的思考清单，不是必须逐节输出的格式，写法见下面「回复写法」）：',
  '· 演绎节：已知命盘＋规则 → 推出结论。按规则得出结论即可，依据一句话带过。',
  '· 归纳节：把已出现的事实整理成共通描述，不新增判断。',
  '· 溯因节：在多种讯号之间取舍定性、给现实建议、推测具体事件、从命主经历反推原因、判断时辰等。',
  '  可以给出你认为最可能的解读，但这类推理语言模型有能力限制，因此：',
  '  1) 小节第一行必须以「⚠ 仅供参考（模型在此类推理有能力限制）：」开头，接着一句话说明这里为何难以确定（例如吉凶讯号并存、规则本身不决定取舍）。',
  '  2) 支持与相反的盘面讯号各写一两条，用白话说明依据，不列推导过程。',
  '  3) 先给出最可能的解读，再用一句话给出另一种同样说得通的解读。',
  '  4) 小节最后一句提醒：这只是参考，哪种解读更贴切，需由命主结合自身实际判断。',
  '演绎节与归纳节里若需要做取舍或推测具体事件，把那部分移到溯因的写法并标注，不要混在演绎里当成定论。',
  '【回复写法】',
  '· 先回答所问：回复一开头就回答命主问的那件事，用白话；不要先讲排盘、起卦或计算过程。',
  '· 不贴过程：算式、起局起卦步骤、取用过程、排盘表格、工具原始输出都不写进回复，依据用一句话带过。命主追问「怎么算的」时再展开。',
  '· 只写相关的小节：演绎、归纳节可以省略，或并成末尾一句「依据」；凡是吉凶、成败、定性、应期、具体事件等溯因结论，必须写在对应的溯因小节标题下并标注，不能写在标题外。',
  '· 工具输出的「⚠ 假设：」要转告，用一句白话说即可。',
].join('\n');
assert.equal(REASONING_RULES, ZIWEI_RULES_BEFORE, '紫微斗数推理规则全文');
assert.equal(buildReasoningRules(ZIWEI_VOCABULARY), ZIWEI_RULES_BEFORE);

// ── 2) 注册表完整性 ─────────────────────────────────────────
const ids = SYSTEMS.map(s => s.id);
assert.equal(new Set(ids).size, ids.length, '体系代号不得重复');
const allKeys = SYSTEMS.flatMap(s => Object.keys(s.sectionSets));
assert.equal(new Set(allKeys).size, allKeys.length, '小节集合代号在所有体系间必须唯一');
for (const sys of SYSTEMS) {
  const rules = buildReasoningRules(sys.vocabulary);
  assert.ok(rules.includes(`假设${sys.vocabulary.systemName}的规则成立`), `${sys.id}：规则须写明前提`);
  assert.ok(rules.includes(UNCERTAINTY_MARK), `${sys.id}：规则须要求溯因标记`);
  assert.ok(Object.keys(sys.sectionSets).length > 0, `${sys.id}：至少要有一个小节集合`);
  assert.ok(sys.abductionHotspots.length > 0, `${sys.id}：须列出溯因重灾区`);
  assert.ok(sys.outOfScope.length > 0, `${sys.id}：须列出不做清单`);
  for (const [key, sections] of Object.entries(sys.sectionSets)) {
    assert.ok(sections.length > 0, `${sys.id}/${key}：小节不能为空`);
    const titles = sections.map(s => s.title);
    assert.equal(new Set(titles).size, titles.length, `${sys.id}/${key}：小节标题重复`);
    for (const s of sections) assert.ok(['deduction', 'induction', 'abduction'].includes(s.kind), `${sys.id}/${key}/${s.title}：缺推理类型`);
    assert.ok(sections.some(s => s.kind === 'abduction'), `${sys.id}/${key}：至少要有一个溯因节，取舍与推测才有地方放`);
    // 骨架照填后应直接通过检查
    assert.ok(checkMarks(renderSkeleton(sections), sections).ok, `${sys.id}/${key}：骨架未通过检查`);
  }
}
assert.equal(findSectionSet('overview')?.system.id, 'ziwei');
assert.equal(findSectionSet('xiaoliuren')?.system.id, 'xiaoliuren');
assert.equal(findSectionSet('nope'), null);

// ── 3) 输出检查与补标 ───────────────────────────────────────
const overview = findSectionSet('overview')!.sections;
const draft = [
  `${ASSUMPTION_MARK}出生时辰不详，本盘按子时假设排出。`,
  '',
  '**【命格定性】**（仅供参考）',
  '命宫日月同宫，明暗讯号并存。',
  '',
  '**【主星解读】**',
  '太阳化禄主外显（命宫太阳化禄）。',
  '',
  '**【三方四正】**',
  '……',
  '',
  '**【当前大限】**',
  '……',
  '',
  '**【优势与注意】**',
  `${ASSUMPTION_MARK}晚子时按次日。`,
  `${UNCERTAINTY_MARK}讯号并存。`,
].join('\n');
const r = checkMarks(draft, overview);
assert.deepEqual(r.unmarkedAbduction, ['命格定性'], '应只抓到未标注的「命格定性」；「优势与注意」先写假设再写标记是合法的');
assert.equal(r.ok, false);

const fixed = enforceMarks(draft, overview);
assert.ok(checkMarks(fixed, overview).ok, '补标后应通过检查');
assert.ok(fixed.includes(`${UNCERTAINTY_MARK}命宫日月同宫，明暗讯号并存。`), '标记应补在溯因节第一行开头，原文保留');
assert.ok(fixed.includes('\n太阳化禄主外显（命宫太阳化禄）。'), '演绎节不应被加标记');
assert.equal(enforceMarks(fixed, overview), fixed, '补标应是幂等的');
assert.equal(fixed.split(UNCERTAINTY_MARK).length - 1, 2, '已标注的溯因节不应重复加标记');

// 溯因节正文为空：补一行标记
const emptyBody = '**【命格定性】**\n\n**【主星解读】**\n……';
assert.ok(checkMarks(enforceMarks(emptyBody, overview), overview).unmarkedAbduction.length === 0);

// 小节按需取用：只写所问相关的一节也合法；但写了的溯因节仍须标注
assert.ok(checkMarks(`**【优势与注意】**（仅供参考）\n${UNCERTAINTY_MARK}……`, overview).ok, '只写一节不算错');
assert.deepEqual(checkMarks('**【优势与注意】**\n讯号并存。', overview).unmarkedAbduction, ['优势与注意']);
// 骨架先回答所问：不含演绎节标题，只列溯因节
const sk = renderSkeleton(overview);
assert.ok(!sk.includes('**【主星解读】**') && sk.includes('**【命格定性】**（仅供参考）') && sk.includes('依据：'));

// 每个 skill 的 SKILL.md 都写明回复写法：先回答所问、不贴过程
for (const dir of readdirSync(path.join(root, '.claude/skills'))) {
  const md = readFileSync(path.join(root, '.claude/skills', dir, 'SKILL.md'), 'utf8');
  assert.ok(/回复写法（先回答所问，不贴过程）|回覆寫法（先回答所問，不貼過程）/.test(md), `${dir}/SKILL.md 缺少回复写法`);
}
// 外掛市集（/plugin marketplace add）列出的 skill 與 .claude/skills 下的資料夾一一對應，新增體系不會漏裝
{
  const market = JSON.parse(readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  const listed = (market.plugins[0].skills as string[]).map(s => path.basename(s)).sort();
  assert.deepEqual(listed, readdirSync(path.join(root, '.claude/skills')).sort(), 'marketplace.json 的 skills 清單與 .claude/skills 不一致');
}
for (const sys of SYSTEMS) assert.ok(buildReasoningRules(sys.vocabulary).includes('【回复写法】'), `${sys.id}：规则须含回复写法`);

console.log(`✓ 推理层：紫微规则全文钉住（含回复写法）；${SYSTEMS.length} 个体系登记齐全；溯因标注检查与补标正确`);
