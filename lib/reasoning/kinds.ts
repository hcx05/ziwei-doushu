/**
 * lib/reasoning/kinds.ts —— 与体系无关的推理分工基础定义
 *
 * 设计依据：大语言模型擅长归纳（Induction）、演绎（Deduction）进步很快，
 * 但溯因（Abduction，从观察「跳」到最佳解释）缺乏可靠机制
 * （Tom Zahavy, "LLMs can't jump", Google DeepMind 立场论文；另见 arXiv 2404.03028）。
 *
 * 所有体系（见 lib/systems/index.ts 的注册表）共用这里的定义：
 *   · 排盘 / 起课 / 查表：工具确定性计算，不算推理；
 *   · 演绎：已知盘面 + 规则 → 结论，照规则写、注明依据；
 *   · 归纳：把已出现的事实整理成共通描述，不新增判断；
 *   · 溯因：取舍、定性、推测具体事件、反推原因、把预言对应到现实——
 *     可以做，但必须以 UNCERTAINTY_MARK 开头标注，写结论与另一种读法（不列正反讯号、不贴过程）。
 */

export type ReasoningKind = 'deduction' | 'induction' | 'abduction';

export const REASONING_LABEL: Record<ReasoningKind, string> = {
  deduction: '演绎',
  induction: '归纳',
  abduction: '溯因',
};

/** 溯因内容在输出中必须使用的开头标记（检查器、测试都依赖这个字面量） */
export const UNCERTAINTY_MARK = '⚠ 仅供参考（模型在此类推理有能力限制）：';
/** 繁体写法：回复跟着用户用繁体时，检查同样认可（输出时仍以简体为准） */
export const UNCERTAINTY_MARK_TRAD = '⚠ 僅供參考（模型在此類推理有能力限制）：';

/** 溯因小节正文最多几行（不计空行与「⚠ 假设：」行）：标注行写结论、一行另一种读法，再留一行余地 */
export const ABDUCTION_MAX_LINES = 3;

/** 资料缺失或口径未定时的假设声明（不是模型推理的限制，而是输入本身的假设） */
export const ASSUMPTION_MARK = '⚠ 假设：';

export interface SectionSpec {
  /** 小节标题（不含【】），模型必须原样输出为 **【标题】** */
  title: string;
  /** 本小节要求模型做的事 */
  instruction: string;
  kind: ReasoningKind;
}
