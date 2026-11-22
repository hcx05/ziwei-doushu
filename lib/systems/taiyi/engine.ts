/**
 * lib/systems/taiyi/engine.ts —— 太乙神數「歲計」（年計），依唐王希明《太乙金鏡式經》（四庫全書本）
 *
 * 全部按原書算法實作，不移植他人程式碼（kintaiyi 只用作對照，見 docs/taiyi-collation.md）：
 *   · 上元積年：至唐開元十二年甲子（724）積 1,937,281 算，「上考往古每年減一，下檢將來每年加一」；
 *   · 太歲：積年去三百六十、去六十，命甲子算外；
 *   · 局：積年去七十二（周紀法 360 為 72 之倍數），1–72；歲計恆為陽局；
 *   · 太乙：去二十四，以三約之，命起一宮順行八宮不遊中五；第一年理天、第二年理地、第三年理人；
 *   · 天目（文昌）：去十八，命起武德順行十六神，遇陰德、大武重留一算；
 *   · 計神：命起寅逆行十二辰；合神：太歲之六合；
 *   · 始擊：以計神加和德（艮），視文昌所臨，其下即始擊（卷二「運式之儀」第五）；
 *   · 主算／客算：從文昌／始擊所在宮起算，經各宮至太乙宮止（不算太乙宮）；在正宮按本數，
 *     在間神則加一算、從下一正宮續算；與太乙同宮者：正宮取太乙宮數（卷二「運式之儀」第八與例）；
 *   · 大將：算不滿十取本數；得十置一、二十置二……（「若得十置一」）；餘取零數；參將：大將三因之，去十取零；
 *   · 君基、臣基、民基（以邦數命起戌邦順行）；五福（另積 13,331 至 724，二百二十五年一週）；
 *     大遊（同 13,331，元法 4,320，二百八十八年一週，命起七宮）。
 * 十六神名依本書：巽為太炅（大炅）、巳為太神（大神）。
 */
import { BRANCHES, ganZhiOf, type Branch } from '../bazi/constants';
import { toAstronomical, formatYear } from '../years';

/** 十六神位（順行次序） */
export const SIXTEEN = ['子', '丑', '艮', '寅', '卯', '辰', '巽', '巳', '午', '未', '坤', '申', '酉', '戌', '乾', '亥'] as const;
export type Pos = (typeof SIXTEEN)[number];
export const GOD_NAME: Record<Pos, string> = {
  子: '地主', 丑: '陽德', 艮: '和德', 寅: '呂申', 卯: '高叢', 辰: '太陽', 巽: '大炅', 巳: '大神',
  午: '大威', 未: '天道', 坤: '大武', 申: '武德', 酉: '太簇', 戌: '陰主', 乾: '陰德', 亥: '大義',
};
/** 太乙九宮（差一位）：一乾 二離 三艮 四震 五中 六兌 七坤 八坎 九巽 */
export const GONG_NAME: Record<number, string> = { 1: '乾', 2: '離', 3: '艮', 4: '震', 5: '中', 6: '兌', 7: '坤', 8: '坎', 9: '巽' };
/** 正宮所在的十六神位 → 宮數 */
const ZHENG: Partial<Record<Pos, number>> = { 子: 8, 艮: 3, 卯: 4, 巽: 9, 午: 2, 坤: 7, 酉: 6, 乾: 1 };
/** 行算的宮序（順十六神方向經過正宮的次序） */
const SUAN_ORDER = [8, 3, 4, 9, 2, 7, 6, 1];
/** 太乙順行八宮 */
const GONG_SEQ = [1, 2, 3, 4, 6, 7, 8, 9];
/** 天目十八位：起武德（申）順行，陰德（乾）、大武（坤）重留 */
const TIANMU_SEQ: Pos[] = ['申', '酉', '戌', '乾', '乾', '亥', '子', '丑', '艮', '寅', '卯', '辰', '巽', '巳', '午', '未', '坤', '坤'];
const OPPOSITE: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };

export const JIYUAN_724 = 1937281;
export const WUFU_724 = 13331;
const mod = (a: number, m: number) => ((a % m) + m) % m;
/** 「去 m 不盡、算外」：餘數 1..m（0 視為 m） */
const rem1 = (a: number, m: number) => mod(a - 1, m) + 1;

export const isZheng = (p: Pos) => ZHENG[p] !== undefined;
export const posLabel = (p: Pos) => `${GOD_NAME[p]}（${p}）`;

/** 主算／客算：從 pos 所在起算至太乙宮（不含） */
export function suan(pos: Pos, taiyiGong: number): number {
  let s = 0;
  let i = SIXTEEN.indexOf(pos);
  if (!isZheng(pos)) {
    s = 1;
    while (!isZheng(SIXTEEN[i])) i = (i + 1) % 16;
  }
  const g = ZHENG[SIXTEEN[i]]!;
  if (g === taiyiGong) return s || taiyiGong;
  let k = SUAN_ORDER.indexOf(g);
  while (SUAN_ORDER[k] !== taiyiGong) { s += SUAN_ORDER[k]; k = (k + 1) % 8; }
  return s;
}

/** 由算定將：不滿十取本數；整十置其十位數；否則取零數 */
export const generalOf = (s: number) => (s < 10 ? s : s % 10 === 0 ? s / 10 : s % 10);

export interface Ju {
  ju: number;
  taiyi: { gong: number; yearInGong: number; li: '理天' | '理地' | '理人' };
  tianMu: Pos;
  jiShen: Branch;
  shiJi: Pos;
  zhu: { suan: number; general: number; deputy: number };
  ke: { suan: number; general: number; deputy: number };
}

/** 陽局 1–72 的局面（歲計） */
export function yangJu(ju: number): Ju {
  if (!Number.isInteger(ju) || ju < 1 || ju > 72) throw new Error('局數應為 1–72');
  const gong = GONG_SEQ[Math.floor(((ju - 1) % 24) / 3)];
  const yearInGong = ((ju - 1) % 3) + 1;
  const tianMu = TIANMU_SEQ[(ju - 1) % 18];
  // 局 ≡ 積年 (mod 72)，而 72 為 12 之倍數，故局即定太歲之支，亦定計神
  const taiSuiIdx = (ju - 1) % 12;
  const jiShen = BRANCHES[mod(2 - taiSuiIdx, 12)];
  const shift = SIXTEEN.indexOf('艮') - SIXTEEN.indexOf(jiShen as Pos);
  const shiJi = SIXTEEN[mod(SIXTEEN.indexOf(tianMu) + shift, 16)];
  const mk = (s: number) => { const g = generalOf(s); return { suan: s, general: g, deputy: generalOf(g * 3) }; };
  return {
    ju, taiyi: { gong, yearInGong, li: (['理天', '理地', '理人'] as const)[yearInGong - 1] },
    tianMu, jiShen, shiJi,
    zhu: mk(suan(tianMu, gong)), ke: mk(suan(shiJi, gong)),
  };
}

export interface TaiyiYear extends Ju {
  year: number;
  label: string;
  jiNian: number;
  taiSui: string;
  heShen: Branch;
  ji: number;
  jiYear: number;
  yuan: string;
  patterns: string[];
  junJi: { bang: Branch; yearInBang: number };
  chenJi: { bang: Branch; yearInBang: number };
  minJi: { bang: Branch };
  wuFu: { gong: string; place: string; yearInGong: number };
  daYou: { gong: number; yearInGong: number; li: string };
  assumptions: string[];
}

const LIUHE: Record<Branch, Branch> = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const WUFU = [
  { gong: '乾', place: '黃秘宮，西河之乾地（西北）' },
  { gong: '艮', place: '黃始宮，遼東之艮地（東方）' },
  { gong: '巽', place: '黃室宮，東吳之巽地（東南）' },
  { gong: '坤', place: '黃庭宮，西蜀之坤地（西南）' },
  { gong: '中', place: '玄師宮，京都洛陽之地（中原）' },
];
const FIVE_YUAN = ['甲子', '丙子', '戊子', '庚子', '壬子'];
const DAYOU_SEQ = [7, 8, 9, 1, 2, 3, 4, 6];

/** 太乙宮、文昌、始擊、主客大將之間的格局（只列本書有明確定義、且可由宮位直接判定者） */
function patternsOf(j: Ju): string[] {
  const out: string[] = [];
  const g = j.taiyi.gong;
  if (ZHENG[j.shiJi] === g) out.push(`掩：始擊臨太乙宮（${GONG_NAME[g]}）`);
  const qiu: string[] = [];
  if (ZHENG[j.tianMu] === g) qiu.push('文昌');
  if (j.zhu.general === g) qiu.push('主大將');
  if (j.zhu.deputy === g) qiu.push('主參將');
  if (j.ke.general === g) qiu.push('客大將');
  if (j.ke.deputy === g) qiu.push('客參將');
  if (qiu.length) out.push(`囚：${qiu.join('、')}與太乙同宮`);
  const ge: string[] = [];
  const opp = OPPOSITE[g];
  if (ZHENG[j.shiJi] === opp) ge.push('始擊（客目）');
  if (j.ke.general === opp) ge.push('客大將');
  if (j.ke.deputy === opp) ge.push('客參將');
  if (ge.length) out.push(`格：${ge.join('、')}在太乙對宮（${GONG_NAME[opp]}）`);
  return out;
}

export function computeTaiyiYear(year: number): TaiyiYear {
  const astro = toAstronomical(year);
  if (astro < -9999 || astro > 9999) throw new Error('年份請在公元前 10000 年至公元 9999 年之間');
  const jiNian = JIYUAN_724 + (astro - 724);
  const ju = rem1(jiNian, 72);
  const base = yangJu(ju);
  const taiSui = ganZhiOf(rem1(jiNian, 60) - 1);
  const inZhou = rem1(jiNian, 360);
  const ji = Math.ceil(inZhou / 60);
  const yuan = FIVE_YUAN[Math.ceil(inZhou / 72) - 1];

  const junQ = Math.floor(mod(jiNian, 360) / 30);
  const chenR = mod(mod(jiNian, 360), 36);
  const bang = (q: number) => BRANCHES[mod(10 + q, 12)];

  const wf = WUFU_724 + (astro - 724);
  const wfR = mod(wf, 225);
  const dy = mod(mod(wf, 4320), 288);
  const dyQ = Math.floor(dy / 36), dyR = dy % 36;

  const assumptions: string[] = [];
  return {
    ...base,
    year, label: formatYear(astro), jiNian, taiSui,
    heShen: LIUHE[taiSui[1] as Branch],
    ji, jiYear: rem1(inZhou, 60), yuan: `${yuan}元`,
    patterns: patternsOf(base),
    junJi: { bang: bang(junQ), yearInBang: mod(mod(jiNian, 360), 30) },
    chenJi: { bang: bang(Math.floor(chenR / 3)), yearInBang: chenR % 3 },
    // 民基以「入小周以來年」（餘數）命起戌邦，算外：餘一即戌
    minJi: { bang: bang(rem1(jiNian, 12) - 1) },
    wuFu: { ...WUFU[Math.floor(wfR / 45)], yearInGong: wfR % 45 },
    daYou: { gong: DAYOU_SEQ[dyQ], yearInGong: dyR, li: dyR < 12 ? '治天' : dyR < 24 ? '治地' : '治人' },
    assumptions,
  };
}
