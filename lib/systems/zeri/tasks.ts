/**
 * lib/systems/zeri/tasks.ts —— 择日解读的小节结构与推理分工
 *
 * 某日宜忌、值星、神煞、冲煞都是查表（演绎）；把提问者的事对应到通书用语、
 * 在多个可用日之间取舍、宜忌与神煞互相矛盾时以谁为准，规则没有统一的先后，属于溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const ZERI_VOCABULARY: RulesVocabulary = {
  systemName: '择日（通书，《协纪辨方书》体系）',
  chartNoun: '日课资料',
  signalNoun: '宜忌神煞',
  subject: '提问者',
  abductionExamples: '在多个可用日之间取舍、宜忌与吉神凶煞互相矛盾时的取舍、把提问者的事对应到通书用语（如「签约」算立券还是交易）、推断用了某日之后的结果',
  extraRules: [
    '择日补充：只能用工具查出的宜忌与神煞；通书没有列出的「吉日」理由（如数字谐音）不要当成择日依据。',
    '择日补充：工具筛出的日子是按日期先后列出的，没有评分；要推荐其中一天时，写成溯因并说明取舍理由与另一个同样可用的选择。',
    '择日补充：与当事人生肖相冲的日子，通书一般不取用；当事人生肖不明时要先问，不要假设。',
  ],
};

export const ZERI_SECTION_SETS: Record<string, SectionSpec[]> = {
  zeri: [
    { title: '所问之事', kind: 'deduction',
      instruction: '提问者要办的事、日期范围、当事人生肖，以及采用的通书用语（若用语对应有疑问，在「取舍建议」里说明）。' },
    { title: '候选日', kind: 'deduction',
      instruction: '工具筛出的「宜此事且不忌」日子，照列建除、天神黄黑道、宿、冲煞与日冲当事人的标记，不评分。' },
    { title: '各日宜忌神煞', kind: 'deduction',
      instruction: '对提问者关心的几天，照工具输出列出宜、忌、吉神、凶煞与较吉的时辰，不做取舍。' },
    { title: '取舍建议', kind: 'abduction',
      instruction: '若要从候选日中推荐，说明你看重哪些讯号、为什么，并至少给出另一个同样说得通的选择。' },
  ],
  'zeri-day': [
    { title: '当日资料', kind: 'deduction',
      instruction: '干支、建除、天神黄黑道、宿、九星、冲煞，照工具输出。' },
    { title: '宜忌与神煞', kind: 'deduction',
      instruction: '当日宜、忌、吉神、凶煞，以及提问者关心的事是否在宜或忌之列；交节当日的两种口径要一并说明。' },
    { title: '时辰', kind: 'deduction',
      instruction: '与所问之事相关的时辰宜忌与黄黑道，照工具输出。' },
    { title: '综合看法', kind: 'abduction',
      instruction: '宜忌、神煞、时辰讯号不一致时，综合说明这一天用来办这件事的倾向，以及另一种读法。' },
  ],
};

export const ZERI_ABDUCTION_HOTSPOTS = [
  { question: '多个可用日挑哪一天', why: '通书只给每日的宜忌，没有给日与日之间的排序规则' },
  { question: '宜忌与神煞互相矛盾', why: '例如宜嫁娶但逢凶煞，以哪一方为准各家不一' },
  { question: '白话的事对应哪个通书用语', why: '例如「签约」可对应立券或交易，「装修」可对应修造或动土' },
  { question: '用了某日之后结果会如何', why: '择日只讲宜忌，不预言结果' },
];

export const ZERI_OUT_OF_SCOPE = [
  '按当事人八字喜用神择日（本工具只检查生肖相冲）',
  '奇门等其他择吉法、方位吉凶（本工具只列出当日九星，不推方位）',
  '通书没有列出的「吉日」理由（数字谐音、星座等）',
  '断言用了某日就一定顺利',
];
