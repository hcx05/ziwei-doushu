/**
 * lib/systems/meihua/engine.ts —— 梅花易數起卦與體用（確定性）
 *
 * 依據《梅花易數》卷一、卷二（維基文庫本），只實作書中寫明的算法：
 *   · 卦數：乾一兌二離三震四巽五坎六艮七坤八（先天數）；「卦以八除」，整除為坤；
 *     「爻以六除」，整除為第六爻。
 *   · 年月日時起卦：年支數（子一……亥十二）＋農曆月＋農曆日 → 上卦；再加時支數 → 下卦，總數除六取動爻。
 *   · 物數、聲音：數作上卦，加時數作下卦，「卦數並時數總除六取動爻」。
 *   · 兩數（字占、丈尺、尺寸）：前數上卦、後數下卦，合兩數取爻；尺寸占另加時數。
 *   · 後天端法：物卦為上、方位卦為下，「合物卦之數與方卦之數加時數以取動爻」。
 *   · 起卦加數例：年月日時之外另加姓字筆畫，加在上卦數上，下卦、動爻隨之。
 *   · 互卦：去初爻、上爻，二三四爻為下互、三四五爻為上互；「乾坤無互，互其變卦」。
 *   · 體用：動爻所在之卦為用，不動之卦為體；互、變也都作用論（「體一用百」）。
 *   · 卦氣旺衰：春震巽、夏離、秋乾兌、冬坎、辰戌丑未月坤艮旺；春坤艮、夏乾兌、秋震巽、冬離、四季月坎衰。
 *
 * 只列事實：體用生克、旺衰、體黨用黨、動爻爻辭；斷吉凶、應期、類象對應都不在這裡。
 */
import { BRANCH_WUXING, controls, generates, type Branch, type WuXing } from '@/lib/systems/bazi/constants';
import { TRIGRAMS, trigramByName, type Trigram, type TrigramName } from '@/lib/systems/liuyao/constants';
import { ZHOUYI, type ZhouyiHexagram } from '@/lib/systems/liuyao/zhouyi.data';

/** 卦以八除：整除為坤（八） */
export const mod8 = (n: number) => ((n - 1) % 8) + 1;
/** 爻以六除：整除為第六爻 */
export const mod6 = (n: number) => ((n - 1) % 6) + 1;

export const trigramByNumber = (n: number): Trigram => TRIGRAMS.find(t => t.xiantian === mod8(n))!;

/** 後天八卦方位（「離南坎北，震東兌西」，四隅依後天圖） */
export const DIRECTION_TRIGRAM: Record<string, TrigramName> = {
  南: '离', 北: '坎', 東: '震', 西: '兑', 東南: '巽', 西北: '乾', 東北: '艮', 西南: '坤',
};

export interface MeihuaCast {
  /** 計上卦、下卦、動爻用的三個總數 */
  upperSum: number;
  lowerSum: number;
  movingSum: number;
  /** 起卦法名稱與算式（給讀者核對） */
  method: string;
  detail: string;
}

const tn = (n: number) => trigramByNumber(n).name;

/** 年月日時起卦；plus 為「起卦加數例」另加的數（如姓字筆畫） */
export function castByTime(yearBranchNo: number, lunarMonth: number, lunarDay: number, hourNo: number, plus = 0): MeihuaCast {
  if (![yearBranchNo, hourNo].every(n => Number.isInteger(n) && n >= 1 && n <= 12)) throw new RangeError('年支數、時支數應為 1–12');
  if (!(Number.isInteger(lunarMonth) && lunarMonth >= 1 && lunarMonth <= 12)) throw new RangeError('農曆月應為 1–12');
  if (!(Number.isInteger(lunarDay) && lunarDay >= 1 && lunarDay <= 30)) throw new RangeError('農曆日應為 1–30');
  if (!(Number.isInteger(plus) && plus >= 0)) throw new RangeError('加數應為非負整數');
  const base = yearBranchNo + lunarMonth + lunarDay + plus;
  const total = base + hourNo;
  return {
    upperSum: base, lowerSum: total, movingSum: total,
    method: plus ? '年月日時起卦（另加數）' : '年月日時起卦',
    detail: `年 ${yearBranchNo}＋月 ${lunarMonth}＋日 ${lunarDay}${plus ? `＋加數 ${plus}` : ''} = ${base}，以八除餘 ${mod8(base)}，上卦${tn(base)}；`
      + `加時 ${hourNo} 得 ${total}，以八除餘 ${mod8(total)}，下卦${tn(total)}；${total} 以六除餘 ${mod6(total)}，第 ${mod6(total)} 爻動`,
  };
}

/** 物數、聲音占：一個數作上卦，加時數作下卦，並取動爻 */
export function castByNumber(n: number, hourNo: number): MeihuaCast {
  if (!(Number.isInteger(n) && n >= 1)) throw new RangeError('數應為正整數');
  if (!(Number.isInteger(hourNo) && hourNo >= 1 && hourNo <= 12)) throw new RangeError('時支數應為 1–12');
  const total = n + hourNo;
  return {
    upperSum: n, lowerSum: total, movingSum: total, method: '物數（聲音）占',
    detail: `數 ${n}，以八除餘 ${mod8(n)}，上卦${tn(n)}；加時 ${hourNo} 得 ${total}，以八除餘 ${mod8(total)}，下卦${tn(total)}；以六除餘 ${mod6(total)}，第 ${mod6(total)} 爻動`,
  };
}

/** 兩數起卦（字占、丈尺、尺寸、分兩段的聲音）：前數上卦、後數下卦，合兩數（可加時）取爻 */
export function castByTwoNumbers(a: number, b: number, hourNo?: number): MeihuaCast {
  if (![a, b].every(n => Number.isInteger(n) && n >= 1)) throw new RangeError('兩數都應為正整數');
  if (hourNo !== undefined && !(Number.isInteger(hourNo) && hourNo >= 1 && hourNo <= 12)) throw new RangeError('時支數應為 1–12');
  const total = a + b + (hourNo ?? 0);
  return {
    upperSum: a, lowerSum: b, movingSum: total, method: hourNo ? '兩數起卦（加時取爻）' : '兩數起卦',
    detail: `上數 ${a}，以八除餘 ${mod8(a)}，上卦${tn(a)}；下數 ${b}，以八除餘 ${mod8(b)}，下卦${tn(b)}；`
      + `${a}＋${b}${hourNo ? `＋時 ${hourNo}` : ''} = ${total}，以六除餘 ${mod6(total)}，第 ${mod6(total)} 爻動`,
  };
}

/** 後天端法：物卦為上、方位卦為下，二卦先天數加時數取動爻 */
export function castByTrigrams(upper: TrigramName, lower: TrigramName, hourNo: number): MeihuaCast {
  const u = trigramByName(upper), l = trigramByName(lower);
  if (!u || !l) throw new RangeError('卦名應為乾兌離震巽坎艮坤之一');
  if (!(Number.isInteger(hourNo) && hourNo >= 1 && hourNo <= 12)) throw new RangeError('時支數應為 1–12');
  const total = u.xiantian + l.xiantian + hourNo;
  return {
    upperSum: u.xiantian, lowerSum: l.xiantian, movingSum: total, method: '後天端法（物卦為上、方位卦為下）',
    detail: `上卦${u.name}（${u.xiantian}）＋下卦${l.name}（${l.xiantian}）＋時 ${hourNo} = ${total}，以六除餘 ${mod6(total)}，第 ${mod6(total)} 爻動`,
  };
}

// ────────────────── 體用 ──────────────────

export type Season = '春' | '夏' | '秋' | '冬' | '四季';
export type Qi = '旺' | '衰' | '平';

/** 月建 → 季：寅卯春、巳午夏、申酉秋、亥子冬、辰戌丑未為四季之月 */
export function seasonOfMonth(b: Branch): Season {
  if (b === '寅' || b === '卯') return '春';
  if (b === '巳' || b === '午') return '夏';
  if (b === '申' || b === '酉') return '秋';
  if (b === '亥' || b === '子') return '冬';
  return '四季';
}

const WANG: Record<Season, TrigramName[]> = { 春: ['震', '巽'], 夏: ['离'], 秋: ['乾', '兑'], 冬: ['坎'], 四季: ['坤', '艮'] };
const SHUAI: Record<Season, TrigramName[]> = { 春: ['坤', '艮'], 夏: ['乾', '兑'], 秋: ['震', '巽'], 冬: ['离'], 四季: ['坎'] };

/** 卦氣：書中只分旺、衰兩種，其餘記為「平」 */
export function trigramQi(t: TrigramName, s: Season): Qi {
  return WANG[s].includes(t) ? '旺' : SHUAI[s].includes(t) ? '衰' : '平';
}

export type Relation = '生體' | '克體' | '比和' | '體克' | '體生';

/** 某卦（用、互、變）對體卦：用生體、用克體、比和、體克用、體生用（洩） */
export function relationToTi(ti: WuXing, other: WuXing): Relation {
  if (ti === other) return '比和';
  if (generates(other, ti)) return '生體';
  if (controls(other, ti)) return '克體';
  if (controls(ti, other)) return '體克';
  return '體生';
}

export interface Piece {
  role: '用' | '互（上）' | '互（下）' | '變';
  trigram: Trigram;
  relation: Relation;
  qi: Qi;
}

export interface MeihuaChart {
  cast: MeihuaCast;
  main: ZhouyiHexagram;
  upper: Trigram;
  lower: Trigram;
  moving: number;
  changed: ZhouyiHexagram;
  /** 互卦取自本卦；乾、坤二卦「無互，互其變卦」 */
  hu: { upper: Trigram; lower: Trigram; from: '本卦' | '變卦'; hexagram: ZhouyiHexagram };
  ti: { trigram: Trigram; position: '上卦' | '下卦'; qi: Qi };
  pieces: Piece[];
  /** 「體党多而體勢盛，用黨多則體勢衰」：互、變之中與體同五行者、與用同五行者 */
  party: { ti: TrigramName[]; yong: TrigramName[] };
  season: { monthBranch: Branch; season: Season };
  movingText: string;
  /** 成卦之數（取動爻的總數；書中應期以此數為準，行半、坐倍、立如數） */
  chengGuaShu: number;
}

const hexByLines = (lines: string) => ZHOUYI.find(h => h.lines === lines)!;
const flipAt = (lines: string, pos: number) => lines.split('').map((c, i) => (i + 1 === pos ? (c === '1' ? '0' : '1') : c)).join('');
const trigramByLines = (lines: string) => TRIGRAMS.find(t => t.lines === lines)!;

export function buildMeihua(cast: MeihuaCast, monthBranch: Branch): MeihuaChart {
  const upper = trigramByNumber(cast.upperSum);
  const lower = trigramByNumber(cast.lowerSum);
  const moving = mod6(cast.movingSum);
  const lines = lower.lines + upper.lines; // 自下而上
  const main = hexByLines(lines);
  const changedLines = flipAt(lines, moving);
  const changed = hexByLines(changedLines);

  const pure = lines === '111111' || lines === '000000';
  const huSrc = pure ? changedLines : lines;
  const huLower = trigramByLines(huSrc.slice(1, 4));
  const huUpper = trigramByLines(huSrc.slice(2, 5));
  const hu = { upper: huUpper, lower: huLower, from: pure ? '變卦' as const : '本卦' as const, hexagram: hexByLines(huLower.lines + huUpper.lines) };

  const yongIsLower = moving <= 3;
  const tiT = yongIsLower ? upper : lower;
  const yongT = yongIsLower ? lower : upper;
  const bianT = trigramByLines(yongIsLower ? changedLines.slice(0, 3) : changedLines.slice(3));
  const season = seasonOfMonth(monthBranch);
  const mk = (role: Piece['role'], t: Trigram): Piece => ({ role, trigram: t, relation: relationToTi(tiT.wuXing, t.wuXing), qi: trigramQi(t.name, season) });
  const pieces = [mk('用', yongT), mk('互（上）', huUpper), mk('互（下）', huLower), mk('變', bianT)];
  const others = [huUpper, huLower, bianT];

  return {
    cast, main, upper, lower, moving, changed, hu,
    ti: { trigram: tiT, position: yongIsLower ? '上卦' : '下卦', qi: trigramQi(tiT.name, season) },
    pieces,
    party: {
      ti: others.filter(t => t.wuXing === tiT.wuXing).map(t => t.name),
      yong: others.filter(t => t.wuXing === yongT.wuXing).map(t => t.name),
    },
    season: { monthBranch, season },
    movingText: main.yaoCi[moving - 1],
    chengGuaShu: cast.movingSum,
  };
}

export { BRANCH_WUXING };
