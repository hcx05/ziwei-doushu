/**
 * lib/systems/liuyao/tasks.ts —— 六爻解讀的小節結構與推理分工
 *
 * 裝卦、月建日辰、旬空月破、動變都是工具算出的事實（演繹）；
 * 按問事類別取用神有成規（演繹），但類別不明、用神兩現時的取捨是溯因；
 * 綜合旺衰動變斷吉凶、推應期、把經文套到所問之事，都是溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const LIUYAO_VOCABULARY: RulesVocabulary = {
  systemName: '六爻（納甲筮法）',
  chartNoun: '卦',
  signalNoun: '卦象',
  subject: '問卜者',
  abductionExamples: '用神兩現或問事類別不明時的取捨、綜合旺衰與動變判斷吉凶、推測應期、把卦象與經文對應到所問之事的具體情況',
  extraRules: [
    '六爻補充：一卦只問一事；同一件事不重複起卦，問卜者對結果不滿意要求重占時，說明不再起卦。',
    '六爻補充：神煞本工具沒有計算，不要自行補上任何神煞（如天乙貴人、驛馬、桃花）。經文只能引用工具輸出的原文。',
  ],
};

export const LIUYAO_SECTION_SETS: Record<string, SectionSpec[]> = {
  liuyao: [
    { title: '卦象', kind: 'deduction',
      instruction: '本卦、變卦、所屬宮與世應、動爻，以及月建、日辰、旬空，照工具輸出。' },
    { title: '裝卦', kind: 'deduction',
      instruction: '各爻的六神、六親、干支，伏神與變爻，照工具輸出，不做評價。' },
    { title: '用神', kind: 'deduction',
      instruction: '按問事類別依取用神表定出用神，說明它在哪一爻（或伏於何處）。類別不明確、用神兩現或多現時，取捨放到「吉凶判斷」並標注。' },
    { title: '用神旺衰與動變', kind: 'deduction',
      instruction: '用神在月建的旺相休囚死、是否月破、日沖、旬空；動爻對用神的生克、變爻的回頭生克與進退。只陳述規則推出的事實。' },
    { title: '吉凶判斷', kind: 'abduction',
      instruction: '綜合上述事實判斷所問之事的成敗傾向；若用神取捨有疑義，在這裡說明各種取法及其結論。' },
    { title: '應期', kind: 'abduction',
      instruction: '按值日、沖空、合破等通行應期法推測較可能的時間；可列 2 到 3 行「候選：」，每行一個時間加一句依據，最可能的放第一行，並給出另一種可能。' },
    { title: '經文參考', kind: 'abduction',
      instruction: '先逐字引用工具按朱熹占法給出的經文，再說明它放到所問之事上可能代表什麼。' },
  ],
};

export const LIUYAO_ABDUCTION_HOTSPOTS = [
  { question: '用神兩現、多現或問事類別不明', why: '取哪一爻為用神，規則只給原則，落到具體情況需要判斷' },
  { question: '綜合判斷吉凶成敗', why: '旺衰、動變、生克訊號常互相矛盾，各家取捨不一' },
  { question: '推測應期', why: '值日、沖空、合破等多種應期法可能指向不同時間' },
  { question: '把卦象、經文對應到具體人事', why: '例如「官鬼」是上司還是官司，經文的比喻指什麼' },
  { question: '問卜者說不準、要求修正', why: '為貼合反饋改解讀本身就是溯因；同一件事也不能重占' },
];

export const LIUYAO_OUT_OF_SCOPE = [
  '同一件事重複起卦',
  '一卦問多件事',
  '神煞（工具沒有計算）',
  '推薦具體投資標的、承諾收益',
  '工具沒有給出的經文或古籍原文（《增刪卜易》《卜筮正宗》尚未收入，不得憑記憶引用）',
];
