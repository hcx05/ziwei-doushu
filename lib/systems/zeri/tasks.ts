/**
 * lib/systems/zeri/tasks.ts —— 擇日解讀的小節結構與推理分工
 *
 * 某日宜忌、值星、神煞、沖煞都是查表（演繹）；把提問者的事對應到通書用語、
 * 在多個可用日之間取捨、宜忌與神煞互相矛盾時以誰為準，規則沒有統一的先後，屬於溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const ZERI_VOCABULARY: RulesVocabulary = {
  systemName: '擇日（通書，《協紀辨方書》體系）',
  chartNoun: '日課資料',
  signalNoun: '宜忌神煞',
  subject: '提問者',
  abductionExamples: '在多個可用日之間取捨、宜忌與吉神凶煞互相矛盾時的取捨、把提問者的事對應到通書用語（如「簽約」算立券還是交易）、推斷用了某日之後的結果',
  extraRules: [
    '擇日補充：只能用工具查出的宜忌與神煞；通書沒有列出的「吉日」理由（如數字諧音）不要當成擇日依據。',
    '擇日補充：工具篩出的日子是按日期先後列出的，沒有評分；要推薦其中一天時，寫成溯因並說明取捨理由與另一個同樣可用的選擇。',
    '擇日補充：與當事人生肖相沖的日子，通書一般不取用；當事人生肖不明時要先問，不要假設。',
  ],
};

export const ZERI_SECTION_SETS: Record<string, SectionSpec[]> = {
  zeri: [
    { title: '所問之事', kind: 'deduction',
      instruction: '提問者要辦的事、日期範圍、當事人生肖，以及採用的通書用語（若用語對應有疑問，在「取捨建議」裡說明）。' },
    { title: '候選日', kind: 'deduction',
      instruction: '工具篩出的「宜此事且不忌」日子，照列建除、天神黃黑道、宿、沖煞與日沖當事人的標記，不評分。' },
    { title: '各日宜忌神煞', kind: 'deduction',
      instruction: '對提問者關心的幾天，照工具輸出列出宜、忌、吉神、凶煞與較吉的時辰，不做取捨。' },
    { title: '取捨建議', kind: 'abduction',
      instruction: '若要從候選日中推薦，說明你看重哪些訊號、為什麼，並至少給出另一個同樣說得通的選擇。' },
  ],
  'zeri-day': [
    { title: '當日資料', kind: 'deduction',
      instruction: '干支、建除、天神黃黑道、宿、九星、沖煞，照工具輸出。' },
    { title: '宜忌與神煞', kind: 'deduction',
      instruction: '當日宜、忌、吉神、凶煞，以及提問者關心的事是否在宜或忌之列；交節當日的兩種口徑要一併說明。' },
    { title: '時辰', kind: 'deduction',
      instruction: '與所問之事相關的時辰宜忌與黃黑道，照工具輸出。' },
    { title: '綜合看法', kind: 'abduction',
      instruction: '宜忌、神煞、時辰訊號不一致時，綜合說明這一天用來辦這件事的傾向，以及另一種讀法。' },
  ],
};

export const ZERI_ABDUCTION_HOTSPOTS = [
  { question: '多個可用日挑哪一天', why: '通書只給每日的宜忌，沒有給日與日之間的排序規則' },
  { question: '宜忌與神煞互相矛盾', why: '例如宜嫁娶但逢凶煞，以哪一方為準各家不一' },
  { question: '白話的事對應哪個通書用語', why: '例如「簽約」可對應立券或交易，「裝修」可對應修造或動土' },
  { question: '用了某日之後結果會如何', why: '擇日只講宜忌，不預言結果' },
];

export const ZERI_OUT_OF_SCOPE = [
  '按當事人八字喜用神擇日（本工具只檢查生肖相沖）',
  '奇門等其他擇吉法、方位吉凶（本工具只列出當日九星，不推方位）',
  '通書沒有列出的「吉日」理由（數字諧音、星座等）',
  '斷言用了某日就一定順利',
];
