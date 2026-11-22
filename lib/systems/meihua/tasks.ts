/**
 * lib/systems/meihua/tasks.ts —— 梅花易數解讀的小節結構與推理分工
 *
 * 起卦、互變、體用、生克比和、卦氣旺衰都是按書中算法得出（演繹）；
 * 按書中十八類占法把體用生克對到所問之事，有明文可依（演繹）；
 * 綜合多個用卦的生克定吉凶、推應期、把八卦類象對應到具體人事（「推數又須明理」），都是溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const MEIHUA_VOCABULARY: RulesVocabulary = {
  systemName: '梅花易數（《梅花易數》體用法）',
  chartNoun: '卦',
  signalNoun: '卦象',
  subject: '問卜者',
  abductionExamples: '互、變、用之間生克方向不一時判斷吉凶、推測應期、把八卦類象（乾為老人、巽為股等）對應到所問之事的具體人物與情節、把外應（三要十應）納入判斷',
  extraRules: [
    '梅花補充：一事一占；「不動不占，不因事不占」，同一件事不重複起卦。',
    '梅花補充：起卦用的數（筆畫、聲數、物數、平仄）由問卜者提供或工具計算；模型自行數筆畫、判平仄屬於假設，必須以「⚠ 假设：」寫明。',
    '梅花補充：書中原文只能引用工具輸出的條目；三要十應、外應沒有工具，提問者沒描述就不要自行補上。',
  ],
};

export const MEIHUA_SECTION_SETS: Record<string, SectionSpec[]> = {
  meihua: [
    { title: '起卦', kind: 'deduction',
      instruction: '起卦法與算式、本卦、動爻、互卦、變卦，照工具輸出。' },
    { title: '體用與卦氣', kind: 'deduction',
      instruction: '體卦、用卦，用、互、變各自對體的生克比和，體與各卦當月旺衰，體黨用黨，照工具輸出，不做評價。' },
    { title: '書中占法', kind: 'deduction',
      instruction: '按所問類別逐字引用工具給出的「某某占」原文，再照原文規則指出本卦體用屬於哪一句；類別對不上時寫「人事占」並說明。' },
    { title: '吉凶判斷', kind: 'abduction',
      instruction: '綜合用、互、變的生克與旺衰判斷吉凶，說明先後（用為始、互為中、變為終），並給另一種讀法。' },
    { title: '應期', kind: 'abduction',
      instruction: '按成卦之數與書中「行半、坐倍、立如數」或生克之卦的卦氣推測時間，並給另一種可能。' },
    { title: '類象與爻辭', kind: 'abduction',
      instruction: '先逐字引用工具給出的動爻爻辭與八卦屬類，再說明放到所問之事上可能指什麼人、什麼物。' },
  ],
};

export const MEIHUA_ABDUCTION_HOTSPOTS = [
  { question: '用、互、變生克方向不一', why: '書中只說「生體多者愈吉，克體多者愈凶」，沒有計分法，取捨需要判斷' },
  { question: '推測應期', why: '成卦數、行坐立、卦氣所屬時序幾種算法可能指向不同時間' },
  { question: '把八卦類象對應到具體人事', why: '一卦類象數十種（乾為父、為馬、為金寶……），選哪一個是跳躍，書中也說「推數又須明理」' },
  { question: '外應、三要十應', why: '取哪個外物為應、屬哪一卦，本身就是判斷' },
  { question: '筆畫、平仄、聲數由模型自行計數', why: '字形、讀音各本不一，數錯一畫卦就不同' },
];

export const MEIHUA_OUT_OF_SCOPE = [
  '同一件事重複起卦、一卦問多件事',
  '三要十應、外應的自動判讀（工具沒有計算）',
  '工具沒有給出的書中原文（只收十八類占法、生體克體、八卦萬物屬類）',
  '推薦具體投資標的、承諾結果',
];
