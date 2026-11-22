/**
 * 三盤疊宮：同一個地支宮，在本命盤、大限盤、流年盤（以及流月、流日盤）各是哪一宮。
 *
 * 大限命宮 = 該大限所在宮；流年命宮 = 流年地支所在宮（太歲入卦）；流月、流日同理。
 * 每一層都從自己的命宮起，地支每減 1 進一宮：命宮、兄弟、夫妻、子女……父母，與本命盤同一走法。
 * 例：大限命宮在戌，則酉為大限兄弟、申為大限夫妻。
 *
 * 細部判斷（某年感情、某年錢財）要看的是「四化落在這一層的哪一宮」，只標本命宮名會漏掉這一層，
 * 模型自己數宮又容易數錯，所以由這裡確定性算好。
 */
import { BRANCHES } from './constants';
import { getDaXianSiHua, getLiuNianSiHua, getYearBranchIndex } from './sihua';
import type { SiHua, ZiweiChart } from './types';
import { CHILDHOOD_DAXIAN_INDEX, getDaXianIndexForYear, getChildhoodDaXianPalace, isChildhoodYear } from './yunxian-context';

/** 與排盤引擎輸出的宮名一致（不帶「宮」字，命宮除外） */
export const LAYER_PALACE_NAMES = [
  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母',
] as const;

export interface Layer {
  /** 「大限」「流年」「流月」「流日」 */
  label: string;
  /** 這一層命宮的地支索引 */
  mingBranch: number;
}

/** 以 mingBranch 為命宮時，branch 宮叫什麼 */
export function layerPalaceName(mingBranch: number, branch: number): string {
  return LAYER_PALACE_NAMES[(mingBranch - branch + 12) % 12];
}

/** 「本命疾厄／大限夫妻／流年福德」 */
export function locate(chart: ZiweiChart, branch: number, layers: Layer[]): string {
  const natal = chart.palaces.find(p => p.branch === branch)?.name ?? '—';
  return [`本命${natal}`, ...layers.map(l => `${l.label}${layerPalaceName(l.mingBranch, branch)}`)].join('／');
}

const SIHUA_ORDER: SiHua[] = ['祿', '權', '科', '忌'];

/** 某顆星落在哪個地支宮（本命盤安星位置；運限四化也化在這顆星的本命位置上） */
export function branchOfStar(chart: ZiweiChart, starName: string): number | undefined {
  return chart.palaces.find(p => p.stars.some(s => s.name === starName))?.branch;
}

/** 「化祿天同（落亥宮：本命夫妻／大限父母／流年僕役）」；四顆依祿權科忌 */
export function transformsWithLayers(chart: ZiweiChart, t: Record<SiHua, string>, layers: Layer[]): string {
  return SIHUA_ORDER.map(h => {
    const b = branchOfStar(chart, t[h]);
    return `化${h}${t[h]}（${b === undefined ? '本盤未安此星' : `落${BRANCHES[b]}宮：${locate(chart, b, layers)}`}）`;
  }).join('；');
}

/** 生年四化：本命盤上帶化的星 */
export function natalTransforms(chart: ZiweiChart): Record<SiHua, string> {
  const t = { 祿: '', 權: '', 科: '', 忌: '' } as Record<SiHua, string>;
  for (const p of chart.palaces) for (const s of p.stars) if (s.siHua) t[s.siHua] = s.name;
  return t;
}

export interface YearContext {
  year: number;
  /** 所屬大限索引；童限為 CHILDHOOD_DAXIAN_INDEX；超出範圍為 -1 */
  daXianIndex: number;
  /** 大限（或童限）命宮地支；查不到為 undefined */
  daXianBranch?: number;
  /** 「26–35歲」或「童限」 */
  daXianLabel: string;
  daXianSiHua: ReturnType<typeof getDaXianSiHua>;
  liuNianBranch: number;
  liuNian: ReturnType<typeof getLiuNianSiHua>;
  /** 該年虛歲（以農曆生年起算） */
  age: number;
  layers: Layer[];
}

/** 某一年（農曆流年，以公曆年號表示）所在的大限與流年，各層命宮位置 */
export function yearContext(chart: ZiweiChart, year: number): YearContext {
  const age = year - chart.lunarInfo.lunarYear + 1;
  let daXianIndex = getDaXianIndexForYear(chart, year);
  let daXianBranch: number | undefined;
  let daXianLabel = '—';
  if (daXianIndex >= 0) {
    const dx = chart.daXians[daXianIndex];
    daXianBranch = dx.palaceBranch;
    daXianLabel = `${dx.startAge}–${dx.endAge}歲`;
  } else if (isChildhoodYear(chart, year)) {
    daXianIndex = CHILDHOOD_DAXIAN_INDEX;
    daXianBranch = getChildhoodDaXianPalace(chart, year)?.branch;
    daXianLabel = '童限';
  }
  const daXianSiHua = daXianIndex === -1 ? null : getDaXianSiHua(chart, daXianIndex, year);
  const liuNianBranch = getYearBranchIndex(year);
  const layers: Layer[] = [];
  if (daXianBranch !== undefined) layers.push({ label: '大限', mingBranch: daXianBranch });
  layers.push({ label: '流年', mingBranch: liuNianBranch });
  return { year, daXianIndex, daXianBranch, daXianLabel, daXianSiHua, liuNianBranch, liuNian: getLiuNianSiHua(year), age, layers };
}

/** 十二宮三盤對照表，每宮一行：「子宮：本命兄弟／大限父母／流年遷移」 */
export function overlayTable(chart: ZiweiChart, layers: Layer[]): string[] {
  return Array.from({ length: 12 }, (_, b) => `${BRANCHES[b]}宮：${locate(chart, b, layers)}`);
}

const PALACE_ALIASES: Record<string, string> = {
  命: '命宮', 交友: '僕役', 朋友: '僕役', 事業: '官祿', 工作: '官祿', 財: '財帛', 錢: '財帛',
  感情: '夫妻', 婚姻: '夫妻', 配偶: '夫妻', 健康: '疾厄', 身體: '疾厄', 房產: '田宅', 家: '田宅',
  子女: '子女', 小孩: '子女', 父母: '父母', 兄弟: '兄弟', 外出: '遷移', 精神: '福德',
};

/** 「夫妻宮」「婚姻」「交友」→ 引擎宮名；認不得回 undefined */
export function normalizePalaceName(input: string): string | undefined {
  const s = input.trim().replace(/宮$/, '') || input.trim();
  if ((LAYER_PALACE_NAMES as readonly string[]).includes(s)) return s;
  if (s === '命') return '命宮';
  return PALACE_ALIASES[s];
}

/** 某宮名在某一層落在哪個地支 */
export function branchOfLayerPalace(mingBranch: number, palaceName: string): number {
  const k = (LAYER_PALACE_NAMES as readonly string[]).indexOf(palaceName);
  return (mingBranch - k + 12) % 12;
}

/**
 * 某年哪些四化碰到指定宮位：大限、流年、生年四化，落入（或化忌對沖）本命、大限、流年的該宮。
 * 只列規則事實（哪顆化、落哪一層的該宮），不判吉凶。
 */
export function yearHits(chart: ZiweiChart, ctx: YearContext, palaceName: string): string[] {
  const targets: { layer: string; branch: number }[] = [];
  const natalP = chart.palaces.find(p => p.name === palaceName);
  if (natalP) targets.push({ layer: '本命', branch: natalP.branch });
  for (const l of ctx.layers) targets.push({ layer: l.label, branch: branchOfLayerPalace(l.mingBranch, palaceName) });

  const sources: [string, Record<SiHua, string> | undefined][] = [
    ['流年', ctx.liuNian.transforms],
    ['大限', ctx.daXianSiHua?.transforms],
    ['生年', natalTransforms(chart)],
  ];
  const hits: string[] = [];
  for (const [src, t] of sources) {
    if (!t) continue;
    for (const h of SIHUA_ORDER) {
      const b = branchOfStar(chart, t[h]);
      if (b === undefined) continue;
      for (const tg of targets) {
        if (b === tg.branch) hits.push(`${src}化${h}${t[h]}入${tg.layer}${palaceName}`);
        else if (h === '忌' && (b + 6) % 12 === tg.branch) hits.push(`${src}化忌${t[h]}沖${tg.layer}${palaceName}（落對宮${BRANCHES[b]}）`);
      }
    }
  }
  return hits;
}
