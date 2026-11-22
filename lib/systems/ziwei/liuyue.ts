/**
 * lib/systems/ziwei/liuyue.ts —— 斗君、流月命宮、流日命宮（確定性推算）
 *
 * 四化部分直接用 sihua.ts 現成的 getLiuYueSiHua（月干，五虎遁）與 getLiuRiSiHua（日干）；
 * 本文件只補「流月 / 流日落在哪一宮」。
 *
 * ── 斗君 ──
 * 倪師《天紀》19上（視頻分P37 00:35:36）：「斗君呢都是起子在子宮起……那斗君如何起呢我們看月和什麼時」，
 * 原話到此中斷。這裡用通行起法，與倪師「子年從子宮起」相符，也與引擎表 school-tables.generated.ts
 * 的 ZNDJ（子年斗君表）逐格一致（見 scripts/regression/liuyue-xiaoliuren.test.ts）：
 *   從流年地支所在宮起正月，逆數到生月；再從該宮起子時，順數到生時 → 斗君（流年正月所在宮）。
 *   流月 n 月 = 斗君順行 n−1 宮。
 *
 * ── 流日 ──
 * 倪師同講（00:37:31）：「子宮一月……子宮一月一號是順轉到丑宮那一月一號就是隔壁這個宮，
 * 那一月十三號還是在這裡嘛丑宮……二十六號……算到這邊來子宮（×）……寅宮（V）」。
 * 正月在子宮時：初一→丑、十三→丑、廿六→寅。三點同時成立的唯一走法是
 *   **初一起於流月宮的下一宮**，日 d 落在 流月宮順行 d 宮。（倪師口徑）
 * 另一種常見走法是初一起於流月宮本宮（日 d = 流月宮順行 d−1 宮），廿六會落丑，與倪師更正不符。
 * 兩種都輸出，倪師口徑為主，由使用者知悉差異。
 *
 * 閏月：生月為閏月時按月份數字起斗君；流月遇閏月時四化沿用 sihua.ts 的「前後半月」口徑。
 */

import { Lunar, Solar } from '../../calendar/lunar';
import type { ZiweiChart } from './types';
import { getLiuRiSiHua, getLiuYueSiHua, getYearBranchIndex, getYearStemIndex } from './sihua';
import type { SiHua } from './types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** 斗君：流年正月所在宮的地支索引 */
export function douJunBranch(yearBranch: number, birthLunarMonth: number, birthHourBranch: number): number {
  const m = Math.abs(Math.trunc(birthLunarMonth));
  return mod12(yearBranch - (m - 1) + birthHourBranch);
}

/** 流月 n 月（農曆 1–12）所在宮 */
export function liuYueBranch(douJun: number, month: number): number {
  return mod12(douJun + (Math.trunc(month) - 1));
}

export type LiuRiRule = 'nihaixia' | 'common';

/** 流日（農曆日 1–30）所在宮；默認倪師口徑：初一起於流月宮的下一宮 */
export function liuRiBranch(liuYue: number, day: number, rule: LiuRiRule = 'nihaixia'): number {
  return mod12(liuYue + Math.trunc(day) - (rule === 'nihaixia' ? 0 : 1));
}

export interface LunarDate {
  year: number;
  month: number;   // 1–12
  day: number;
  isLeapMonth: boolean;
}

/** 公曆 → 農曆 */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  const l = Solar.fromYmd(year, month, day).getLunar();
  const m = Number(l.getMonth());
  return { year: l.getYear(), month: Math.abs(m), day: l.getDay(), isLeapMonth: m < 0 };
}

export interface LiuYueInfo {
  lunarYear: number;
  month: number;
  douJun: number;
  branch: number;
  stemName: string;
  transforms: Record<SiHua, string>;
}

/** 某流年（農曆年）某流月的宮位與四化 */
export function getLiuYue(chart: ZiweiChart, lunarYear: number, month: number, opts: { isLeapMonth?: boolean; day?: number } = {}): LiuYueInfo {
  const douJun = douJunBranch(getYearBranchIndex(lunarYear), chart.lunarInfo.lunarMonth, chart.birthInfo.hour);
  const sh = getLiuYueSiHua(getYearStemIndex(lunarYear), month, {
    isLeapMonth: opts.isLeapMonth,
    liuriDay: opts.day,
    nextYearStem: getYearStemIndex(lunarYear + 1),
  });
  // 閏月後半月按下月取四化時，宮位也隨之走到下月
  return { lunarYear, month: sh.month, douJun, branch: liuYueBranch(douJun, sh.month), stemName: sh.stemName, transforms: sh.transforms };
}

export interface LiuRiInfo {
  lunar: LunarDate;
  liuyue: LiuYueInfo;
  branch: number;
  branchCommon: number;
  stemName: string | null;
  transforms: Record<SiHua, string> | null;
}

/** 某公曆日的流日宮位與四化（流年、流月按該日的農曆年月） */
export function getLiuRi(chart: ZiweiChart, year: number, month: number, day: number): LiuRiInfo {
  const lunar = solarToLunar(year, month, day);
  const liuyue = getLiuYue(chart, lunar.year, lunar.month, { isLeapMonth: lunar.isLeapMonth, day: lunar.day });
  const sh = getLiuRiSiHua(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
  return {
    lunar,
    liuyue,
    branch: liuRiBranch(liuyue.branch, lunar.day, 'nihaixia'),
    branchCommon: liuRiBranch(liuyue.branch, lunar.day, 'common'),
    stemName: sh?.stemName ?? null,
    transforms: sh?.transforms ?? null,
  };
}

/** 供測試 / 調試：農曆日的日干 */
export function lunarDayStem(lunarYear: number, month: number, day: number, isLeap = false): string {
  return Lunar.fromYmd(lunarYear, isLeap ? -month : month, day).getDayGan();
}
