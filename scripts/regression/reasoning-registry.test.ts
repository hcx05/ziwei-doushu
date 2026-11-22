/**
 * 推理層與體系注冊表迴歸（lib/reasoning/、lib/systems/）
 *
 * 釘住：
 *   1) 紫微斗數的推理規則文本在抽成通用層後逐字不變；
 *   2) 每個登記的體系都有：規則用語、小節集合（每節標好推理類型、至少一個溯因節）、溯因重災區、不做清單；
 *   3) 輸出檢查：缺標記的溯因節會被找出並補上；已標注的、演繹節、假設聲明不被誤改；
 *   4) 給模型照填的骨架本身通過檢查。
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
import { REASONING_RULES, ZIWEI_VOCABULARY } from '../../lib/systems/ziwei/tasks';

// ── 1) 紫微規則全文釘住（2026-11-21 起加「回覆寫法」；2026-11-22 溯因節精簡為結論＋另一種讀法，依評測結果） ──
const ZIWEI_RULES_BEFORE = [
  '【推理分工規則（最高優先級）】',
  '前提：假設紫微斗數的規則成立，不討論其真偽，也不加「命理僅供娛樂」之類的免責話術。',
  '每個小節都標了推理類型（這是你的思考清單，不是必須逐節輸出的格式，寫法見下面「回覆寫法」）：',
  '· 演繹節：已知命盤＋規則 → 推出結論。按規則得出結論即可，依據一句話帶過。',
  '· 歸納節：把已出現的事實整理成共通描述，不新增判斷。',
  '· 溯因節：在多種訊號之間取捨定性、給現實建議、推測具體事件、從命主經歷反推原因、判斷時辰等。',
  '  可以給出你認為最可能的解讀，但這類推理語言模型有能力限制，因此：',
  '  1) 小節第一行必須以「⚠ 僅供參考（模型在此類推理有能力限制）：」開頭，緊接著直接寫最可能的結論，一兩句白話。',
  '  2) 下一行用一句話寫另一種同樣說得通的讀法，以「另一種讀法：」開頭。',
  '  3) 不列支持、相反的盤面訊號，不寫推導過程，不加「這只是參考……」之類的套話；每個溯因小節最多 3 行。命主想看依據時再展開。',
  '演繹節與歸納節裡若需要做取捨或推測具體事件，把那部分移到溯因的寫法並標注，不要混在演繹裡當成定論。',
  '【回覆寫法】',
  '· 先回答所問：回覆第一句就是結論（例如「你的喜用神是土、金」「這件事偏難成」），用白話；不要以命盤概要、干支、宮位或排盤說明開頭。',
  '· 不貼過程：算式、起局起卦步驟、取用過程、排盤表格、工具原始輸出都不寫進回覆。依據只寫一句，不分點、不列清單，也不另開「依據」「各年依據」之類的小節。命主追問「怎麼算的」時再展開。',
  '· 只寫相關的小節：演繹、歸納節可以省略，或併成末尾一句「依據」；凡是吉凶、成敗、定性、應期、具體事件等溯因結論，必須寫在對應的溯因小節標題下並標注，不能寫在標題外。',
  '· 工具輸出的「⚠ 假設：」要轉告，用一句白話說即可。',
  '· 一個問題通常一個溯因小節就夠；全篇最後可加一句「想看依據可以再問」，只說一次。',
  '· 命主告訴你的事與工具推得的結論分開寫：引用時說「你提到……」，不能把命主說過的事說成是盤面看出來的。',
].join('\n');
assert.equal(REASONING_RULES, ZIWEI_RULES_BEFORE, '紫微斗數推理規則全文');
assert.equal(buildReasoningRules(ZIWEI_VOCABULARY), ZIWEI_RULES_BEFORE);

// ── 2) 注冊表完整性 ─────────────────────────────────────────
const ids = SYSTEMS.map(s => s.id);
assert.equal(new Set(ids).size, ids.length, '體系代號不得重複');
const allKeys = SYSTEMS.flatMap(s => Object.keys(s.sectionSets));
assert.equal(new Set(allKeys).size, allKeys.length, '小節集合代號在所有體系間必須唯一');
for (const sys of SYSTEMS) {
  const rules = buildReasoningRules(sys.vocabulary);
  assert.ok(rules.includes(`假設${sys.vocabulary.systemName}的規則成立`), `${sys.id}：規則須寫明前提`);
  assert.ok(rules.includes(UNCERTAINTY_MARK), `${sys.id}：規則須要求溯因標記`);
  assert.ok(Object.keys(sys.sectionSets).length > 0, `${sys.id}：至少要有一個小節集合`);
  assert.ok(sys.abductionHotspots.length > 0, `${sys.id}：須列出溯因重災區`);
  assert.ok(sys.outOfScope.length > 0, `${sys.id}：須列出不做清單`);
  for (const [key, sections] of Object.entries(sys.sectionSets)) {
    assert.ok(sections.length > 0, `${sys.id}/${key}：小節不能為空`);
    const titles = sections.map(s => s.title);
    assert.equal(new Set(titles).size, titles.length, `${sys.id}/${key}：小節標題重複`);
    for (const s of sections) assert.ok(['deduction', 'induction', 'abduction'].includes(s.kind), `${sys.id}/${key}/${s.title}：缺推理類型`);
    assert.ok(sections.some(s => s.kind === 'abduction'), `${sys.id}/${key}：至少要有一個溯因節，取捨與推測才有地方放`);
    // 骨架照填後應直接通過檢查
    assert.ok(checkMarks(renderSkeleton(sections), sections).ok, `${sys.id}/${key}：骨架未通過檢查`);
  }
}
assert.equal(findSectionSet('overview')?.system.id, 'ziwei');
assert.equal(findSectionSet('xiaoliuren')?.system.id, 'xiaoliuren');
assert.equal(findSectionSet('nope'), null);

// ── 3) 輸出檢查與補標 ───────────────────────────────────────
const overview = findSectionSet('overview')!.sections;
const draft = [
  `${ASSUMPTION_MARK}出生時辰不詳，本盤按子時假設排出。`,
  '',
  '**【命格定性】**（僅供參考）',
  '命宮日月同宮，明暗訊號並存。',
  '',
  '**【主星解讀】**',
  '太陽化祿主外顯（命宮太陽化祿）。',
  '',
  '**【三方四正】**',
  '……',
  '',
  '**【當前大限】**',
  '……',
  '',
  '**【優勢與注意】**',
  `${ASSUMPTION_MARK}晚子時按次日。`,
  `${UNCERTAINTY_MARK}訊號並存。`,
].join('\n');
const r = checkMarks(draft, overview);
assert.deepEqual(r.unmarkedAbduction, ['命格定性'], '應只抓到未標注的「命格定性」；「優勢與注意」先寫假設再寫標記是合法的');
assert.equal(r.ok, false);

const fixed = enforceMarks(draft, overview);
assert.ok(checkMarks(fixed, overview).ok, '補標後應通過檢查');
assert.ok(fixed.includes(`${UNCERTAINTY_MARK}命宮日月同宮，明暗訊號並存。`), '標記應補在溯因節第一行開頭，原文保留');
assert.ok(fixed.includes('\n太陽化祿主外顯（命宮太陽化祿）。'), '演繹節不應被加標記');
assert.equal(enforceMarks(fixed, overview), fixed, '補標應是冪等的');
assert.equal(fixed.split(UNCERTAINTY_MARK).length - 1, 2, '已標注的溯因節不應重複加標記');

// 溯因節正文為空：補一行標記
const emptyBody = '**【命格定性】**\n\n**【主星解讀】**\n……';
assert.ok(checkMarks(enforceMarks(emptyBody, overview), overview).unmarkedAbduction.length === 0);

// 小節按需取用：只寫所問相關的一節也合法；但寫了的溯因節仍須標注
assert.ok(checkMarks(`**【優勢與注意】**（僅供參考）\n${UNCERTAINTY_MARK}……`, overview).ok, '只寫一節不算錯');
assert.deepEqual(checkMarks('**【優勢與注意】**\n訊號並存。', overview).unmarkedAbduction, ['優勢與注意']);
// 溯因節篇幅：結論＋另一種讀法通過；貼訊號清單的超過三行要報出來
{
  const short = `**【優勢與注意】**（僅供參考）\n${UNCERTAINTY_MARK}做事穩、貴人多。\n另一種讀法：早年辛苦、中年後順。\n\n依據：命宮太陽化祿。`;
  assert.ok(checkMarks(short, overview).ok, '兩行的溯因節合規（依據行不計）');
  const long = `**【優勢與注意】**（僅供參考）\n${UNCERTAINTY_MARK}訊號並存。\n最可能的讀法：做事穩。支持：太陽化祿。\n也說得通的讀法：早年辛苦。\n這只是參考，哪種更貼切，需由你結合自身實際判斷。`;
  const r = checkMarks(long, overview);
  assert.deepEqual([r.ok, r.unmarkedAbduction, r.tooLongAbduction], [false, [], ['優勢與注意']], '舊式四行寫法要報篇幅過長');
  const trad = short.replace(UNCERTAINTY_MARK, '⚠ 僅供參考（模型在此類推理有能力限制）：');
  assert.ok(checkMarks(trad, overview).ok, '繁體標記同樣認可');
  const listed = short.replace('依據：命宮太陽化祿。', '依據：\n- 命宮太陽化祿\n- 太陰化科\n- 天魁同宮');
  assert.deepEqual(checkMarks(listed, overview).tooLongAbduction, ['優勢與注意'], '分點列依據要算進篇幅');
}
// 骨架先回答所問：不含演繹節標題，只列溯因節
const sk = renderSkeleton(overview);
assert.ok(!sk.includes('**【主星解讀】**') && sk.includes('**【命格定性】**（僅供參考）') && sk.includes('另一種讀法：') && sk.includes('依據：'));

// 每個 skill 的 SKILL.md 都寫明回覆寫法：先回答所問、不貼過程
for (const dir of readdirSync(path.join(root, '.claude/skills'))) {
  const md = readFileSync(path.join(root, '.claude/skills', dir, 'SKILL.md'), 'utf8');
  assert.ok(/回覆寫法（先回答所問，不貼過程）|回覆寫法（先回答所問，不貼過程）/.test(md), `${dir}/SKILL.md 缺少回覆寫法`);
}
// 外掛（plugin.json，市集安裝與評測都用它）列出的 skill 與 .claude/skills 下的資料夾一一對應，新增體系不會漏裝
{
  const plugin = JSON.parse(readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
  const listed = (plugin.skills as string[]).map(s => path.basename(s)).sort();
  assert.deepEqual(listed, readdirSync(path.join(root, '.claude/skills')).sort(), 'plugin.json 的 skills 清單與 .claude/skills 不一致');
}
for (const sys of SYSTEMS) assert.ok(buildReasoningRules(sys.vocabulary).includes('【回覆寫法】'), `${sys.id}：規則須含回覆寫法`);

console.log(`✓ 推理層：紫微規則全文釘住（含回覆寫法）；${SYSTEMS.length} 個體系登記齊全；溯因標注檢查與補標正確`);
