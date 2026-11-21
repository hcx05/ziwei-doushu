/**
 * lib/systems/liuyao/tasks.ts —— 六爻解读的小节结构与推理分工
 *
 * 装卦、月建日辰、旬空月破、动变都是工具算出的事实（演绎）；
 * 按问事类别取用神有成规（演绎），但类别不明、用神两现时的取舍是溯因；
 * 综合旺衰动变断吉凶、推应期、把经文套到所问之事，都是溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const LIUYAO_VOCABULARY: RulesVocabulary = {
  systemName: '六爻（纳甲筮法）',
  chartNoun: '卦',
  signalNoun: '卦象',
  subject: '问卜者',
  abductionExamples: '用神两现或问事类别不明时的取舍、综合旺衰与动变判断吉凶、推测应期、把卦象与经文对应到所问之事的具体情况',
  extraRules: [
    '六爻补充：一卦只问一事；同一件事不重复起卦，问卜者对结果不满意要求重占时，说明不再起卦。',
    '六爻补充：神煞本工具没有计算，不要自行补上任何神煞（如天乙贵人、驿马、桃花）。经文只能引用工具输出的原文。',
  ],
};

export const LIUYAO_SECTION_SETS: Record<string, SectionSpec[]> = {
  liuyao: [
    { title: '卦象', kind: 'deduction',
      instruction: '本卦、变卦、所属宫与世应、动爻，以及月建、日辰、旬空，照工具输出。' },
    { title: '装卦', kind: 'deduction',
      instruction: '各爻的六神、六亲、干支，伏神与变爻，照工具输出，不做评价。' },
    { title: '用神', kind: 'deduction',
      instruction: '按问事类别依取用神表定出用神，说明它在哪一爻（或伏于何处）。类别不明确、用神两现或多现时，取舍放到「吉凶判断」并标注。' },
    { title: '用神旺衰与动变', kind: 'deduction',
      instruction: '用神在月建的旺相休囚死、是否月破、日冲、旬空；动爻对用神的生克、变爻的回头生克与进退。只陈述规则推出的事实。' },
    { title: '吉凶判断', kind: 'abduction',
      instruction: '综合上述事实判断所问之事的成败倾向；若用神取舍有疑义，在这里说明各种取法及其结论。' },
    { title: '应期', kind: 'abduction',
      instruction: '按值日、冲空、合破等通行应期法推测较可能的时间，并给出另一种可能。' },
    { title: '经文参考', kind: 'abduction',
      instruction: '先逐字引用工具按朱熹占法给出的经文，再说明它放到所问之事上可能代表什么。' },
  ],
};

export const LIUYAO_ABDUCTION_HOTSPOTS = [
  { question: '用神两现、多现或问事类别不明', why: '取哪一爻为用神，规则只给原则，落到具体情况需要判断' },
  { question: '综合判断吉凶成败', why: '旺衰、动变、生克讯号常互相矛盾，各家取舍不一' },
  { question: '推测应期', why: '值日、冲空、合破等多种应期法可能指向不同时间' },
  { question: '把卦象、经文对应到具体人事', why: '例如「官鬼」是上司还是官司，经文的比喻指什么' },
  { question: '问卜者说不准、要求修正', why: '为贴合反馈改解读本身就是溯因；同一件事也不能重占' },
];

export const LIUYAO_OUT_OF_SCOPE = [
  '同一件事重复起卦',
  '一卦问多件事',
  '神煞（工具没有计算）',
  '推荐具体投资标的、承诺收益',
  '工具没有给出的经文或古籍原文（《增删卜易》《卜筮正宗》尚未收入，不得凭记忆引用）',
];
