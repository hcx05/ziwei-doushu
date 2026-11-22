/**
 * lib/reasoning/registry.ts —— 體系注冊表
 *
 * 每個推演體系加入倉庫前，必須先在這裡登記：
 *   · 規則用語（buildReasoningRules 用）；
 *   · 全部小節集合，每節標好演繹 / 歸納 / 溯因；
 *   · 溯因重災區：本體系裡哪些問題一定屬於溯因（必須標注）；
 *   · 不做清單：工具做不到、加了「僅供參考」也不做的事。
 * scripts/regression/reasoning-registry.test.ts 會逐個體系檢查這些項目齊全。
 */
import type { SectionSpec } from './kinds';
import type { RulesVocabulary } from './rules';

export interface AbductionHotspot {
  /** 問題類型 */
  question: string;
  /** 為什麼屬於溯因 */
  why: string;
}

export interface DivinationSystem {
  /** CLI 與測試使用的代號 */
  id: string;
  name: string;
  /** 層級：命（個人一生）/ 事（單一事件）/ 時（擇時）/ 年（年景）/ 世（世局國運） */
  scope: '命' | '事' | '時' | '年' | '世';
  vocabulary: RulesVocabulary;
  sectionSets: Record<string, SectionSpec[]>;
  abductionHotspots: AbductionHotspot[];
  outOfScope: string[];
}
