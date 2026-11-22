/**
 * lib/systems/bazi/tasks.ts —— 八字解讀的小節結構與推理分工
 *
 * 八字最大的溯因來源是「日主強弱」與「用神」：扶抑、調候、格局三種取法常給出不同答案，
 * 規則本身不決定取哪一種，所以這兩節一律是溯因節，必須列出各法的候選。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const BAZI_VOCABULARY: RulesVocabulary = {
  systemName: '八字（子平術）',
  chartNoun: '八字',
  signalNoun: '干支',
  subject: '命主',
  abductionExamples: '判斷日主強弱、取格局與用神、判斷合化成敗、推測具體事件與應期、從已發生的事反推原因、校正時辰',
  extraRules: [
    '八字補充：日主強弱與用神沒有唯一答案。寫這兩節時，扶抑、調候、格局三種取法各自會得出什麼要分別列出，再說你較傾向哪一個及理由。',
    '八字補充：神煞本工具沒有計算，不要自行補上任何神煞（如天乙貴人、桃花、驛馬）。',
  ],
};

export const BAZI_SECTION_SETS: Record<string, SectionSpec[]> = {
  bazi: [
    { title: '四柱與日主', kind: 'deduction',
      instruction: '照工具輸出列出四柱干支、日主的五行陰陽與月令，不做評價。' },
    { title: '十神配置', kind: 'deduction',
      instruction: '天干與藏干的十神（以工具輸出為準），按十神的定義說明各自對應的六親與象意。' },
    { title: '月令與根氣', kind: 'deduction',
      instruction: '日主在月令的旺相休囚死、通根位置與本中餘氣、比劫印與食傷財官的個數、五行個數。只陳述事實，不下強弱結論。' },
    { title: '干支作用', kind: 'deduction',
      instruction: '工具列出的合、沖、刑、害與旬空，按規則說明各自的象意。合化能否成功屬於溯因，放到下一節。' },
    { title: '日主強弱', kind: 'abduction',
      instruction: '綜合得令、得地、得勢判斷日主偏強或偏弱；若有合化，判斷成敗。說明不同計分方法可能得出不同結論。' },
    { title: '格局與用神', kind: 'abduction',
      instruction: '分別列出扶抑、調候、格局三種取法得出的用神候選，再說較傾向哪一個及理由。' },
    { title: '實際建議', kind: 'abduction',
      instruction: '基於以上象意，可供命主參考的方向（行業、五行調養、人際）。不承諾結果。' },
  ],
  'bazi-dayun': [
    { title: '起運與大運排列', kind: 'deduction',
      instruction: '順逆、起運時間與各步大運干支、年份、虛歲，照工具輸出。' },
    { title: '當前大運與原局', kind: 'deduction',
      instruction: '當前大運天干的十神、地支五行，以及工具列出的大運與原局之間的合沖刑害，按規則說明象意。' },
    { title: '大運吉凶取捨', kind: 'abduction',
      instruction: '結合你在命局分析中傾向的用神，判斷這步大運整體偏順或偏逆；用神取法不同時，說明結論會怎麼變。' },
  ],
  'bazi-liunian': [
    { title: '流年干支', kind: 'deduction',
      instruction: '流年干支、天干十神、所在大運，以及工具列出的流年與原局、大運之間的合沖刑害。' },
    { title: '需留意的領域', kind: 'abduction',
      instruction: '在上述訊號中，今年哪些領域較值得留意；推測具體事件也寫在這裡。' },
    { title: '實際建議', kind: 'abduction',
      instruction: '基於以上象意，可供命主參考的方向。' },
  ],
};

export const BAZI_ABDUCTION_HOTSPOTS = [
  { question: '日主強弱', why: '得令、得地、得勢各派計分不同，訊號常互相矛盾' },
  { question: '格局與用神', why: '扶抑、調候、格局三種取法常給出不同用神' },
  { question: '合化成敗', why: '要看月令、透干、有無衝破，各家條件不一' },
  { question: '推測具體事件與應期', why: '干支作用只給象意，落到哪件事、哪個月是跳躍' },
  { question: '從已發生的事反推原因', why: '同一件事可對應多組干支作用' },
  { question: '校正時辰', why: '從性格與經歷反推時柱，候選時辰都可能說得通' },
  { question: '十神對應到具體某位親人', why: '同一十神可代表多種六親，男女命取法也不同' },
];

export const BAZI_OUT_OF_SCOPE = [
  '神煞（工具沒有計算）',
  '合婚分數、配對指數（沒有計分方法）',
  '工具查不到的古籍原文（子平真詮、滴天髓、窮通寶鑑尚未收入倉庫，不得憑記憶引用）',
  '用八字推國運、地區運勢（八字只為個人出生時間設計；國運世局改用 taiyi、huangji）',
];
