/**
 * 規則條目自動帶入：排好盤以後，把「這張盤用得到」的原文條目找出來，讓模型照著解讀，而不是憑記憶。
 *
 * 只收兩種來源，都是原文、逐字照錄：
 *   1) 《紫微斗數全書》（lib/systems/ziwei/classics/data/quanshu-text.data.ts）
 *      - 卷二各宮諸星：某星在某宮的斷語（例：妻妾宮「天同遲娶諧老……」）——這是「星×宮」規則表本身；
 *      - 卷一諸星問答論：某星、某化的總論；
 *   2) 倪海廈《天紀·紫微斗數》原話（docs/tianji-ziwei/entries.jsonl），按講義的星曜、宮位、四化分類挑選。
 *
 * 選條目是確定性的（按宮名、星名、四化比對），不判吉凶；條目和這張盤怎麼對上、怎麼取捨，仍由模型推理，
 * 屬於溯因的照標注寫。書上沒有的配置，輸出會明說「沒有」，模型不得自己補一條「書上說」。
 */
import { BRANCHES } from './constants';
import { ziWeiQuanShuText } from './classics/data/quanshu-text.data';
import type { Palace, ZiweiChart } from './types';

// ─────────────── 《全書》卷二：各宮諸星 ───────────────

/** 《全書》卷二章名 → 引擎宮名 */
const QS_PALACE: Record<string, string> = {
  '一 命宮': '命宮', 二兄弟: '兄弟', 三妻妾: '夫妻', 四子女: '子女', 五財帛: '財帛', 六疾厄: '疾厄',
  七遷移: '遷移', 八奴僕: '僕役', 九官祿: '官祿', 十田宅: '田宅', 十一福德: '福德', 十二父母: '父母',
};

/** 句首星名（長的先比）→ 引擎星名。《全書》的「天空」即引擎的「地空」；合稱拆成兩顆 */
const LEAD: [string, string[]][] = [
  ['地劫天空', ['地劫', '地空']], ['天空地劫', ['地空', '地劫']], ['左輔右弼', ['左輔', '右弼']],
  ['天魁天鉞', ['天魁', '天鉞']], ['火星鈴星', ['火星', '鈴星']], ['火鈴二星', ['火星', '鈴星']],
  ['天傷天使', ['天傷', '天使']],
  ['紫微', ['紫微']], ['天機', ['天機']], ['太陽', ['太陽']], ['武曲', ['武曲']], ['天同', ['天同']],
  ['廉貞', ['廉貞']], ['天府', ['天府']], ['太陰', ['太陰']], ['貪狼', ['貪狼']], ['巨門', ['巨門']],
  ['天相', ['天相']], ['天梁', ['天梁']], ['七殺', ['七殺']], ['破軍', ['破軍']], ['文昌', ['文昌']],
  ['文曲', ['文曲']], ['左輔', ['左輔']], ['右弼', ['右弼']], ['祿存', ['祿存']], ['魁鉞', ['天魁', '天鉞']],
  ['天魁', ['天魁']], ['天鉞', ['天鉞']], ['擎羊', ['擎羊']], ['陀羅', ['陀羅']], ['羊陀', ['擎羊', '陀羅']],
  ['火星', ['火星']], ['鈴星', ['鈴星']], ['火鈴', ['火星', '鈴星']], ['地劫', ['地劫']], ['天空', ['地空']],
  ['天傷', ['天傷']], ['天使', ['天使']], ['天馬', ['天馬']],
  ['化祿', ['化祿']], ['化權', ['化權']], ['化科', ['化科']], ['化忌', ['化忌']],
];

/** 《全書》卷二有斷語的星（主星、六吉、六煞、祿存、天馬等） */
const REF_STARS = new Set(LEAD.flatMap(([, v]) => v).filter(n => !n.startsWith('化')));

function leadStars(text: string): string[] | null {
  for (const [k, v] of LEAD) if (text.startsWith(k)) return v;
  return null;
}

/** 命宮章是一星一大段（含男命、女命、入限訣），以「某星屬木」「某星土」或「某星入……訣」開段 */
const MING_BLOCK_START = /^(?:屬)?[金木水火土]|^入|^二星入|^同入/;

export interface QsLine { chapter: string; text: string }

/** 宮名 → 星名 → 《全書》卷二原文行 */
let PALACE_STAR_TABLE: Map<string, Map<string, QsLine[]>> | null = null;

export function palaceStarTable(): Map<string, Map<string, QsLine[]>> {
  if (PALACE_STAR_TABLE) return PALACE_STAR_TABLE;
  const table = new Map<string, Map<string, QsLine[]>>();
  for (const ch of ziWeiQuanShuText.chapters) {
    const key = ch.title.replace(/^卷二·/, '');
    const palace = ch.title.startsWith('卷二·') ? QS_PALACE[key] : undefined;
    if (!palace) continue;
    const byStar = new Map<string, QsLine[]>();
    table.set(palace, byStar);
    let cur: string[] | null = null;
    let prevOpen = false; // 上一行以逗號結尾 → 本行是續行
    for (const p of ch.paragraphs) {
      const t = p.text;
      const lead = leadStars(t);
      if (palace === '命宮') {
        if (lead && MING_BLOCK_START.test(t.slice(LEAD.find(([k]) => t.startsWith(k))![0].length))) cur = lead;
      } else if (!prevOpen) {
        cur = lead;
      }
      prevOpen = /[，、]$/.test(t);
      if (!cur) continue;
      for (const s of cur) {
        if (!byStar.has(s)) byStar.set(s, []);
        byStar.get(s)!.push({ chapter: ch.title, text: t });
      }
    }
  }
  PALACE_STAR_TABLE = table;
  return table;
}

/** 卷一諸星問答論：某星（或化祿等）的總論 */
export function starQa(star: string): QsLine[] {
  const ch = ziWeiQuanShuText.chapters.find(c => c.title.startsWith('卷一·問') && c.title.includes(star.replace(/^化/, '化')));
  return ch ? ch.paragraphs.map(p => ({ chapter: ch.title, text: p.text })) : [];
}

// ─────────────── 倪師原話 ───────────────

export interface Quote {
  book: string; h2: string; h3: string; quote: string; note: string; bvid: string; part: number; t_hms: string;
}

function hmsToSec(hms: string): number {
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

export function quoteLine(e: Quote): string {
  const url = `https://www.bilibili.com/video/${e.bvid}?p=${e.part}&t=${hmsToSec(e.t_hms)}`;
  return `「${e.quote}」——${[e.h2, e.h3].filter(Boolean).join(' › ')}｜${url}`;
}

/** 講義宮名寫法：夫妻宮、僕役（交友）宮、福德宮（女命極重要！） */
const NI_PALACE: Record<string, string[]> = {
  命宮: ['命宮'], 兄弟: ['兄弟'], 夫妻: ['夫妻'], 子女: ['子女'], 財帛: ['財帛'], 疾厄: ['疾厄'],
  遷移: ['遷移'], 僕役: ['僕役', '交友'], 官祿: ['官祿'], 田宅: ['田宅'], 福德: ['福德'], 父母: ['父母'],
};

/** 星在某宮：講義星曜章裡提到該宮的，加上宮位章裡提到該星的 */
function niStarInPalace(quotes: Quote[], star: string, palace: string): Quote[] {
  const pNames = NI_PALACE[palace] ?? [palace];
  const mentionsPalace = (e: Quote) => pNames.some(n => `${e.h3}${e.quote}`.includes(n));
  const fromStar = quotes.filter(e => e.book === '01-stars' && e.h2.includes(star) && mentionsPalace(e));
  const fromPalace = quotes.filter(e => e.book === '02-palaces' && pNames.some(n => e.h2.includes(n)) && `${e.h3}${e.quote}`.includes(star));
  const seen = new Set<Quote>();
  return [...fromStar, ...fromPalace].filter(e => (seen.has(e) ? false : (seen.add(e), true)));
}

/** 某化落在某宮：四化章裡提到該宮的 */
function niHuaInPalace(quotes: Quote[], hua: string, palace: string): Quote[] {
  const pNames = NI_PALACE[palace] ?? [palace];
  return quotes.filter(e => (e.book === '04-sihua' || e.book === '05-illness') && e.h2.includes(`化${hua}`)
    && pNames.some(n => `${e.h3}${e.quote}`.includes(n)));
}

// ─────────────── 組裝 ───────────────

/** 主題 → 要看的本命宮 */
export const TOPIC_PALACES: Record<string, string[]> = {
  overview: ['命宮'], personality: ['命宮', '福德'], love: ['夫妻'], career: ['官祿'],
  wealth: ['財帛', '田宅'], health: ['疾厄'],
};

const MAX_QS_PER_STAR = 12;
const MAX_NI_PER_ITEM = 4;
const MAX_QA_CHARS = 260;

function palaceStarsLine(p: Palace): string {
  return p.stars.map(s => `${s.name}${s.siHua ? `化${s.siHua}` : ''}${s.brightnessRaw ? `·${s.brightnessRaw}` : ''}`).join('、') || '空宮';
}

export interface RefsOptions {
  /** 只看這些宮（引擎宮名）；預設由 topic 決定 */
  palaces: string[];
  /** 宮位所在的層：本命宮名，或「大限夫妻」「流年夫妻」這種由 layers 換算出的地支 */
  branches?: { label: string; branch: number }[];
  quotes: Quote[];
}

/**
 * 輸出某幾個宮的原文條目。branches 給定時以地支定宮（用於大限、流年的同名宮），否則以本命宮名定宮。
 * 每宮列：宮內各星的《全書》卷二斷語、宮內各化的《全書》與倪師條目、各星的倪師原話；
 * 空宮照《全書》「借對宮」的做法，同時列出對宮主星的條目並註明。
 */
export function buildRefs(chart: ZiweiChart, opts: RefsOptions): string {
  const table = palaceStarTable();
  const targets = opts.branches ?? opts.palaces.map(name => {
    const p = chart.palaces.find(x => x.name === name);
    return { label: `本命${name}`, branch: p?.branch ?? -1 };
  });
  const out: string[] = [];
  for (const { label, branch } of targets) {
    const p = chart.palaces.find(x => x.branch === branch);
    if (!p) continue;
    // 條文按「這顆星坐在哪一宮」查：大限夫妻在申宮時，申宮的星要看的是《全書》夫妻（妻妾）宮的斷語
    const palaceName = label.replace(/^(本命|大限|流年|流月|流日)/, '');
    const byStar = table.get(palaceName);
    out.push(`## ${label}：${BRANCHES[p.branch]}宮（本命${p.name}）— ${palaceStarsLine(p)}`);

    const stars = p.stars.filter(s => s.type === 'major' || REF_STARS.has(s.name));
    const borrowed = p.isEmpty && p.borrowedStars?.length ? p.borrowedStars : [];
    if (borrowed.length) out.push(`- 空宮，借對宮主星：${borrowed.join('、')}（《全書》安星以對宮星論，條目一併列出）`);

    const names = [...new Set([...stars.map(s => s.name), ...borrowed])];
    let any = false;
    out.push('', `### 《紫微斗數全書》卷二·${palaceName}（星在此宮的斷語）`);
    for (const n of names) {
      const lines = byStar?.get(n) ?? [];
      if (!lines.length) continue;
      any = true;
      out.push(`- **${n}**${borrowed.includes(n) ? '（借對宮）' : ''}：`);
      for (const l of lines.slice(0, MAX_QS_PER_STAR)) out.push(`  - ${l.text}`);
      if (lines.length > MAX_QS_PER_STAR) out.push(`  - ……（另有 ${lines.length - MAX_QS_PER_STAR} 句，用 classics ${n} ${palaceName} 查）`);
    }
    if (!any) out.push('- 沒有：本宮各星在《全書》卷二此宮章下沒有斷語。');

    const huas = stars.filter(s => s.siHua);
    if (huas.length) {
      out.push('', '### 生年四化在此宮');
      for (const s of huas) {
        const hua = `化${s.siHua}`;
        const inPalace = byStar?.get(hua) ?? [];
        const qa = starQa(hua);
        out.push(`- **${s.name}${hua}**`);
        for (const l of inPalace.slice(0, 4)) out.push(`  - 《全書》卷二·${palaceName}：${l.text}`);
        if (qa.length) out.push(`  - 《全書》${qa[0].chapter}：${qa[0].text.slice(0, MAX_QA_CHARS)}${qa[0].text.length > MAX_QA_CHARS ? '……' : ''}`);
        const ni = niHuaInPalace(opts.quotes, s.siHua!, palaceName).slice(0, MAX_NI_PER_ITEM);
        for (const e of ni) out.push(`  - 倪師：${quoteLine(e)}`);
        if (!inPalace.length && !ni.length) out.push(`  - 書上與倪師語料都沒有「${hua}在${palaceName}」的專條，只有上面的總論。`);
      }
    }

    out.push('', `### 倪師原話（星曜章提到${palaceName}、或${palaceName}章提到本宮星）`);
    let niAny = false;
    for (const n of names) {
      const ni = niStarInPalace(opts.quotes, n, palaceName).slice(0, MAX_NI_PER_ITEM);
      if (!ni.length) continue;
      niAny = true;
      out.push(`- **${n}**：`);
      for (const e of ni) out.push(`  - ${quoteLine(e)}`);
    }
    if (!niAny) out.push(`- 沒有：倪師語料裡沒有本宮各星與${palaceName}同時出現的原話。`);
    out.push('');
  }
  return out.join('\n');
}
