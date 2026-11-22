/**
 * lib/reasoning/kinds.ts —— 與體系無關的推理分工基礎定義
 *
 * 設計依據：大語言模型擅長歸納（Induction）、演繹（Deduction）進步很快，
 * 但溯因（Abduction，從觀察「跳」到最佳解釋）缺乏可靠機制
 * （Tom Zahavy, "LLMs can't jump", Google DeepMind 立場論文；另見 arXiv 2404.03028）。
 *
 * 所有體系（見 lib/systems/index.ts 的注冊表）共用這裡的定義：
 *   · 排盤 / 起課 / 查表：工具確定性計算，不算推理；
 *   · 演繹：已知盤面 + 規則 → 結論，照規則寫、注明依據；
 *   · 歸納：把已出現的事實整理成共通描述，不新增判斷；
 *   · 溯因：取捨、定性、推測具體事件、反推原因、把預言對應到現實——
 *     可以做，但必須以 UNCERTAINTY_MARK 開頭標注，寫結論與另一種讀法（不列正反訊號、不貼過程）。
 */

export type ReasoningKind = 'deduction' | 'induction' | 'abduction';

export const REASONING_LABEL: Record<ReasoningKind, string> = {
  deduction: '演繹',
  induction: '歸納',
  abduction: '溯因',
};

/** 溯因內容在輸出中必須使用的開頭標記（檢查器、測試都依賴這個字面量） */
export const UNCERTAINTY_MARK = '⚠ 僅供參考（模型在此類推理有能力限制）：';
/** 簡體寫法：回覆跟著用戶用簡體時，檢查同樣認可（工具輸出一律用繁體） */
export const UNCERTAINTY_MARK_SIMP = '⚠ 仅供参考（模型在此类推理有能力限制）：';

/** 溯因小節正文最多幾行（不計空行與「⚠ 假設：」行）：標注行寫結論、一行另一種讀法，再留一行餘地 */
export const ABDUCTION_MAX_LINES = 3;

/** 資料缺失或口徑未定時的假設聲明（不是模型推理的限制，而是輸入本身的假設） */
export const ASSUMPTION_MARK = '⚠ 假設：';

export interface SectionSpec {
  /** 小節標題（不含【】），模型必須原樣輸出為 **【標題】** */
  title: string;
  /** 本小節要求模型做的事 */
  instruction: string;
  kind: ReasoningKind;
}
