/**
 * lib/reasoning/rules.ts —— 推理分工规则文本（各体系共用，只替换体系相关的名词）
 */
import { REASONING_LABEL, UNCERTAINTY_MARK, type SectionSpec } from './kinds';

export interface RulesVocabulary {
  /** 体系名，用于前提句：「假设 X 的规则成立」 */
  systemName: string;
  /** 工具产出的对象：命盘 / 卦 / 课 / 年局 …… */
  chartNoun: string;
  /** 讯号来源的说法：盘面 / 卦象 / 课象 …… */
  signalNoun: string;
  /** 问事的人：命主 / 问卜者 …… */
  subject: string;
  /** 本体系里典型的溯因工作（逗号分隔的短语，结尾不带句号） */
  abductionExamples: string;
  /** 本体系额外的规则行（例如世局类「事后附会一律视为溯因」） */
  extraRules?: string[];
}

export function buildReasoningRules(v: RulesVocabulary): string {
  return [
    '【推理分工规则（最高优先级）】',
    `前提：假设${v.systemName}的规则成立，不讨论其真伪，也不加「命理仅供娱乐」之类的免责话术。`,
    '每个小节都标了推理类型（这是你的思考清单，不是必须逐节输出的格式，写法见下面「回复写法」）：',
    `· 演绎节：已知${v.chartNoun}＋规则 → 推出结论。按规则得出结论即可，依据一句话带过。`,
    '· 归纳节：把已出现的事实整理成共通描述，不新增判断。',
    `· 溯因节：${v.abductionExamples}等。`,
    '  可以给出你认为最可能的解读，但这类推理语言模型有能力限制，因此：',
    `  1) 小节第一行必须以「${UNCERTAINTY_MARK}」开头，接着一句话说明这里为何难以确定（例如吉凶讯号并存、规则本身不决定取舍）。`,
    `  2) 支持与相反的${v.signalNoun}讯号各写一两条，用白话说明依据，不列推导过程。`,
    '  3) 先给出最可能的解读，再用一句话给出另一种同样说得通的解读。',
    `  4) 小节最后一句提醒：这只是参考，哪种解读更贴切，需由${v.subject}结合自身实际判断。`,
    '演绎节与归纳节里若需要做取舍或推测具体事件，把那部分移到溯因的写法并标注，不要混在演绎里当成定论。',
    '【回复写法】',
    `· 先回答所问：回复一开头就回答${v.subject}问的那件事，用白话；不要先讲排盘、起卦或计算过程。`,
    `· 不贴过程：算式、起局起卦步骤、取用过程、排盘表格、工具原始输出都不写进回复，依据用一句话带过。${v.subject}追问「怎么算的」时再展开。`,
    '· 只写相关的小节：演绎、归纳节可以省略，或并成末尾一句「依据」；凡是吉凶、成败、定性、应期、具体事件等溯因结论，必须写在对应的溯因小节标题下并标注，不能写在标题外。',
    '· 工具输出的「⚠ 假设：」要转告，用一句白话说即可。',
    ...(v.extraRules ?? []),
  ].join('\n');
}

/** 把小节定义渲染成要求模型照着输出的结构（每节带推理类型标签） */
export function renderSections(sections: SectionSpec[]): string {
  return sections
    .map(s => {
      const tag = s.kind === 'abduction'
        ? `［溯因节：必须以「${UNCERTAINTY_MARK}」开头，按系统提示的溯因规则写］`
        : `［${REASONING_LABEL[s.kind]}节］`;
      return `**【${s.title}】**\n${tag}${s.instruction}`;
    })
    .join('\n\n');
}

/**
 * 给模型照填的骨架：先回答所问。只列溯因节（已预先写好标记开头），演绎内容并成末尾一句依据；
 * 与所问无关的小节删掉即可。
 */
export function renderSkeleton(sections: SectionSpec[]): string {
  return [
    '（开头就回答所问；只保留与所问有关的小节，不贴计算过程）',
    ...sections.filter(s => s.kind === 'abduction').map(s => `**【${s.title}】**（仅供参考）\n${UNCERTAINTY_MARK}……`),
    '依据：……（一句话，引用工具得出的结论）',
  ].join('\n\n');
}
