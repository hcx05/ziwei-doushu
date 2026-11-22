/**
 * AI 推理分工迴歸（見 lib/systems/ziwei/tasks.ts）
 *
 * 前提：假設紫微斗數規則成立。工具做不到的不做；做得到但屬溯因的可以做，必須注明
 * 「僅供參考，模型在此類推理有能力限制」。釘住以下幾點：
 *   1) 每個任務的小節都有推理類型，溯因小節的 prompt 必須要求以 UNCERTAINTY_MARK 開頭；
 *   2) 時辰不詳時，命盤帶 hourUnknown，AI 收到的摘要必須聲明「按子時假設」。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ASSUMPTION_MARK, buildTask, REASONING_RULES, TOPICS, UNCERTAINTY_MARK, HOUR_UNKNOWN_NOTICE,
} from '../../lib/systems/ziwei/tasks';
import { generateChart } from '../../lib/systems/ziwei/algorithm';
import { formToBirthInfo } from '../../lib/systems/ziwei/share';

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// ── 1) 推理類型與不確定性要求 ───────────────────────────────
const info = formToBirthInfo({
  year: '1990', month: '6', day: '15', clockHour: '10', clockMinute: '30', gender: 'female',
  unknownTime: false, name: '', province: '', city: '', longitude: 120,
});
const chart = generateChart(info);
const someStar = chart.palaces.flatMap(p => p.stars).find(s => s.type === 'major')!;
const tasks = [
  ...TOPICS.map(t => ({ type: 'topic' as const, key: t.key })),
  ...chart.palaces.map(p => ({ type: 'palace' as const, branch: p.branch })),
  { type: 'sihua' as const, starName: someStar.name, siHua: '忌', view: 'daxian' as const },
];
for (const task of tasks) {
  const built = buildTask(task, chart);
  assert.ok(built, `任務應能組出 prompt：${JSON.stringify(task)}`);
  const titles = built.sections.map(s => s.title);
  assert.equal(new Set(titles).size, titles.length, '同一任務內小節標題不得重複');
  for (const sec of built.sections) {
    assert.ok(built.prompt.includes(`**【${sec.title}】**`), `prompt 缺小節：${sec.title}`);
    if (sec.kind === 'abduction') {
      const block = built.prompt.slice(built.prompt.indexOf(`**【${sec.title}】**`)).split('\n\n')[0];
      assert.ok(block.includes(UNCERTAINTY_MARK), `溯因節「${sec.title}」必須要求以「${UNCERTAINTY_MARK}」開頭`);
    }
  }
}
// 原本混著溯因的「定性 / 建議」小節必須被標成溯因
const overview = buildTask({ type: 'topic', key: 'overview' }, chart)!;
assert.equal(overview.sections.find(s => s.title === '命格定性')?.kind, 'abduction');
assert.equal(overview.sections.find(s => s.title === '主星解讀')?.kind, 'deduction');
const career = buildTask({ type: 'topic', key: 'career' }, chart)!;
assert.equal(career.sections.find(s => s.title === '實際建議')?.kind, 'abduction');
assert.ok(UNCERTAINTY_MARK.includes('僅供參考') && UNCERTAINTY_MARK.includes('模型在此類推理有能力限制'));
assert.ok(REASONING_RULES.includes('可以給出你認為最可能的解讀'), '溯因節可以下結論（但須標注）');
assert.ok(!REASONING_RULES.includes('不判斷出生時辰是否正確'), '已放寬：時辰判斷可做，但須標注');

// ── 2) 時辰不詳 ─────────────────────────────────────────────
const unknown = generateChart(formToBirthInfo({
  year: '1990', month: '6', day: '15', clockHour: '', clockMinute: '', gender: 'male',
  unknownTime: true, name: '', province: '', city: '', longitude: 120,
}));
assert.equal(unknown.birthInfo.hourUnknown, true, '時辰不詳必須隨命盤帶出 hourUnknown');
assert.equal(chart.birthInfo.hourUnknown, undefined, '已知時辰不應帶 hourUnknown');
assert.ok(HOUR_UNKNOWN_NOTICE.includes(`${ASSUMPTION_MARK}出生時辰不詳`) && HOUR_UNKNOWN_NOTICE.includes('子時'));
const digest = read('lib/systems/ziwei/digest.ts');
assert.ok(digest.includes('hourUnknown') && digest.includes('HOUR_UNKNOWN_NOTICE'), '摘要須在時辰不詳時附上聲明');

console.log('✓ AI 推理分工：溯因節須標「僅供參考」、時辰不詳已聲明');
