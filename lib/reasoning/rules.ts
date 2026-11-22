/**
 * lib/reasoning/rules.ts —— 推理分工規則文本（各體系共用，只替換體系相關的名詞）
 */
import { ABDUCTION_MAX_LINES, REASONING_LABEL, UNCERTAINTY_MARK, type SectionSpec } from './kinds';

export interface RulesVocabulary {
  /** 體系名，用於前提句：「假設 X 的規則成立」 */
  systemName: string;
  /** 工具產出的對象：命盤 / 卦 / 課 / 年局 …… */
  chartNoun: string;
  /** 訊號來源的說法：盤面 / 卦象 / 課象 …… */
  signalNoun: string;
  /** 問事的人：命主 / 問卜者 …… */
  subject: string;
  /** 本體系裡典型的溯因工作（逗號分隔的短語，結尾不帶句號） */
  abductionExamples: string;
  /** 本體系額外的規則行（例如世局類「事後附會一律視為溯因」） */
  extraRules?: string[];
}

export function buildReasoningRules(v: RulesVocabulary): string {
  return [
    '【推理分工規則（最高優先級）】',
    `前提：假設${v.systemName}的規則成立，不討論其真偽，也不加「命理僅供娛樂」之類的免責話術。`,
    '每個小節都標了推理類型（這是你的思考清單，不是必須逐節輸出的格式，寫法見下面「回覆寫法」）：',
    `· 演繹節：已知${v.chartNoun}＋規則 → 推出結論。按規則得出結論即可，依據一句話帶過。`,
    '· 歸納節：把已出現的事實整理成共通描述，不新增判斷。',
    `· 溯因節：${v.abductionExamples}等。`,
    '  可以給出你認為最可能的解讀，但這類推理語言模型有能力限制，因此：',
    `  1) 小節第一行必須以「${UNCERTAINTY_MARK}」開頭，緊接著直接寫最可能的結論，一兩句白話。`,
    '  2) 下一行用一句話寫另一種同樣說得通的讀法，以「另一種讀法：」開頭。',
    `  3) 不列支持、相反的${v.signalNoun}訊號，不寫推導過程，不加「這只是參考……」之類的套話；每個溯因小節最多 ${ABDUCTION_MAX_LINES} 行。${v.subject}想看依據時再展開。`,
    '演繹節與歸納節裡若需要做取捨或推測具體事件，把那部分移到溯因的寫法並標注，不要混在演繹裡當成定論。',
    '【回覆寫法】',
    `· 先回答所問：回覆第一句就是結論（例如「你的喜用神是土、金」「這件事偏難成」），用白話；不要以${v.chartNoun}概要、干支、宮位或排盤說明開頭。`,
    `· 不貼過程：算式、起局起卦步驟、取用過程、排盤表格、工具原始輸出都不寫進回覆。依據只寫一句，不分點、不列清單，也不另開「依據」「各年依據」之類的小節。${v.subject}追問「怎麼算的」時再展開。`,
    '· 只寫相關的小節：演繹、歸納節可以省略，或併成末尾一句「依據」；凡是吉凶、成敗、定性、應期、具體事件等溯因結論，必須寫在對應的溯因小節標題下並標注，不能寫在標題外。',
    '· 工具輸出的「⚠ 假設：」要轉告，用一句白話說即可。',
    '· 一個問題通常一個溯因小節就夠；全篇最後可加一句「想看依據可以再問」，只說一次。',
    `· ${v.subject}告訴你的事與工具推得的結論分開寫：引用時說「你提到……」，不能把${v.subject}說過的事說成是${v.signalNoun}看出來的。`,
    ...(v.extraRules ?? []),
  ].join('\n');
}

/** 把小節定義渲染成要求模型照著輸出的結構（每節帶推理類型標籤） */
export function renderSections(sections: SectionSpec[]): string {
  return sections
    .map(s => {
      const tag = s.kind === 'abduction'
        ? `［溯因節：必須以「${UNCERTAINTY_MARK}」開頭，按系統提示的溯因規則寫］`
        : `［${REASONING_LABEL[s.kind]}節］`;
      return `**【${s.title}】**\n${tag}${s.instruction}`;
    })
    .join('\n\n');
}

/**
 * 給模型照填的骨架：先回答所問。只列溯因節（已預先寫好標記開頭，每節結論加另一種讀法），演繹內容併成末尾一句依據；
 * 與所問無關的小節刪掉即可。
 */
export function renderSkeleton(sections: SectionSpec[]): string {
  return [
    '（開頭就回答所問；只保留與所問有關的小節，不貼計算過程）',
    ...sections.filter(s => s.kind === 'abduction').map(s => `**【${s.title}】**（僅供參考）\n${UNCERTAINTY_MARK}……（結論，一兩句）\n另一種讀法：……`),
    '依據：……（一句話，引用工具得出的結論）',
  ].join('\n\n');
}
