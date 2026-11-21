/**
 * lib/ai/tasks.ts —— AI 解读任务白名单与「推理分工」
 *
 * 设计依据：大语言模型擅长演绎（Deduction）与归纳（Induction），
 * 但溯因（Abduction，从观察「跳」到最佳解释）存在根本限制。
 *
 * 前提：本项目假设紫微斗数的规则成立，不讨论其真伪。在这个前提下：
 *   · 演绎：已知命盘 + 规则 → 推出结论（例：夫妻宫主星的象意）。交给 AI。
 *   · 归纳：把多条事实整理成共通的描述（例：三方性格综合）。交给 AI。
 *   · 溯因：在多种讯号之间取舍、定性、给出「最可能的解释」或现实建议。
 *     不交给 AI 下结论。保留的小节必须由 AI 明确标出不确定性，
 *     最终判断留给命主本人。
 *
 * 已移除的溯因重灾区功能：
 *   · 自由追问 / 聊天（使用者可以问「为什么会发生 X」「我的时辰对不对」）
 *   · 合盘 AI 分析（缘分匹配度等综合评判）
 *
 * 前端只能从这里列出的任务中选一个，服务端（app/api/interpret）按任务自己组 prompt，
 * 不接受任意文本提问。
 */

import type { Palace, ZiweiChart } from '@/lib/ziwei/types';

export type ReasoningKind = 'deduction' | 'induction' | 'abduction';

export const REASONING_LABEL: Record<ReasoningKind, string> = {
  deduction: '演绎',
  induction: '归纳',
  abduction: '溯因',
};

/** 溯因小节在输出中必须使用的开头标记（前端、测试都依赖这个字面量） */
export const UNCERTAINTY_MARK = '⚠ 不确定：';

export interface SectionSpec {
  /** 小节标题（不含【】），AI 必须原样输出为 **【标题】** */
  title: string;
  /** 本小节要求 AI 做的事 */
  instruction: string;
  kind: ReasoningKind;
}

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
        instruction: '当前大限四化落入或冲照夫妻宫的情况，按规则推出的走向。只讲象意，不推测具体事件。' },
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
        instruction: '当前大限四化与官禄宫的关系，按规则推出的走向。只讲象意，不推测具体事件。' },
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
        instruction: '当前大限四化与财帛、田宅的关系，按规则推出的走向。只讲象意，不推测具体事件。' },
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
      instruction: `在${viewLabel}的时间维度下，按规则推出的象意。只讲象意，不推测会发生的具体事件。` },
    { title: '实际建议', kind: 'abduction',
      instruction: '基于以上象意，可供命主参考的方向。' },
  ];
}

// ────────────────── 任务校验与 prompt 组装 ──────────────────

const TOPIC_KEYS = new Set<string>(TOPICS.map(t => t.key));
const SIHUA_VALUES = new Set(['禄', '权', '科', '忌']);
const VIEW_LABEL: Record<string, string> = { mingpan: '本命', daxian: '大限', liunian: '流年' };

/** 把前端送来的任意值收窄成合法任务；不合法返回 null（服务端据此拒绝自由提问） */
export function parseTask(raw: unknown): AiTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (t.type === 'topic' && typeof t.key === 'string' && TOPIC_KEYS.has(t.key)) {
    return { type: 'topic', key: t.key as TopicKey };
  }
  if (t.type === 'palace' && Number.isInteger(t.branch) && (t.branch as number) >= 0 && (t.branch as number) <= 11) {
    return { type: 'palace', branch: t.branch as number };
  }
  if (
    t.type === 'sihua' &&
    typeof t.starName === 'string' && /^[一-龥]{1,4}$/.test(t.starName) &&
    typeof t.siHua === 'string' && SIHUA_VALUES.has(t.siHua) &&
    typeof t.view === 'string' && t.view in VIEW_LABEL
  ) {
    return { type: 'sihua', starName: t.starName, siHua: t.siHua, view: t.view as 'mingpan' | 'daxian' | 'liunian' };
  }
  return null;
}

export interface BuiltTask {
  /** 发给 AI 的 user 消息 */
  prompt: string;
  sections: SectionSpec[];
}

function renderSections(sections: SectionSpec[]): string {
  return sections
    .map(s => {
      const tag = s.kind === 'abduction'
        ? `［溯因节：必须以「${UNCERTAINTY_MARK}」开头，按系统提示的溯因规则写］`
        : `［${REASONING_LABEL[s.kind]}节］`;
      return `**【${s.title}】**\n${tag}${s.instruction}`;
    })
    .join('\n\n');
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

export const REASONING_RULES = [
  '【推理分工规则（最高优先级）】',
  '前提：假设紫微斗数的规则成立，不讨论其真伪，也不加「命理仅供娱乐」之类的免责话术。',
  '每个小节都标了推理类型：',
  '· 演绎节：已知命盘＋规则 → 推出结论。直接按规则写，句末注明依据。',
  '· 归纳节：把前面已出现的事实整理成共通描述，不新增判断。',
  `· 溯因节：需要在多种讯号之间取舍、定性，或从象意跳到现实建议。这类推理语言模型并不可靠，因此：`,
  `  1) 小节第一行必须以「${UNCERTAINTY_MARK}」开头，用一句话说明为何这里无法确定（例如吉凶讯号并存、规则本身不决定取舍）。`,
  '  2) 分别列出支持与相反的盘面讯号，每条注明依据。',
  '  3) 只用「倾向」「可能」「较偏向」等措辞，并至少给出另一种同样说得通的解读。',
  '  4) 小节最后一句提醒：哪种解读更贴切，需由命主结合自身实际判断。',
  '  5) 不推测具体会发生的事件，不判断出生时辰是否正确，不从命主现实经历反推盘面原因。',
  '演绎节与归纳节里若发现自己需要做取舍，停下来，改为如实列出各条讯号，不要下结论。',
].join('\n');

/** 时辰不详时附在命盘摘要里的声明 */
export const HOUR_UNKNOWN_NOTICE = [
  '【重要：出生时辰不详】',
  '命主没有提供出生时辰，本盘是按「子时」这个假设排出的；命宫、身宫、各宫位置与大限都依赖这个假设。',
  `回答开头第一行必须写：「${UNCERTAINTY_MARK}出生时辰不详，本盘按子时假设排出，以下所有内容都建立在这个假设上。」`,
  '不要尝试推断真正的出生时辰。',
].join('\n');
