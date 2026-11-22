/**
 * lib/systems/liuyao/engine.ts —— 六爻起卦與納甲裝卦（確定性）
 *
 * 起卦：
 *   · 手動：六次擲錢結果，自下而上，6 老陰（動）、7 少陽、8 少陰、9 老陽（動）；
 *   · 時間起卦（梅花易數法）：農曆年支數＋月＋日 → 上卦；再加時支數 → 下卦；總數除 6 餘數為動爻。
 * 裝卦：八宮與世應、納甲干支、六親（以本宮五行論）、六神（以日干起）、伏神（取本宮首卦）、
 *       變卦與變爻（六親仍以本卦宮論）、月建日辰、旬空、月破、日沖、動變的回頭生克與進退神。
 * 經文：按朱熹《易學啟蒙》的「占法」決定該看哪幾條卦辭爻辭。
 *
 * 只做「裝卦」與「列事實」；取用神、斷吉凶、應期都不在這裡。
 */
import { Solar } from '../../calendar/lunar';
import {
  BRANCHES, BRANCH_CLASH, BRANCH_WUXING, STEMS, controls, generates, type Branch, type Stem, type WuXing,
} from '@/lib/systems/bazi/constants';
import { seasonState, seasonWuXing, xunKongOf } from '@/lib/systems/bazi/engine';
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';
import {
  JIN_SHEN, LIUSHEN, LIUSHEN_START, PALACE_ORDER, SHI_POSITION, TRIGRAMS, trigramByLines,
  type LiuQin, type LiuShen, type Trigram,
} from './constants';
import { ZHOUYI, type ZhouyiHexagram } from './zhouyi.data';

export type YaoValue = 6 | 7 | 8 | 9;

export interface CastMoment {
  /** 起卦當下的當地公曆日期與鐘表時間 */
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 當地 UTC 偏移（小時）；不給按東八區 */
  utcOffset?: number;
}

export interface Line {
  position: number; // 1–6，自下而上
  value: YaoValue;
  yang: boolean;
  moving: boolean;
  stem: Stem;
  branch: Branch;
  wuXing: WuXing;
  liuQin: LiuQin;
  liuShen: LiuShen;
  shi: boolean;
  ying: boolean;
  /** 月建對本爻：旺相休囚死 */
  monthState: '旺' | '相' | '休' | '囚' | '死';
  monthBreak: boolean;
  dayClash: boolean;
  empty: boolean;
  /** 伏神（本卦缺的六親，取自本宮首卦同位） */
  hidden?: { stem: Stem; branch: Branch; wuXing: WuXing; liuQin: LiuQin };
  /** 動爻所化之爻 */
  changed?: {
    stem: Stem; branch: Branch; wuXing: WuXing; liuQin: LiuQin;
    /** 變爻對本爻：回頭生 / 回頭克 / 化進神 / 化退神 / 化空 / 化破 …… */
    effects: string[];
  };
}

export interface HexagramInfo {
  text: ZhouyiHexagram;
  palace: Trigram;
  palaceOrder: (typeof PALACE_ORDER)[number];
  shi: number;
  ying: number;
}

export interface LiuyaoChart {
  method: string;
  values: YaoValue[];
  main: HexagramInfo;
  changed: HexagramInfo | null;
  lines: Line[];
  /** 本卦缺而以伏神補出的六親 */
  missingLiuQin: LiuQin[];
  calendar: { monthGanZhi: string; monthBranch: Branch; dayGanZhi: string; xunKong: Branch[]; moment: string };
  /** 朱熹占法：該看哪些經文 */
  reading: { rule: string; texts: { label: string; text: string }[] };
  assumptions: string[];
}

// ────────────────── 卦與八宮 ──────────────────

const flip = (lines: string, positions: number[]) =>
  lines.split('').map((c, i) => (positions.includes(i + 1) ? (c === '1' ? '0' : '1') : c)).join('');

/** 八宮六十四卦表：由本宮卦依次變一至五爻，再變回四爻為遊魂、下卦復原為歸魂 */
export const PALACE_TABLE: Map<string, { palace: Trigram; order: number }> = (() => {
  const m = new Map<string, { palace: Trigram; order: number }>();
  for (const t of TRIGRAMS) {
    const pure = t.lines + t.lines;
    const seq = [pure, flip(pure, [1]), flip(pure, [1, 2]), flip(pure, [1, 2, 3]), flip(pure, [1, 2, 3, 4]), flip(pure, [1, 2, 3, 4, 5])];
    const youHun = flip(seq[5], [4]);
    const guiHun = t.lines + youHun.slice(3);
    seq.push(youHun, guiHun);
    seq.forEach((lines, order) => m.set(lines, { palace: t, order }));
  }
  return m;
})();

export function hexagramInfo(lines: string): HexagramInfo {
  const text = ZHOUYI.find(h => h.lines === lines);
  const p = PALACE_TABLE.get(lines);
  if (!text || !p) throw new Error(`無此卦：${lines}`);
  const shi = SHI_POSITION[p.order];
  return { text, palace: p.palace, palaceOrder: PALACE_ORDER[p.order], shi, ying: shi > 3 ? shi - 3 : shi + 3 };
}

/** 納甲：某卦第 position 爻的干支 */
export function najia(lines: string, position: number): { stem: Stem; branch: Branch } {
  const inner = position <= 3;
  const t = trigramByLines(inner ? lines.slice(0, 3) : lines.slice(3));
  return inner
    ? { stem: t.innerStem, branch: t.innerBranches[position - 1] }
    : { stem: t.outerStem, branch: t.outerBranches[position - 4] };
}

export function liuQinOf(palaceWx: WuXing, lineWx: WuXing): LiuQin {
  if (palaceWx === lineWx) return '兄弟';
  if (generates(palaceWx, lineWx)) return '子孫';
  if (controls(palaceWx, lineWx)) return '妻財';
  if (controls(lineWx, palaceWx)) return '官鬼';
  return '父母';
}

const clashes = (a: Branch, b: Branch) => BRANCH_CLASH.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

// ────────────────── 起卦 ──────────────────

export function parseYaoDigits(s: string): YaoValue[] {
  if (!/^[6-9]{6}$/.test(s)) throw new RangeError(`爻值應為 6 位、每位 6–9（自下而上），收到「${s}」`);
  return s.split('').map(Number) as YaoValue[];
}

/** 梅花易數時間起卦 → 六爻值（動爻為老陰 / 老陽，其餘為少陰 / 少陽） */
export function timeCast(lunarYearBranch: number, lunarMonth: number, lunarDay: number, hourBranch: number): { values: YaoValue[]; detail: string } {
  const yb = lunarYearBranch + 1; // 子 1 … 亥 12
  const hb = hourBranch + 1;
  const upperN = ((yb + lunarMonth + lunarDay) % 8) || 8;
  const lowerN = ((yb + lunarMonth + lunarDay + hb) % 8) || 8;
  const moving = ((yb + lunarMonth + lunarDay + hb) % 6) || 6;
  const upper = TRIGRAMS.find(t => t.xiantian === upperN)!;
  const lower = TRIGRAMS.find(t => t.xiantian === lowerN)!;
  const lines = lower.lines + upper.lines;
  const values = lines.split('').map((c, i) => {
    const yang = c === '1';
    return (i + 1 === moving ? (yang ? 9 : 6) : (yang ? 7 : 8)) as YaoValue;
  });
  return {
    values,
    detail: `年支數 ${yb}＋月 ${lunarMonth}＋日 ${lunarDay} = ${yb + lunarMonth + lunarDay}，除 8 餘 ${upperN} → 上卦${upper.name}；`
      + `再加時支數 ${hb} = ${yb + lunarMonth + lunarDay + hb}，除 8 餘 ${lowerN} → 下卦${lower.name}，除 6 餘 ${moving} → 第 ${moving} 爻動`,
  };
}

// ────────────────── 經文取用（朱熹《易學啟蒙》占法） ──────────────────

const yaoText = (h: ZhouyiHexagram, pos: number) => h.yaoCi[pos - 1];

export function zhuXiReading(main: ZhouyiHexagram, changed: ZhouyiHexagram | null, moving: number[]): LiuyaoChart['reading'] {
  const n = moving.length;
  const still = [1, 2, 3, 4, 5, 6].filter(p => !moving.includes(p));
  const g = (h: ZhouyiHexagram, label: string) => ({ label: `${label}${h.name}卦卦辭`, text: h.guaCi });
  const y = (h: ZhouyiHexagram, pos: number, label: string) => ({ label: `${label}${h.name}卦第${pos}爻`, text: yaoText(h, pos) });
  switch (n) {
    case 0: return { rule: '六爻皆不變：占本卦卦辭', texts: [g(main, '本卦')] };
    case 1: return { rule: '一爻變：以本卦變爻之辭占', texts: [y(main, moving[0], '本卦')] };
    case 2: return { rule: '二爻變：以本卦二變爻之辭占，以上爻為主', texts: [y(main, moving[1], '本卦（主）'), y(main, moving[0], '本卦')] };
    case 3: return { rule: '三爻變：占本卦與之卦卦辭，以本卦為主', texts: [g(main, '本卦（主）'), g(changed!, '之卦')] };
    case 4: return { rule: '四爻變：以之卦二不變爻之辭占，以下爻為主', texts: [y(changed!, still[0], '之卦（主）'), y(changed!, still[1], '之卦')] };
    case 5: return { rule: '五爻變：以之卦不變爻之辭占', texts: [y(changed!, still[0], '之卦')] };
    default:
      if (main.yong) return { rule: '六爻皆變，乾坤占二用之辭', texts: [{ label: `${main.name}卦${main.yong.slice(0, 2)}`, text: main.yong }] };
      return { rule: '六爻皆變：占之卦卦辭', texts: [g(changed!, '之卦')] };
  }
}

// ────────────────── 裝卦 ──────────────────

export function buildLiuyao(values: YaoValue[], moment: CastMoment, method: string): LiuyaoChart {
  if (values.length !== 6) throw new RangeError('須有六爻');
  const assumptions: string[] = [];

  // 月建（節氣月，以東八區時刻對節氣）、日辰（當地日期；23 點起算次日）
  const off = moment.utcOffset ?? 8;
  let bjMinutes = moment.hour * 60 + moment.minute + Math.round((8 - off) * 60);
  const dayShift = Math.floor(bjMinutes / 1440);
  bjMinutes = ((bjMinutes % 1440) + 1440) % 1440;
  const shifted = shiftDays(moment.year, moment.month, moment.day, dayShift);
  const monthGz = Solar.fromYmdHms(shifted.y, shifted.m, shifted.d, Math.floor(bjMinutes / 60), bjMinutes % 60, 0).getLunar().getEightChar().getMonth();
  const late = moment.hour === 23;
  const dayDate = late ? shiftDays(moment.year, moment.month, moment.day, 1) : { y: moment.year, m: moment.month, d: moment.day };
  const dayGz = Solar.fromYmdHms(dayDate.y, dayDate.m, dayDate.d, 12, 0, 0).getLunar().getEightChar().getDay();
  if (late) assumptions.push(`${ASSUMPTION_MARK}起卦在 23 點後（子時），日辰按次日（${dayGz}）計；也有人仍按當天，日辰會不同。`);
  const monthBranch = monthGz[1] as Branch;
  const dayBranch = dayGz[1] as Branch;
  const xunKong = xunKongOf(dayGz);
  const sw = seasonWuXing(monthBranch);

  const mainLines = values.map(v => (v === 7 || v === 9 ? '1' : '0')).join('');
  const moving = values.map((v, i) => (v === 6 || v === 9 ? i + 1 : 0)).filter(Boolean);
  const changedLines = moving.length ? flip(mainLines, moving) : null;
  const main = hexagramInfo(mainLines);
  const changed = changedLines ? hexagramInfo(changedLines) : null;
  const palaceWx = main.palace.wuXing;
  const shenStart = LIUSHEN_START[dayGz[0] as Stem];

  const lines: Line[] = values.map((v, i) => {
    const pos = i + 1;
    const { stem, branch } = najia(mainLines, pos);
    const wx = BRANCH_WUXING[branch];
    return {
      position: pos, value: v, yang: v === 7 || v === 9, moving: v === 6 || v === 9,
      stem, branch, wuXing: wx, liuQin: liuQinOf(palaceWx, wx), liuShen: LIUSHEN[(shenStart + i) % 6],
      shi: pos === main.shi, ying: pos === main.ying,
      monthState: seasonState(sw, wx),
      monthBreak: clashes(branch, monthBranch),
      dayClash: clashes(branch, dayBranch),
      empty: xunKong.includes(branch),
    };
  });

  // 伏神：本卦缺的六親，取本宮首卦同位之爻
  const present = new Set(lines.map(l => l.liuQin));
  const missingLiuQin = (['父母', '兄弟', '子孫', '妻財', '官鬼'] as LiuQin[]).filter(q => !present.has(q));
  if (missingLiuQin.length) {
    const pure = main.palace.lines + main.palace.lines;
    for (let pos = 1; pos <= 6; pos++) {
      const { stem, branch } = najia(pure, pos);
      const wx = BRANCH_WUXING[branch];
      const q = liuQinOf(palaceWx, wx);
      if (missingLiuQin.includes(q)) lines[pos - 1].hidden = { stem, branch, wuXing: wx, liuQin: q };
    }
  }

  // 變爻
  if (changedLines) {
    for (const p of moving) {
      const l = lines[p - 1];
      const { stem, branch } = najia(changedLines, p);
      const wx = BRANCH_WUXING[branch];
      const effects: string[] = [];
      if (generates(wx, l.wuXing)) effects.push('回頭生');
      if (controls(wx, l.wuXing)) effects.push('回頭克');
      if (JIN_SHEN.some(([a, b]) => a === l.branch && b === branch)) effects.push('化進神');
      if (JIN_SHEN.some(([a, b]) => b === l.branch && a === branch)) effects.push('化退神');
      if (clashes(l.branch, branch)) effects.push('反吟（變爻沖本爻）');
      if (l.branch === branch) effects.push('伏吟（變爻與本爻同支）');
      if (xunKong.includes(branch)) effects.push('化空');
      if (clashes(branch, monthBranch)) effects.push('化破（變爻月破）');
      l.changed = { stem, branch, wuXing: wx, liuQin: liuQinOf(palaceWx, wx), effects };
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    method, values, main, changed, lines, missingLiuQin,
    calendar: {
      monthGanZhi: monthGz, monthBranch, dayGanZhi: dayGz, xunKong,
      moment: `${moment.year}-${pad(moment.month)}-${pad(moment.day)} ${pad(moment.hour)}:${pad(moment.minute)}（UTC${off >= 0 ? '+' : ''}${off}）`,
    },
    reading: zhuXiReading(main.text, changed?.text ?? null, moving),
    assumptions,
  };
}

function shiftDays(y: number, m: number, d: number, n: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export { BRANCHES, STEMS };
