/**
 * lib/systems/liuren/tasks.ts —— 大六壬解讀的小節結構與推理分工
 *
 * 天地盤、四課、三傳（九宗門）、天將、遁干、六親、旬空都是按書中算法得出（演繹）；
 * 涉害、貴人晝夜等有異說之處，工具照一種口徑算並列出另一種（假設）；
 * 取類神、綜合課傳斷吉凶、推應期、把神將類象對應到具體人事，都是溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const LIUREN_VOCABULARY: RulesVocabulary = {
  systemName: '大六壬（《六壬大全》九宗門）',
  chartNoun: '課',
  signalNoun: '課傳',
  subject: '問事者',
  abductionExamples: '取哪一個神將為類神、綜合四課三傳的生克與天將判斷吉凶、推測應期、把十二神與天將的類象（如亥為雨師、勾陳為獄吏）對應到所問之事的具體人物與情節',
  extraRules: [
    '六壬補充：一課只問一事；同一件事不重複起課。',
    '六壬補充：神煞（《六壬大全》卷一所列歲煞、月煞、日煞）與畢法賦、課經的課體斷語，工具沒有計算也沒有收錄，不得自行補上或憑記憶引用。',
    '六壬補充：工具輸出的「⚠ 假設：」（貴人晝夜、涉害口徑、月將換將、子時換日）必須轉告問事者。',
  ],
};

export const LIUREN_SECTION_SETS: Record<string, SectionSpec[]> = {
  liuren: [
    { title: '課式', kind: 'deduction',
      instruction: '占時、月將、日干支、旬空、天地盤，照工具輸出；轉告工具給出的假設。' },
    { title: '四課三傳', kind: 'deduction',
      instruction: '四課上下與生克、九宗門取傳的過程、三傳的遁干、六親、天將，照工具輸出。有「另一派」三傳時兩種都列出。' },
    { title: '生克事實', kind: 'deduction',
      instruction: '三傳與日干、日支的生克，三傳之間的生克遞進，三傳是否落空；只陳述規則推出的事實，不下吉凶。' },
    { title: '吉凶判斷', kind: 'abduction',
      instruction: '先說明取哪一神為類神及理由，再綜合課傳、天將判斷所問之事的傾向，並給另一種讀法。' },
    { title: '應期', kind: 'abduction',
      instruction: '按三傳、類神、旬空出空等通行應期法推測時間，並給另一種可能。' },
  ],
};

export const LIUREN_ABDUCTION_HOTSPOTS = [
  { question: '取哪一神將為類神', why: '同一件事可取的類神往往不只一個（財取妻財或青龍，官取官鬼或貴人），選哪個是判斷' },
  { question: '綜合課傳斷吉凶', why: '四課、三傳、天將、旺衰的訊號常互相矛盾，書中各家取捨不一' },
  { question: '涉害、貴人晝夜等異說', why: '不同口徑會得到不同的初傳或天將，採哪一派本身是判斷' },
  { question: '推測應期', why: '傳神、類神、出空、沖合等多種應期法可能指向不同時間' },
  { question: '把神將類象對應到具體人事', why: '一神類象數十種（亥為雨師、為幼子、為獄、為梅花……），選哪一個是跳躍' },
];

export const LIUREN_OUT_OF_SCOPE = [
  '同一件事重複起課、一課問多件事',
  '神煞、課體斷語（畢法賦、心鏡、課經），工具沒有計算或收錄',
  '年命、行年上神（工具未計算）',
  '推薦具體投資標的、承諾結果',
];
