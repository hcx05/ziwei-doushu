/**
 * lib/systems/huangji/tasks.ts —— 皇極經世的小節結構與推理分工
 *
 * 元會運世定位是算術（演繹），以運經世原文是查表引文（演繹）；
 * 邵雍原書是一部以元會運世編排的史表，書中並沒有對未來年份的預言。
 * 所以「某運某世代表什麼時勢、未來會如何」全是後人的推衍，一律按溯因標註。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const HUANGJI_VOCABULARY: RulesVocabulary = {
  systemName: '皇極經世（邵雍元會運世）',
  chartNoun: '元會運世定位',
  signalNoun: '元會運世',
  subject: '提問者',
  abductionExamples: '把元會運世的位置解讀為時勢盛衰、推測某一運某一世的治亂、把現代事件對應到元會運世、以消長之說推論未來',
  extraRules: [
    '皇極經世補充：邵雍原書以元會運世編排史事，止於五代末，書中沒有對後世年份的預言；任何對未來時勢的說法都是後人推衍，必須標註。',
    '皇極經世補充：原文只能引用工具查出的「以運經世」條目；值卦、開物閉物等說法工具未收，不得當成原書內容。',
  ],
};

export const HUANGJI_SECTION_SETS: Record<string, SectionSpec[]> = {
  huangji: [
    { title: '元會運世', kind: 'deduction',
      instruction: '所問年份在本元的會、運、世與年序，以及各自的起訖年份，照工具輸出。' },
    { title: '經世原文', kind: 'deduction',
      instruction: '若工具查得「以運經世」原文，逐字引用；查不到就照工具說明原因，不補寫。' },
    { title: '時勢解讀', kind: 'abduction',
      instruction: '只在提問者問到時寫：這一運、這一世在消長之說下可能代表的時勢；至少兩種讀法，說明原書無此預言。' },
  ],
};

export const HUANGJI_ABDUCTION_HOTSPOTS = [
  { question: '某運某世代表盛世還是衰世', why: '原書只編年，不對未來年份下斷語；盛衰之說來自後人' },
  { question: '現在處於什麼時勢、未來會如何', why: '從元會運世位置推到現實世局是跳躍' },
  { question: '把現代事件對應到元會運世', why: '事後附會' },
];

export const HUANGJI_OUT_OF_SCOPE = [
  '值卦、開物閉物、聲音律呂唱和（本工具未計算，原書正文也未載前兩者）',
  '「以運經世」範圍以外年份的原文（原書紀事止於五代）',
  '個人命運',
  '斷言某年必有某種世變',
];
