/**
 * lib/systems/ziwei/tasks.ts —— 紫微斗數（與小六壬）的解讀任務與小節定義
 *
 * 推理分工的通用部分（推理類型、UNCERTAINTY_MARK、規則文本、輸出檢查）在 lib/reasoning/，
 * 所有體系共用；這裡只放紫微斗數特有的小節結構與用語。
 *
 * 前提：本項目假設紫微斗數的規則成立，不討論其真偽。
 * 能力邊界：本倉庫**做不到**的（沒有工具或方法）不做；**做得到**、只是屬於溯因的，
 * 可以做，但必須以 UNCERTAINTY_MARK 標明「僅供參考，模型在此類推理有能力限制」。
 */

import type { Palace, ZiweiChart } from '@/lib/systems/ziwei/types';
import {
  ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK, type ReasoningKind, type SectionSpec,
} from '@/lib/reasoning/kinds';
import { buildReasoningRules, renderSections, type RulesVocabulary } from '@/lib/reasoning/rules';

export { ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK };
export type { ReasoningKind, SectionSpec };

export type TopicKey = 'overview' | 'love' | 'career' | 'wealth' | 'health' | 'personality';

export type AiTask =
  | { type: 'topic'; key: TopicKey }
  | { type: 'palace'; branch: number }
  | { type: 'sihua'; starName: string; siHua: string; view: 'mingpan' | 'daxian' | 'liunian' };

export const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'overview', label: '命格' },
  { key: 'love', label: '感情' },
  { key: 'career', label: '事業' },
  { key: 'wealth', label: '財運' },
  { key: 'health', label: '健康' },
  { key: 'personality', label: '性格' },
];

// ────────────────── 各主題的小節定義 ──────────────────
// 每個小節只屬於一種推理類型；原先混在一起的（如「三方四正 + 整體格局」）已拆開。

const TOPIC_SECTIONS: Record<TopicKey, { intro: string; sections: SectionSpec[] }> = {
  overview: {
    intro: '請生成命格總覽',
    sections: [
      { title: '命格定性', kind: 'abduction',
        instruction: '綜合全盤，給出命盤核心格局與命主氣質的傾向性描述。' },
      { title: '主星解讀', kind: 'deduction',
        instruction: '命宮主星（含亮度、四化）按倪海廈體系的規則所對應的特質。' },
      { title: '三方四正', kind: 'deduction',
        instruction: '財帛、官祿、遷移三宮的星曜與四化，按規則逐條說明它們與命宮的聯動。只陳述規則推出的內容，不做整體評判。' },
      { title: '當前大限', kind: 'deduction',
        instruction: '當前大限命宮（本命哪一宮）的星曜，大限四化各落大限盤哪一宮（看工具的三盤疊宮，不要自己數宮），按規則推出的運勢方向。' },
      { title: '優勢與注意', kind: 'abduction',
        instruction: '在上述訊號中，哪些較可能是天賦優勢、哪些較可能是需要注意的功課。' },
    ],
  },
  love: {
    intro: '請分析感情婚姻運',
    sections: [
      { title: '感情格局', kind: 'abduction',
        instruction: '綜合夫妻宮與相關宮位，給出感情命格的傾向性描述。' },
      { title: '夫妻宮分析', kind: 'deduction',
        instruction: '夫妻宮主星、亮度、四化，以及倪海廈體系對此配置的規則判斷。' },
      { title: '三方聯動', kind: 'deduction',
        instruction: '夫妻宮三方四正的星曜與四化，按規則說明對感情的影響。' },
      { title: '當前大限感情運', kind: 'deduction',
        instruction: '大限四化落入或化忌沖照「大限夫妻」與「本命夫妻」的情況（層宮名以工具的三盤疊宮為準），按規則推出的走向；問某一年再看流年四化對「流年夫妻」，找年份用 years --palace 夫妻。只講規則推出的象意；具體事件的推測放到溯因節。' },
      { title: '實際建議', kind: 'abduction',
        instruction: '基於以上象意，可供命主參考的方向。' },
    ],
  },
  career: {
    intro: '請分析事業運',
    sections: [
      { title: '事業格局', kind: 'abduction',
        instruction: '綜合官祿宮與相關宮位，討論較傾向任職還是創業。' },
      { title: '官祿宮分析', kind: 'deduction',
        instruction: '官祿宮主星、亮度、四化，以及倪師對這種配置的規則判斷。' },
      { title: '財帛宮聯動', kind: 'deduction',
        instruction: '財帛宮與官祿宮的星曜、四化關係，按規則說明財路來源的象意。' },
      { title: '當前大限事業運', kind: 'deduction',
        instruction: '大限四化落入或化忌沖照「大限官祿」與「本命官祿」的情況（層宮名以工具的三盤疊宮為準），按規則推出的走向；問某一年再看流年四化對「流年官祿」，找年份用 years --palace 官祿。只講規則推出的象意；具體事件的推測放到溯因節。' },
      { title: '實際建議', kind: 'abduction',
        instruction: '基於以上象意，可供命主參考的方向與行業類型。' },
    ],
  },
  wealth: {
    intro: '請分析財運',
    sections: [
      { title: '財運格局', kind: 'abduction',
        instruction: '綜合財帛、田宅等宮位，討論財運較傾向主動財還是被動財。' },
      { title: '財帛宮分析', kind: 'deduction',
        instruction: '財帛宮主星、亮度、四化，按規則推出的財富來源與流動象意。' },
      { title: '田宅宮（財庫）', kind: 'deduction',
        instruction: '田宅宮星曜與四化，按規則推出的積蓄與不動產象意。' },
      { title: '當前大限財運', kind: 'deduction',
        instruction: '大限四化落入或化忌沖照「大限財帛」「大限田宅」與本命財帛、田宅的情況（層宮名以工具的三盤疊宮為準），按規則推出的走向；問某一年再看流年四化對流年財帛、田宅。只講規則推出的象意；具體事件的推測放到溯因節。' },
      { title: '理財建議', kind: 'abduction',
        instruction: '基於以上象意，可供命主參考的理財方向（不承諾收益、不推薦具體標的）。' },
    ],
  },
  health: {
    intro: '請分析健康運勢',
    sections: [
      { title: '疾厄宮主星', kind: 'deduction',
        instruction: '疾厄宮星曜、亮度、四化，按規則對應的健康象意。' },
      { title: '主要風險', kind: 'abduction',
        instruction: '在全盤訊號中，哪些部位較值得留意。只談調養方向，不下診斷。' },
      { title: '大限健康走勢', kind: 'deduction',
        instruction: '當前大限四化與疾厄宮的關係，按規則推出的走向。' },
      { title: '預防建議', kind: 'induction',
        instruction: '把以上各節提到的調養方向整理成清單，不新增判斷。' },
    ],
  },
  personality: {
    intro: '請解析性格特質',
    sections: [
      { title: '命宮主星性格', kind: 'deduction',
        instruction: '命宮主星（含亮度、四化）按規則對應的性格特質。' },
      { title: '三方性格綜合', kind: 'induction',
        instruction: '把財帛、官祿、遷移三宮星曜對應的性格特質整理成共通描述，不做取捨。' },
      { title: '人際關係模式', kind: 'induction',
        instruction: '把交友、遷移宮星曜對應的互動特質整理成共通描述。' },
      { title: '優勢與人生課題', kind: 'abduction',
        instruction: '在上述特質中，哪些較可能是優勢、哪些較可能是人生課題。' },
    ],
  },
};

const PALACE_ROLES: Record<string, string> = {
  '命宮': '自我、性格、先天格局',
  '兄弟宮': '兄弟關係、合夥人',
  '夫妻宮': '感情關係、婚姻狀態',
  '子女宮': '子女緣分、下屬關係',
  '財帛宮': '財運來源、收入方式',
  '疾厄宮': '身體健康、意外',
  '遷移宮': '外出機遇、人際格局',
  '交友宮': '朋友圈、貴人、小人',
  '官祿宮': '事業成就、社會地位',
  '田宅宮': '不動產、家庭環境',
  '福德宮': '精神享受、內心福分',
  '父母宮': '父母關係、文書契約',
};

function palaceSections(): SectionSpec[] {
  return [
    { title: '宮位定性', kind: 'abduction',
      instruction: '綜合本宮與三方四正，給出這個宮位的傾向性判斷。' },
    { title: '主星解讀', kind: 'deduction',
      instruction: '本宮主星（含亮度、四化）按倪海廈體系的規則所對應的象意；空宮則按規則借對宮說明。' },
    { title: '三方四正聯動', kind: 'deduction',
      instruction: '本宮三方四正的星曜與四化，按規則說明對本宮的影響。' },
    { title: '實際建議', kind: 'abduction',
      instruction: '基於本宮象意，可供命主參考的方向。' },
  ];
}

function sihuaSections(siHua: string, viewLabel: string): SectionSpec[] {
  return [
    { title: `化${siHua}基本含義`, kind: 'deduction',
      instruction: `化${siHua}在倪海廈體系中的規則含義，以及這顆星化${siHua}的特殊含義。` },
    { title: '落宮影響', kind: 'deduction',
      instruction: '按規則說明落宮所主管的領域受到何種影響。' },
    { title: '三方四正飛化路徑', kind: 'deduction',
      instruction: '按規則說明對落宮三方四正（對宮、兩個三合宮）的聯動影響。' },
    { title: '當前運勢影響', kind: 'deduction',
      instruction: `在${viewLabel}的時間維度下，按規則推出的象意。只講規則推出的象意；具體事件的推測放到溯因節。` },
    { title: '實際建議', kind: 'abduction',
      instruction: '基於以上象意，可供命主參考的方向。' },
  ];
}

/**
 * 流年解讀的小節。
 * 依據是命盤摘要裡的【某年所在大限】【流年】與【三盤疊宮】，都由引擎確定性算出。
 */
export const LIUNIAN_SECTIONS: SectionSpec[] = [
  { title: '流年命宮', kind: 'deduction',
    instruction: '流年命宮落在本命、大限各哪一宮，該宮星曜，按規則推出的年度主題象意。' },
  { title: '流年四化落宮', kind: 'deduction',
    instruction: '流年祿權科忌各落流年盤哪一宮（主看），以及同一宮在大限、本命盤是哪一宮，按規則逐條說明影響的領域。' },
  { title: '與當前大限疊加', kind: 'deduction',
    instruction: '流年四化與該年所在大限的四化同落或化忌沖照的宮位，以及落在三層同名宮（例如同時是大限夫妻、流年夫妻）的情況，按規則說明疊加的象意。只講規則推出的象意；具體事件的推測放到溯因節。' },
  { title: '需留意的領域', kind: 'abduction',
    instruction: '在上述訊號中，今年哪些領域較值得留意。' },
  { title: '實際建議', kind: 'abduction',
    instruction: '基於以上象意，可供命主參考的方向。' },
];

/** 流月解讀（Claude Skill 用）。依據：斗君、流月命宮、流月四化，均由 lib/systems/ziwei/liuyue.ts 確定性算出 */
export const LIUYUE_SECTIONS: SectionSpec[] = [
  { title: '流月命宮', kind: 'deduction',
    instruction: '流月命宮落在本命、大限、流年各哪一宮，該宮星曜，按規則推出的當月主題象意。' },
  { title: '流月四化落宮', kind: 'deduction',
    instruction: '流月祿權科忌各落流月盤哪一宮（主看），以及同一宮在流年、大限、本命盤是哪一宮，按規則逐條說明影響的領域。' },
  { title: '與流年大限疊加', kind: 'deduction',
    instruction: '流月四化與流年、該年大限的四化同落或化忌沖照的宮位，按規則說明疊加的象意。只講規則推出的象意；具體事件的推測放到溯因節。' },
  { title: '需留意的領域', kind: 'abduction',
    instruction: '在上述訊號中，這個月哪些領域較值得留意。' },
];

/** 流日解讀（Claude Skill 用） */
export const LIURI_SECTIONS: SectionSpec[] = [
  { title: '流日命宮', kind: 'deduction',
    instruction: '流日命宮落在本命、流年、流月各哪一宮（倪師口徑為主，若與通行口徑不同須一併說明），該宮星曜的象意。' },
  { title: '流日四化落宮', kind: 'deduction',
    instruction: '流日（日干）祿權科忌各落流日盤哪一宮（主看），以及同一宮在流月、流年盤是哪一宮，按規則說明影響的領域。只講規則推出的象意；具體事件的推測放到溯因節。' },
  { title: '需留意的領域', kind: 'abduction',
    instruction: '在上述訊號中，當天哪些領域較值得留意。' },
];

/** 小六壬（Claude Skill 用）。課象由 lib/systems/ziwei/xiaoliuren.ts 起出，含義只用倪師原話 */
export const XIAOLIUREN_SECTIONS: SectionSpec[] = [
  { title: '起課', kind: 'deduction',
    instruction: '起課所用的農曆月、日、時辰，以及月、日、時各落哪一課，最終課象是什麼。' },
  { title: '課象', kind: 'deduction',
    instruction: '引用工具給出的倪師原話說明這一課的含義，附出處；延伸說明放到溯因節。' },
  { title: '應期', kind: 'deduction',
    instruction: '倪師原話裡有時間說法的（大安約一週、小吉約兩週、速喜馬上）照引；倪師沒講的，說明沒有原話依據。' },
  { title: '對所問之事的含義', kind: 'abduction',
    instruction: '這一課放到命主所問的那件具體事情上最可能對應什麼情況、另有哪幾種可能；倪師沒講應期的課也可在此推測。' },
];

// ────────────────── prompt 組裝 ──────────────────

const VIEW_LABEL: Record<string, string> = { mingpan: '本命', daxian: '大限', liunian: '流年' };

export interface BuiltTask {
  /** 發給 AI 的 user 消息 */
  prompt: string;
  sections: SectionSpec[];
}

function starDesc(palace: Palace): string {
  const major = palace.stars.filter(s => s.type === 'major');
  return major.length
    ? major.map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、')
    : '空宮（借對宮）';
}

/** 由任務 + 命盤組出 prompt；命盤裡找不到對應宮位/星曜時返回 null */
export function buildTask(task: AiTask, chart: ZiweiChart): BuiltTask | null {
  if (task.type === 'topic') {
    const def = TOPIC_SECTIONS[task.key];
    return {
      sections: def.sections,
      prompt: `${def.intro}，按以下結構輸出：\n\n${renderSections(def.sections)}`,
    };
  }

  if (task.type === 'palace') {
    const palace = chart.palaces.find(p => p.branch === task.branch);
    if (!palace) return null;
    const sections = palaceSections();
    const role = PALACE_ROLES[palace.name] ?? '';
    return {
      sections,
      prompt:
        `請分析【${palace.name}】（主管：${role}），該宮主星為${starDesc(palace)}，按以下結構輸出：\n\n` +
        renderSections(sections),
    };
  }

  const palace = chart.palaces.find(p => p.stars.some(s => s.name === task.starName));
  if (!palace) return null;
  const viewLabel = VIEW_LABEL[task.view];
  const sections = sihuaSections(task.siHua, viewLabel);
  return {
    sections,
    prompt:
      `請分析【${viewLabel}${task.starName}化${task.siHua}】的飛化影響，` +
      `${task.starName}落在【${palace.name}】，按以下結構輸出：\n\n${renderSections(sections)}`,
  };
}

// ────────────────── 系統提示裡的推理分工規則 ──────────────────

/** 紫微斗數的規則用語 */
export const ZIWEI_VOCABULARY: RulesVocabulary = {
  systemName: '紫微斗數',
  chartNoun: '命盤',
  signalNoun: '盤面',
  subject: '命主',
  abductionExamples: '在多種訊號之間取捨定性、給現實建議、推測具體事件、從命主經歷反推原因、判斷時辰',
};

/** 小六壬的規則用語 */
export const XIAOLIUREN_VOCABULARY: RulesVocabulary = {
  systemName: '小六壬',
  chartNoun: '課',
  signalNoun: '課象',
  subject: '問事者',
  abductionExamples: '把課象對應到所問之事的具體情況、推測倪師沒講應期的課多久應驗',
};

export const REASONING_RULES = buildReasoningRules(ZIWEI_VOCABULARY);

/** 時辰不詳時附在命盤摘要裡的聲明 */
export const HOUR_UNKNOWN_NOTICE = [
  '【重要：出生時辰不詳】',
  '命主沒有提供出生時辰，本盤是按「子時」這個假設排出的；命宮、身宮、各宮位置與大限都依賴這個假設。',
  `回答開頭第一行必須寫：「${ASSUMPTION_MARK}出生時辰不詳，本盤按子時假設排出，以下所有內容都建立在這個假設上。」`,
  `若命主要求推斷真正的出生時辰，那是溯因，按溯因規則以「${UNCERTAINTY_MARK}」標注。`,
].join('\n');

// ────────────────── 小節集合（Skill 的 sections / check 命令與體系注冊表共用） ──────────────────

export const ZIWEI_SECTION_KEYS = [
  ...TOPICS.map(t => t.key), 'palace', 'sihua', 'liunian', 'liuyue', 'liuri',
] as const;

/** 不依賴具體命盤的小節集合；sihua 需指定是哪一化（默認「忌」） */
export function ziweiSectionSet(key: string, siHua = '忌'): SectionSpec[] | null {
  if (key in TOPIC_SECTIONS) return TOPIC_SECTIONS[key as TopicKey].sections;
  switch (key) {
    case 'palace': return palaceSections();
    case 'sihua': return sihuaSections(siHua, VIEW_LABEL.daxian);
    case 'liunian': return LIUNIAN_SECTIONS;
    case 'liuyue': return LIUYUE_SECTIONS;
    case 'liuri': return LIURI_SECTIONS;
    default: return null;
  }
}
