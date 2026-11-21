/**
 * lib/reasoning/registry.ts —— 体系注册表
 *
 * 每个推演体系加入仓库前，必须先在这里登记：
 *   · 规则用语（buildReasoningRules 用）；
 *   · 全部小节集合，每节标好演绎 / 归纳 / 溯因；
 *   · 溯因重灾区：本体系里哪些问题一定属于溯因（必须标注）；
 *   · 不做清单：工具做不到、加了「仅供参考」也不做的事。
 * scripts/regression/reasoning-registry.test.ts 会逐个体系检查这些项目齐全。
 */
import type { SectionSpec } from './kinds';
import type { RulesVocabulary } from './rules';

export interface AbductionHotspot {
  /** 问题类型 */
  question: string;
  /** 为什么属于溯因 */
  why: string;
}

export interface DivinationSystem {
  /** CLI 与测试使用的代号 */
  id: string;
  name: string;
  /** 层级：命（个人一生）/ 事（单一事件）/ 时（择时）/ 年（年景）/ 世（世局国运） */
  scope: '命' | '事' | '时' | '年' | '世';
  vocabulary: RulesVocabulary;
  sectionSets: Record<string, SectionSpec[]>;
  abductionHotspots: AbductionHotspot[];
  outOfScope: string[];
}
