/**
 * lib/systems/qimen/tasks.ts —— 奇門遁甲解讀的小節結構與推理分工
 *
 * 定局、地盤天盤、值符值使、八門八神、旬空驛馬、書中定義明確的格局，都是按書中算法得出（演繹）；
 * 拆補與置閏兩法得出的局不同時，工具兩種都列出（假設）；
 * 取哪一宮為用神、綜合門星神干判斷吉凶、擇方擇時、把格局對應到具體人事，都是溯因。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const QIMEN_VOCABULARY: RulesVocabulary = {
  systemName: '奇門遁甲（《遁甲演義》時家轉盤）',
  chartNoun: '局',
  signalNoun: '局中門星神干',
  subject: '問事者',
  abductionExamples: '取哪一宮、哪一干為用神、綜合門星神干與格局判斷吉凶、選擇出行或辦事的方位與時辰、把格局（如青龍返首、白虎猖狂）對應到具體人事',
  extraRules: [
    '奇門補充：一局只問一事；同一件事不重複起局。',
    '奇門補充：工具只判了書中定義明確的格局（十干克應、三遁、擊刑、入墓、伏吟反吟、門迫、五不遇時），其餘格局、九星時辰克應、神煞不要自行補上；書中占驗原文未收入，不得憑記憶引用。',
    '奇門補充：拆補法與置閏法得出的局不同時，必須告訴問事者兩法不同，並說明以拆補法為準的理由（一句話即可）。',
  ],
};

export const QIMEN_SECTION_SETS: Record<string, SectionSpec[]> = {
  qimen: [
    { title: '起局', kind: 'deduction',
      instruction: '陰陽遁、局數、節氣與元、旬首、值符值使，照工具輸出；兩法定局不同時轉告。' },
    { title: '格局', kind: 'deduction',
      instruction: '工具判出的格局照錄，說明是哪一宮、哪兩干或哪個門；工具沒判的不寫。' },
    { title: '用神宮', kind: 'abduction',
      instruction: '按所問之事選用神（日干、時干、某門、某星），說明選它的理由與另一種取法，再看它所在宮的門星神干。' },
    { title: '吉凶判斷', kind: 'abduction',
      instruction: '綜合用神宮與格局判斷所問之事的傾向；列出支持與相反的訊號，並給另一種讀法。' },
    { title: '方位與時機', kind: 'abduction',
      instruction: '只在問事者問到時寫：按吉門、三奇、三遁所在宮建議方位或時辰，並說明這是傾向不是保證。' },
  ],
};

export const QIMEN_ABDUCTION_HOTSPOTS = [
  { question: '取哪一宮、哪一干為用神', why: '同一件事可取日干、時干、某門或某星，取法不同結論不同' },
  { question: '綜合吉凶', why: '吉門凶星、吉格凶格常同局並見，書中沒有計分法' },
  { question: '擇方、擇時', why: '吉門、三奇、三遁可能分在不同宮，取捨需要判斷' },
  { question: '拆補與置閏定局不同', why: '兩法各有古籍依據，採哪一法本身是判斷' },
  { question: '把格局對應到具體人事', why: '格局名是比喻（如白虎猖狂），落到哪件事是跳躍' },
];

export const QIMEN_OUT_OF_SCOPE = [
  '同一件事重複起局、一局問多件事',
  '年家、月家、日家奇門（工具只排時家）、飛盤奇門',
  '工具未判的格局、九星時辰克應、神煞、本命行年',
  '符咒、步罡、閉六戊等法術',
  '推薦具體投資標的、保證結果',
];
