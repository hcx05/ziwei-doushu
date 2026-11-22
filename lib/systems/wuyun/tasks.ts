/**
 * lib/systems/wuyun/tasks.ts —— 五運六氣解讀的小節結構與推理分工
 *
 * 歲運、司天在泉、主客運氣、同化與客主加臨都是查表（演繹）；
 * 《素問》對各年氣候、病候有原則性描述，但把它落到「今年哪裡會怎樣、會流行什麼病、會發生什麼事」
 * 全是溯因 —— 同一年局在不同地域、不同體質上表現不同，所以這些小節一律標注。
 */
import type { SectionSpec } from '@/lib/reasoning/kinds';
import type { RulesVocabulary } from '@/lib/reasoning/rules';

export const WUYUN_VOCABULARY: RulesVocabulary = {
  systemName: '五運六氣（《素問》運氣學說）',
  chartNoun: '年局',
  signalNoun: '運氣',
  subject: '提問者',
  abductionExamples: '判斷該年是否為平氣、推測某年某地的氣候特點、推測疾病流行傾向、把年局對應到社會或世界事件、給出調養建議、從已發生的氣候或疫情反推運氣',
  extraRules: [
    '五運六氣補充：運氣說的是一年的大氣候與人群的普遍傾向，不對應具體某個人的病，也不對應具體某地某天的天氣。任何具體化都屬於溯因，且不得寫成預言。',
    '五運六氣補充：拿已發生的事件（天災、疫情、戰亂）去「印證」年局屬於事後附會，一律按溯因寫並標注；同一年局在不同地區表現不同，必須給出至少一種不同的讀法。',
    '五運六氣補充：《素問》原文尚未收入倉庫，不得憑記憶引用經文；也不要補上工具沒有算的交司時刻、南北政、平氣判定。',
  ],
};

export const WUYUN_SECTION_SETS: Record<string, SectionSpec[]> = {
  wuyun: [
    { title: '年局', kind: 'deduction',
      instruction: '運氣年干支與起止、歲運太過不及、司天在泉、運氣關係與運氣同化，照工具輸出。' },
    { title: '五運', kind: 'deduction',
      instruction: '主運、客運五步的太少與交接日期；交接口徑的差異照工具的假設說明轉述。' },
    { title: '六氣', kind: 'deduction',
      instruction: '主氣、客氣六步的交接日期與客主加臨的順逆，照工具輸出，說明各自按什麼規則得出。' },
    { title: '氣候傾向', kind: 'abduction',
      instruction: '根據歲運、司天在泉與各步客主加臨，推測這一年及各時段較可能的氣候特點；說明地域差異會讓表現不同。' },
    { title: '健康與調養', kind: 'abduction',
      instruction: '人群層面較需留意的臟腑與病候傾向，以及飲食起居的調養方向。不診斷任何個人，不推薦藥方劑量。' },
    { title: '世事對應', kind: 'abduction',
      instruction: '只在提問者問到時寫：把年局對應到農業、社會或世界事件的可能讀法。至少給兩種讀法，並說明這是附會性質的推測。' },
  ],
};

export const WUYUN_ABDUCTION_HOTSPOTS = [
  { question: '某年是否為平氣', why: '太過被抑、不及得助的條件各家說法不一，本工具沒有判定' },
  { question: '某年某地的具體氣候', why: '運氣只給一年大氣候的傾向，落到某地某季是跳躍' },
  { question: '疫病會不會流行、流行什麼病', why: '《素問》只給病候原則，具體疫情受太多運氣以外的因素影響' },
  { question: '用年局解釋已發生的天災、疫情或世局', why: '事後附會：同一年局總能找到相符的事件' },
  { question: '對應到某個人的身體狀況', why: '運氣是人群層面的傾向，個人還要看體質與病史' },
];

export const WUYUN_OUT_OF_SCOPE = [
  '個人疾病診斷、處方與劑量（請就醫）',
  '某地某日的天氣預報',
  '交司時刻、南北政、平氣判定（本工具沒有計算）',
  '《素問》運氣七篇原文（尚未收入倉庫，不得憑記憶引用）',
  '斷言某年必有某種災難或疫情',
];
