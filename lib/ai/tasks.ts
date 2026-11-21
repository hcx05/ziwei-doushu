/**
 * lib/ai/tasks.ts —— 紫微斗数（与小六壬）的解读任务与小节定义
 *
 * 推理分工的通用部分（推理类型、UNCERTAINTY_MARK、规则文本、输出检查）在 lib/reasoning/，
 * 所有体系共用；这里只放紫微斗数特有的小节结构与用语。
 *
 * 前提：本项目假设紫微斗数的规则成立，不讨论其真伪。
 * 能力边界：本仓库**做不到**的（没有工具或方法）不做；**做得到**、只是属于溯因的，
 * 可以做，但必须以 UNCERTAINTY_MARK 标明「仅供参考，模型在此类推理有能力限制」。
 */

import type { Palace, ZiweiChart } from '@/lib/ziwei/types';
import {
  ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK, type ReasoningKind, type SectionSpec,
} from '@/lib/reasoning/kinds';
import { buildReasoningRules, renderSections, type RulesVocabulary } from '@/lib/reasoning/rules';

export { ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK };
export type { ReasoningKind, SectionSpec };

export type TopicKey = 'overview' | 'love' | 'career' | 'wealth' | 'health' | 'personality';

export type AiTask =
  | { type: 'topic'; key: TopicKey }
  | { type: 'palace'; branch: number }
  | { type: 'sihua'; starName: string; siHua: string; view: 'mingpan' | 'daxian' | 'liunian' };

export const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'overview', label: '命格' },
  { key: 'love', label: '感情' },
  { key: 'career', label: '事业' },
  { key: 'wealth', label: '财运' },
  { key: 'health', label: '健康' },
  { key: 'personality', label: '性格' },
];

// ────────────────── 各主题的小节定义 ──────────────────
// 每个小节只属于一种推理类型；原先混在一起的（如「三方四正 + 整体格局」）已拆开。

const TOPIC_SECTIONS: Record<TopicKey, { intro: string; sections: SectionSpec[] }> = {
  overview: {
    intro: '请生成命格总览',
    sections: [
      { title: '命格定性', kind: 'abduction',
        instruction: '综合全盘，给出命盘核心格局与命主气质的倾向性描述。' },
      { title: '主星解读', kind: 'deduction',
        instruction: '命宫主星（含亮度、四化）按倪海厦体系的规则所对应的特质。' },
      { title: '三方四正', kind: 'deduction',
        instruction: '财帛、官禄、迁移三宫的星曜与四化，按规则逐条说明它们与命宫的联动。只陈述规则推出的内容，不做整体评判。' },
      { title: '当前大限', kind: 'deduction',
        instruction: '当前大限宫位的星曜与大限四化，按规则推出的运势方向。' },
      { title: '优势与注意', kind: 'abduction',
        instruction: '在上述讯号中，哪些较可能是天赋优势、哪些较可能是需要注意的功课。' },
    ],
  },
  love: {
    intro: '请分析感情婚姻运',
    sections: [
      { title: '感情格局', kind: 'abduction',
        instruction: '综合夫妻宫与相关宫位，给出感情命格的倾向性描述。' },
      { title: '夫妻宫分析', kind: 'deduction',
        instruction: '夫妻宫主星、亮度、四化，以及倪海厦体系对此配置的规则判断。' },
      { title: '三方联动', kind: 'deduction',
        instruction: '夫妻宫三方四正的星曜与四化，按规则说明对感情的影响。' },
      { title: '当前大限感情运', kind: 'deduction',
        instruction: '当前大限四化落入或冲照夫妻宫的情况，按规则推出的走向。只讲规则推出的象意；具体事件的推测放到溯因节。' },
      { title: '实际建议', kind: 'abduction',
        instruction: '基于以上象意，可供命主参考的方向。' },
    ],
  },
  career: {
    intro: '请分析事业运',
    sections: [
      { title: '事业格局', kind: 'abduction',
        instruction: '综合官禄宫与相关宫位，讨论较倾向任职还是创业。' },
      { title: '官禄宫分析', kind: 'deduction',
        instruction: '官禄宫主星、亮度、四化，以及倪师对这种配置的规则判断。' },
      { title: '财帛宫联动', kind: 'deduction',
        instruction: '财帛宫与官禄宫的星曜、四化关系，按规则说明财路来源的象意。' },
      { title: '当前大限事业运', kind: 'deduction',
        instruction: '当前大限四化与官禄宫的关系，按规则推出的走向。只讲规则推出的象意；具体事件的推测放到溯因节。' },
      { title: '实际建议', kind: 'abduction',
        instruction: '基于以上象意，可供命主参考的方向与行业类型。' },
    ],
  },
  wealth: {
    intro: '请分析财运',
    sections: [
      { title: '财运格局', kind: 'abduction',
        instruction: '综合财帛、田宅等宫位，讨论财运较倾向主动财还是被动财。' },
      { title: '财帛宫分析', kind: 'deduction',
        instruction: '财帛宫主星、亮度、四化，按规则推出的财富来源与流动象意。' },
      { title: '田宅宫（财库）', kind: 'deduction',
        instruction: '田宅宫星曜与四化，按规则推出的积蓄与不动产象意。' },
      { title: '当前大限财运', kind: 'deduction',
        instruction: '当前大限四化与财帛、田宅的关系，按规则推出的走向。只讲规则推出的象意；具体事件的推测放到溯因节。' },
      { title: '理财建议', kind: 'abduction',
        instruction: '基于以上象意，可供命主参考的理财方向（不承诺收益、不推荐具体标的）。' },
    ],
  },
  health: {
    intro: '请分析健康运势',
    sections: [
      { title: '疾厄宫主星', kind: 'deduction',
        instruction: '疾厄宫星曜、亮度、四化，按规则对应的健康象意。' },
      { title: '主要风险', kind: 'abduction',
        instruction: '在全盘讯号中，哪些部位较值得留意。只谈调养方向，不下诊断。' },
      { title: '大限健康走势', kind: 'deduction',
        instruction: '当前大限四化与疾厄宫的关系，按规则推出的走向。' },
      { title: '预防建议', kind: 'induction',
        instruction: '把以上各节提到的调养方向整理成清单，不新增判断。' },
    ],
  },
  personality: {
    intro: '请解析性格特质',
    sections: [
      { title: '命宫主星性格', kind: 'deduction',
        instruction: '命宫主星（含亮度、四化）按规则对应的性格特质。' },
      { title: '三方性格综合', kind: 'induction',
        instruction: '把财帛、官禄、迁移三宫星曜对应的性格特质整理成共通描述，不做取舍。' },
      { title: '人际关系模式', kind: 'induction',
        instruction: '把交友、迁移宫星曜对应的互动特质整理成共通描述。' },
      { title: '优势与人生课题', kind: 'abduction',
        instruction: '在上述特质中，哪些较可能是优势、哪些较可能是人生课题。' },
    ],
  },
};

const PALACE_ROLES: Record<string, string> = {
  '命宫': '自我、性格、先天格局',
  '兄弟宫': '兄弟关系、合伙人',
  '夫妻宫': '感情关系、婚姻状态',
  '子女宫': '子女缘分、下属关系',
  '财帛宫': '财运来源、收入方式',
  '疾厄宫': '身体健康、意外',
  '迁移宫': '外出机遇、人际格局',
  '交友宫': '朋友圈、贵人、小人',
  '官禄宫': '事业成就、社会地位',
  '田宅宫': '不动产、家庭环境',
  '福德宫': '精神享受、内心福分',
  '父母宫': '父母关系、文书契约',
};

function palaceSections(): SectionSpec[] {
  return [
    { title: '宫位定性', kind: 'abduction',
      instruction: '综合本宫与三方四正，给出这个宫位的倾向性判断。' },
    { title: '主星解读', kind: 'deduction',
      instruction: '本宫主星（含亮度、四化）按倪海厦体系的规则所对应的象意；空宫则按规则借对宫说明。' },
    { title: '三方四正联动', kind: 'deduction',
      instruction: '本宫三方四正的星曜与四化，按规则说明对本宫的影响。' },
    { title: '实际建议', kind: 'abduction',
      instruction: '基于本宫象意，可供命主参考的方向。' },
  ];
}

function sihuaSections(siHua: string, viewLabel: string): SectionSpec[] {
  return [
    { title: `化${siHua}基本含义`, kind: 'deduction',
      instruction: `化${siHua}在倪海厦体系中的规则含义，以及这颗星化${siHua}的特殊含义。` },
    { title: '落宫影响', kind: 'deduction',
      instruction: '按规则说明落宫所主管的领域受到何种影响。' },
    { title: '三方四正飞化路径', kind: 'deduction',
      instruction: '按规则说明对落宫三方四正（对宫、两个三合宫）的联动影响。' },
    { title: '当前运势影响', kind: 'deduction',
      instruction: `在${viewLabel}的时间维度下，按规则推出的象意。只讲规则推出的象意；具体事件的推测放到溯因节。` },
    { title: '实际建议', kind: 'abduction',
      instruction: '基于以上象意，可供命主参考的方向。' },
  ];
}

/**
 * 流年解读的小节。
 * 依据是命盘摘要里的【流年】与【当前大限四化落宫】，都由引擎确定性算出。
 */
export const LIUNIAN_SECTIONS: SectionSpec[] = [
  { title: '流年命宫', kind: 'deduction',
    instruction: '流年命宫落在本命哪一宫、该宫星曜，按规则推出的年度主题象意。' },
  { title: '流年四化落宫', kind: 'deduction',
    instruction: '流年禄权科忌各落本命哪一宫，按规则逐条说明影响的领域。' },
  { title: '与当前大限叠加', kind: 'deduction',
    instruction: '流年四化与当前大限四化同落或冲照的宫位，按规则说明叠加的象意。只讲规则推出的象意；具体事件的推测放到溯因节。' },
  { title: '需留意的领域', kind: 'abduction',
    instruction: '在上述讯号中，今年哪些领域较值得留意。' },
  { title: '实际建议', kind: 'abduction',
    instruction: '基于以上象意，可供命主参考的方向。' },
];

/** 流月解读（Claude Skill 用）。依据：斗君、流月命宫、流月四化，均由 lib/ziwei/liuyue.ts 确定性算出 */
export const LIUYUE_SECTIONS: SectionSpec[] = [
  { title: '流月命宫', kind: 'deduction',
    instruction: '流月命宫落在本命哪一宫、该宫星曜，按规则推出的当月主题象意。' },
  { title: '流月四化落宫', kind: 'deduction',
    instruction: '流月禄权科忌各落本命哪一宫，按规则逐条说明影响的领域。' },
  { title: '与流年大限叠加', kind: 'deduction',
    instruction: '流月四化与流年、当前大限四化同落或冲照的宫位，按规则说明叠加的象意。只讲规则推出的象意；具体事件的推测放到溯因节。' },
  { title: '需留意的领域', kind: 'abduction',
    instruction: '在上述讯号中，这个月哪些领域较值得留意。' },
];

/** 流日解读（Claude Skill 用） */
export const LIURI_SECTIONS: SectionSpec[] = [
  { title: '流日命宫', kind: 'deduction',
    instruction: '流日命宫落在本命哪一宫（倪师口径为主，若与通行口径不同须一并说明），该宫星曜的象意。' },
  { title: '流日四化落宫', kind: 'deduction',
    instruction: '流日（日干）禄权科忌各落本命哪一宫，按规则说明影响的领域。只讲规则推出的象意；具体事件的推测放到溯因节。' },
  { title: '需留意的领域', kind: 'abduction',
    instruction: '在上述讯号中，当天哪些领域较值得留意。' },
];

/** 小六壬（Claude Skill 用）。课象由 lib/divination/xiaoliuren.ts 起出，含义只用倪师原话 */
export const XIAOLIUREN_SECTIONS: SectionSpec[] = [
  { title: '起课', kind: 'deduction',
    instruction: '起课所用的农历月、日、时辰，以及月、日、时各落哪一课，最终课象是什么。' },
  { title: '课象', kind: 'deduction',
    instruction: '引用工具给出的倪师原话说明这一课的含义，附出处；延伸说明放到溯因节。' },
  { title: '应期', kind: 'deduction',
    instruction: '倪师原话里有时间说法的（大安约一周、小吉约两周、速喜马上）照引；倪师没讲的，说明没有原话依据。' },
  { title: '对所问之事的含义', kind: 'abduction',
    instruction: '这一课放到命主所问的那件具体事情上最可能对应什么情况、另有哪几种可能；倪师没讲应期的课也可在此推测。' },
];

// ────────────────── prompt 组装 ──────────────────

const VIEW_LABEL: Record<string, string> = { mingpan: '本命', daxian: '大限', liunian: '流年' };

export interface BuiltTask {
  /** 发给 AI 的 user 消息 */
  prompt: string;
  sections: SectionSpec[];
}

function starDesc(palace: Palace): string {
  const major = palace.stars.filter(s => s.type === 'major');
  return major.length
    ? major.map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、')
    : '空宫（借对宫）';
}

/** 由任务 + 命盘组出 prompt；命盘里找不到对应宫位/星曜时返回 null */
export function buildTask(task: AiTask, chart: ZiweiChart): BuiltTask | null {
  if (task.type === 'topic') {
    const def = TOPIC_SECTIONS[task.key];
    return {
      sections: def.sections,
      prompt: `${def.intro}，按以下结构输出：\n\n${renderSections(def.sections)}`,
    };
  }

  if (task.type === 'palace') {
    const palace = chart.palaces.find(p => p.branch === task.branch);
    if (!palace) return null;
    const sections = palaceSections();
    const role = PALACE_ROLES[palace.name] ?? '';
    return {
      sections,
      prompt:
        `请分析【${palace.name}】（主管：${role}），该宫主星为${starDesc(palace)}，按以下结构输出：\n\n` +
        renderSections(sections),
    };
  }

  const palace = chart.palaces.find(p => p.stars.some(s => s.name === task.starName));
  if (!palace) return null;
  const viewLabel = VIEW_LABEL[task.view];
  const sections = sihuaSections(task.siHua, viewLabel);
  return {
    sections,
    prompt:
      `请分析【${viewLabel}${task.starName}化${task.siHua}】的飞化影响，` +
      `${task.starName}落在【${palace.name}】，按以下结构输出：\n\n${renderSections(sections)}`,
  };
}

// ────────────────── 系统提示里的推理分工规则 ──────────────────

/** 紫微斗数的规则用语 */
export const ZIWEI_VOCABULARY: RulesVocabulary = {
  systemName: '紫微斗数',
  chartNoun: '命盘',
  signalNoun: '盘面',
  subject: '命主',
  abductionExamples: '在多种讯号之间取舍定性、给现实建议、推测具体事件、从命主经历反推原因、判断时辰',
};

/** 小六壬的规则用语 */
export const XIAOLIUREN_VOCABULARY: RulesVocabulary = {
  systemName: '小六壬',
  chartNoun: '课',
  signalNoun: '课象',
  subject: '问事者',
  abductionExamples: '把课象对应到所问之事的具体情况、推测倪师没讲应期的课多久应验',
};

export const REASONING_RULES = buildReasoningRules(ZIWEI_VOCABULARY);

/** 时辰不详时附在命盘摘要里的声明 */
export const HOUR_UNKNOWN_NOTICE = [
  '【重要：出生时辰不详】',
  '命主没有提供出生时辰，本盘是按「子时」这个假设排出的；命宫、身宫、各宫位置与大限都依赖这个假设。',
  `回答开头第一行必须写：「${ASSUMPTION_MARK}出生时辰不详，本盘按子时假设排出，以下所有内容都建立在这个假设上。」`,
  `若命主要求推断真正的出生时辰，那是溯因，按溯因规则以「${UNCERTAINTY_MARK}」标注。`,
].join('\n');

// ────────────────── 小节集合（Skill 的 sections / check 命令与体系注册表共用） ──────────────────

export const ZIWEI_SECTION_KEYS = [
  ...TOPICS.map(t => t.key), 'palace', 'sihua', 'liunian', 'liuyue', 'liuri',
] as const;

/** 不依赖具体命盘的小节集合；sihua 需指定是哪一化（默认「忌」） */
export function ziweiSectionSet(key: string, siHua = '忌'): SectionSpec[] | null {
  if (key in TOPIC_SECTIONS) return TOPIC_SECTIONS[key as TopicKey].sections;
  switch (key) {
    case 'palace': return palaceSections();
    case 'sihua': return sihuaSections(siHua, VIEW_LABEL.daxian);
    case 'liunian': return LIUNIAN_SECTIONS;
    case 'liuyue': return LIUYUE_SECTIONS;
    case 'liuri': return LIURI_SECTIONS;
    default: return null;
  }
}
