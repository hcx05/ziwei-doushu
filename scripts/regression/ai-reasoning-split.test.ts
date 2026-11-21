/**
 * AI 推理分工回归（见 lib/ai/tasks.ts）
 *
 * 前提：假设紫微斗数规则成立。工具做不到的不做；做得到但属溯因的可以做，必须注明
 * 「仅供参考，模型在此类推理有能力限制」。钉住以下几点：
 *   1) 每个任务的小节都有推理类型，溯因小节的 prompt 必须要求以 UNCERTAINTY_MARK 开头；
 *   2) 时辰不详时，命盘带 hourUnknown，AI 收到的摘要必须声明「按子时假设」。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ASSUMPTION_MARK, buildTask, REASONING_RULES, TOPICS, UNCERTAINTY_MARK, HOUR_UNKNOWN_NOTICE,
} from '../../lib/ai/tasks';
import { generateChart } from '../../lib/ziwei/algorithm';
import { formToBirthInfo } from '../../lib/ziwei/share';

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// ── 1) 推理类型与不确定性要求 ───────────────────────────────
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
  assert.ok(built, `任务应能组出 prompt：${JSON.stringify(task)}`);
  const titles = built.sections.map(s => s.title);
  assert.equal(new Set(titles).size, titles.length, '同一任务内小节标题不得重复');
  for (const sec of built.sections) {
    assert.ok(built.prompt.includes(`**【${sec.title}】**`), `prompt 缺小节：${sec.title}`);
    if (sec.kind === 'abduction') {
      const block = built.prompt.slice(built.prompt.indexOf(`**【${sec.title}】**`)).split('\n\n')[0];
      assert.ok(block.includes(UNCERTAINTY_MARK), `溯因节「${sec.title}」必须要求以「${UNCERTAINTY_MARK}」开头`);
    }
  }
}
// 原本混着溯因的「定性 / 建议」小节必须被标成溯因
const overview = buildTask({ type: 'topic', key: 'overview' }, chart)!;
assert.equal(overview.sections.find(s => s.title === '命格定性')?.kind, 'abduction');
assert.equal(overview.sections.find(s => s.title === '主星解读')?.kind, 'deduction');
const career = buildTask({ type: 'topic', key: 'career' }, chart)!;
assert.equal(career.sections.find(s => s.title === '实际建议')?.kind, 'abduction');
assert.ok(UNCERTAINTY_MARK.includes('仅供参考') && UNCERTAINTY_MARK.includes('模型在此类推理有能力限制'));
assert.ok(REASONING_RULES.includes('可以给出你认为最可能的解读'), '溯因节可以下结论（但须标注）');
assert.ok(!REASONING_RULES.includes('不判断出生时辰是否正确'), '已放宽：时辰判断可做，但须标注');

// ── 2) 时辰不详 ─────────────────────────────────────────────
const unknown = generateChart(formToBirthInfo({
  year: '1990', month: '6', day: '15', clockHour: '', clockMinute: '', gender: 'male',
  unknownTime: true, name: '', province: '', city: '', longitude: 120,
}));
assert.equal(unknown.birthInfo.hourUnknown, true, '时辰不详必须随命盘带出 hourUnknown');
assert.equal(chart.birthInfo.hourUnknown, undefined, '已知时辰不应带 hourUnknown');
assert.ok(HOUR_UNKNOWN_NOTICE.includes(`${ASSUMPTION_MARK}出生时辰不详`) && HOUR_UNKNOWN_NOTICE.includes('子时'));
const digest = read('lib/ai/digest.ts');
assert.ok(digest.includes('hourUnknown') && digest.includes('HOUR_UNKNOWN_NOTICE'), '摘要须在时辰不详时附上声明');

console.log('✓ AI 推理分工：溯因节须标「仅供参考」、时辰不详已声明');
