/**
 * lib/systems/wuyun/tasks.ts —— 五运六气解读的小节结构与推理分工
 *
 * 岁运、司天在泉、主客运气、同化与客主加临都是查表（演绎）；
 * 《素问》对各年气候、病候有原则性描述，但把它落到「今年哪里会怎样、会流行什么病、会发生什么事」
 * 全是溯因 —— 同一年局在不同地域、不同体质上表现不同，所以这些小节一律标注。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const WUYUN_VOCABULARY: RulesVocabulary = {
  systemName: '五运六气（《素问》运气学说）',
  chartNoun: '年局',
  signalNoun: '运气',
  subject: '提问者',
  abductionExamples: '判断该年是否为平气、推测某年某地的气候特点、推测疾病流行倾向、把年局对应到社会或世界事件、给出调养建议、从已发生的气候或疫情反推运气',
  extraRules: [
    '五运六气补充：运气说的是一年的大气候与人群的普遍倾向，不对应具体某个人的病，也不对应具体某地某天的天气。任何具体化都属于溯因，且不得写成预言。',
    '五运六气补充：拿已发生的事件（天灾、疫情、战乱）去「印证」年局属于事后附会，一律按溯因写并标注；同一年局在不同地区表现不同，必须给出至少一种不同的读法。',
    '五运六气补充：《素问》原文尚未收入仓库，不得凭记忆引用经文；也不要补上工具没有算的交司时刻、南北政、平气判定。',
  ],
};

export const WUYUN_SECTION_SETS: Record<string, SectionSpec[]> = {
  wuyun: [
    { title: '年局', kind: 'deduction',
      instruction: '运气年干支与起止、岁运太过不及、司天在泉、运气关系与运气同化，照工具输出。' },
    { title: '五运', kind: 'deduction',
      instruction: '主运、客运五步的太少与交接日期；交接口径的差异照工具的假设说明转述。' },
    { title: '六气', kind: 'deduction',
      instruction: '主气、客气六步的交接日期与客主加临的顺逆，照工具输出，说明各自按什么规则得出。' },
    { title: '气候倾向', kind: 'abduction',
      instruction: '根据岁运、司天在泉与各步客主加临，推测这一年及各时段较可能的气候特点；说明地域差异会让表现不同。' },
    { title: '健康与调养', kind: 'abduction',
      instruction: '人群层面较需留意的脏腑与病候倾向，以及饮食起居的调养方向。不诊断任何个人，不推荐药方剂量。' },
    { title: '世事对应', kind: 'abduction',
      instruction: '只在提问者问到时写：把年局对应到农业、社会或世界事件的可能读法。至少给两种读法，并说明这是附会性质的推测。' },
  ],
};

export const WUYUN_ABDUCTION_HOTSPOTS = [
  { question: '某年是否为平气', why: '太过被抑、不及得助的条件各家说法不一，本工具没有判定' },
  { question: '某年某地的具体气候', why: '运气只给一年大气候的倾向，落到某地某季是跳跃' },
  { question: '疫病会不会流行、流行什么病', why: '《素问》只给病候原则，具体疫情受太多运气以外的因素影响' },
  { question: '用年局解释已发生的天灾、疫情或世局', why: '事后附会：同一年局总能找到相符的事件' },
  { question: '对应到某个人的身体状况', why: '运气是人群层面的倾向，个人还要看体质与病史' },
];

export const WUYUN_OUT_OF_SCOPE = [
  '个人疾病诊断、处方与剂量（请就医）',
  '某地某日的天气预报',
  '交司时刻、南北政、平气判定（本工具没有计算）',
  '《素问》运气七篇原文（尚未收入仓库，不得凭记忆引用）',
  '断言某年必有某种灾难或疫情',
];
