/**
 * lib/systems/taiyi/tasks.ts —— 太乙歲計的小節結構與推理分工
 *
 * 積年、局、太乙與諸神位置、主客算、掩囚格都是按書中算法得出（演繹）；
 * 把局面對應到某國某地某年會發生什麼，是典型的溯因，而且極易事後附會，一律標註。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const TAIYI_VOCABULARY: RulesVocabulary = {
  systemName: '太乙神數（《太乙金鏡式經》歲計）',
  chartNoun: '歲計局',
  signalNoun: '局象',
  subject: '提問者',
  abductionExamples: '判斷主客勝負與年勢吉凶、把九宮分野對應到現代國家或地區、推測某年的戰爭、災異、政局變化、用局象解釋已發生的歷史事件',
  extraRules: [
    '太乙補充：太乙談的是國運、世局、天災兵革，不對應任何個人的命運；不得用來斷某人吉凶。',
    '太乙補充：書中的分野（冀並、荊、青、徐、雍、梁益、兗、幽冀等）是古代地名，對應到現代國家或地區本身就是溯因，必須寫出至少兩種對應方式。',
    '太乙補充：拿局象「印證」已發生的事件屬於事後附會，一律按溯因寫並標註；不得把推測寫成預言，不得宣稱某年必有戰爭或災難。',
    '太乙補充：《太乙金鏡式經》的占驗原文尚未收入工具，不得憑記憶引用；工具沒有算的迫、擊、關、挾、三門五將也不要自行補上。',
  ],
};

export const TAIYI_SECTION_SETS: Record<string, SectionSpec[]> = {
  taiyi: [
    { title: '積年與局', kind: 'deduction',
      instruction: '年份、太歲、上元積年、紀、元、局數，照工具輸出；轉述兩條「⚠ 假設」（歲首、積年版本）。' },
    { title: '太乙與二目', kind: 'deduction',
      instruction: '太乙所在宮與理天地人、文昌（主目）、計神、合神、始擊（客目）的位置，照工具輸出。' },
    { title: '主客算與將', kind: 'deduction',
      instruction: '主算、客算及主客大將、參將所在宮，照工具輸出，說明如何依書中算法得出。' },
    { title: '格局', kind: 'deduction',
      instruction: '工具判出的掩、囚、格，按定義說明是哪些神將與太乙宮的關係；工具未計算的格局不寫。' },
    { title: '三基五福大遊', kind: 'deduction',
      instruction: '君基、臣基、民基、五福、大遊太乙的位置，照工具輸出。' },
    { title: '年勢判斷', kind: 'abduction',
      instruction: '綜合上述局象，判斷這一年主客勢力、治亂的傾向，並給另一種讀法。' },
    { title: '分野與世事對應', kind: 'abduction',
      instruction: '只在提問者問到時寫：把宮位分野對應到現代地區、把局象對應到可能的世事；至少兩種對應，說明附會性質。' },
  ],
};

export const TAIYI_ABDUCTION_HOTSPOTS = [
  { question: '某年主客勝負、治亂吉凶', why: '掩囚格、主客算、三基五福的訊號常互相矛盾，書中沒有綜合計分法' },
  { question: '九宮分野對應到現代國家或地區', why: '古代州名與現代疆域不對應，選哪一種對應法是跳躍' },
  { question: '推測具體戰爭、災異、政變', why: '局象只給傾向，落到哪件事、哪個月是跳躍' },
  { question: '用局象解釋已發生的歷史事件', why: '事後附會：任何一年的局象都能找到相符的事' },
  { question: '不同積年版本得出不同局', why: '《金鏡》《統宗》積年數不同，採哪一本本身是判斷' },
];

export const TAIYI_OUT_OF_SCOPE = [
  '個人命運（太乙歲計是世局之術；個人命盤請用紫微或八字）',
  '月計、日計、時計，以及迫、擊、關、挾、三門五將、八門（本工具只算歲計並只判掩囚格）',
  '書中占驗原文（尚未收入工具，不得憑記憶引用）',
  '斷言某年必有戰爭、災難或政權更替',
];
