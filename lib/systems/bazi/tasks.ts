/**
 * lib/systems/bazi/tasks.ts —— 八字解读的小节结构与推理分工
 *
 * 八字最大的溯因来源是「日主强弱」与「用神」：扶抑、调候、格局三种取法常给出不同答案，
 * 规则本身不决定取哪一种，所以这两节一律是溯因节，必须列出各法的候选。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const BAZI_VOCABULARY: RulesVocabulary = {
  systemName: '八字（子平术）',
  chartNoun: '八字',
  signalNoun: '干支',
  subject: '命主',
  abductionExamples: '判断日主强弱、取格局与用神、判断合化成败、推测具体事件与应期、从已发生的事反推原因、校正时辰',
  extraRules: [
    '八字补充：日主强弱与用神没有唯一答案。写这两节时，扶抑、调候、格局三种取法各自会得出什么要分别列出，再说你较倾向哪一个及理由。',
    '八字补充：神煞本工具没有计算，不要自行补上任何神煞（如天乙贵人、桃花、驿马）。',
  ],
};

export const BAZI_SECTION_SETS: Record<string, SectionSpec[]> = {
  bazi: [
    { title: '四柱与日主', kind: 'deduction',
      instruction: '照工具输出列出四柱干支、日主的五行阴阳与月令，不做评价。' },
    { title: '十神配置', kind: 'deduction',
      instruction: '天干与藏干的十神（以工具输出为准），按十神的定义说明各自对应的六亲与象意。' },
    { title: '月令与根气', kind: 'deduction',
      instruction: '日主在月令的旺相休囚死、通根位置与本中余气、比劫印与食伤财官的个数、五行个数。只陈述事实，不下强弱结论。' },
    { title: '干支作用', kind: 'deduction',
      instruction: '工具列出的合、冲、刑、害与旬空，按规则说明各自的象意。合化能否成功属于溯因，放到下一节。' },
    { title: '日主强弱', kind: 'abduction',
      instruction: '综合得令、得地、得势判断日主偏强或偏弱；若有合化，判断成败。说明不同计分方法可能得出不同结论。' },
    { title: '格局与用神', kind: 'abduction',
      instruction: '分别列出扶抑、调候、格局三种取法得出的用神候选，再说较倾向哪一个及理由。' },
    { title: '实际建议', kind: 'abduction',
      instruction: '基于以上象意，可供命主参考的方向（行业、五行调养、人际）。不承诺结果。' },
  ],
  'bazi-dayun': [
    { title: '起运与大运排列', kind: 'deduction',
      instruction: '顺逆、起运时间与各步大运干支、年份、虚岁，照工具输出。' },
    { title: '当前大运与原局', kind: 'deduction',
      instruction: '当前大运天干的十神、地支五行，以及工具列出的大运与原局之间的合冲刑害，按规则说明象意。' },
    { title: '大运吉凶取舍', kind: 'abduction',
      instruction: '结合你在命局分析中倾向的用神，判断这步大运整体偏顺或偏逆；用神取法不同时，说明结论会怎么变。' },
  ],
  'bazi-liunian': [
    { title: '流年干支', kind: 'deduction',
      instruction: '流年干支、天干十神、所在大运，以及工具列出的流年与原局、大运之间的合冲刑害。' },
    { title: '需留意的领域', kind: 'abduction',
      instruction: '在上述讯号中，今年哪些领域较值得留意；推测具体事件也写在这里。' },
    { title: '实际建议', kind: 'abduction',
      instruction: '基于以上象意，可供命主参考的方向。' },
  ],
};

export const BAZI_ABDUCTION_HOTSPOTS = [
  { question: '日主强弱', why: '得令、得地、得势各派计分不同，讯号常互相矛盾' },
  { question: '格局与用神', why: '扶抑、调候、格局三种取法常给出不同用神' },
  { question: '合化成败', why: '要看月令、透干、有无冲破，各家条件不一' },
  { question: '推测具体事件与应期', why: '干支作用只给象意，落到哪件事、哪个月是跳跃' },
  { question: '从已发生的事反推原因', why: '同一件事可对应多组干支作用' },
  { question: '校正时辰', why: '从性格与经历反推时柱，候选时辰都可能说得通' },
  { question: '十神对应到具体某位亲人', why: '同一十神可代表多种六亲，男女命取法也不同' },
];

export const BAZI_OUT_OF_SCOPE = [
  '神煞（工具没有计算）',
  '合婚分数、配对指数（没有计分方法）',
  '工具查不到的古籍原文（子平真诠、滴天髓、穷通宝鉴尚未收入仓库，不得凭记忆引用）',
  '国运、地区运势（八字只为个人出生时间设计）',
];
