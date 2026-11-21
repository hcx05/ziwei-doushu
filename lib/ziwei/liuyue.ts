/**
 * lib/ziwei/liuyue.ts —— 斗君、流月命宫、流日命宫（确定性推算）
 *
 * 四化部分直接用 sihua.ts 现成的 getLiuYueSiHua（月干，五虎遁）与 getLiuRiSiHua（日干）；
 * 本文件只补「流月 / 流日落在哪一宫」。
 *
 * ── 斗君 ──
 * 倪师《天纪》19上（视频分P37 00:35:36）：「斗君呢都是起子在子宫起……那斗君如何起呢我们看月和什么时」，
 * 原话到此中断。这里用通行起法，与倪师「子年从子宫起」相符，也与引擎表 school-tables.generated.ts
 * 的 ZNDJ（子年斗君表）逐格一致（见 scripts/regression/liuyue-xiaoliuren.test.ts）：
 *   从流年地支所在宫起正月，逆数到生月；再从该宫起子时，顺数到生时 → 斗君（流年正月所在宫）。
 *   流月 n 月 = 斗君顺行 n−1 宫。
 *
 * ── 流日 ──
 * 倪师同讲（00:37:31）：「子宫一月……子宫一月一号是顺转到丑宫那一月一号就是隔壁这个宫，
 * 那一月十三号还是在这里嘛丑宫……二十六号……算到这边来子宫（×）……寅宫（V）」。
 * 正月在子宫时：初一→丑、十三→丑、廿六→寅。三点同时成立的唯一走法是
 *   **初一起于流月宫的下一宫**，日 d 落在 流月宫顺行 d 宫。（倪师口径）
 * 另一种常见走法是初一起于流月宫本宫（日 d = 流月宫顺行 d−1 宫），廿六会落丑，与倪师更正不符。
 * 两种都输出，倪师口径为主，由使用者知悉差异。
 *
 * 闰月：生月为闰月时按月份数字起斗君；流月遇闰月时四化沿用 sihua.ts 的「前后半月」口径。
 */

import { Lunar, Solar } from 'lunar-javascript';
import type { ZiweiChart } from './types';
import { getLiuRiSiHua, getLiuYueSiHua, getYearBranchIndex, getYearStemIndex } from './sihua';
import type { SiHua } from './types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** 斗君：流年正月所在宫的地支索引 */
export function douJunBranch(yearBranch: number, birthLunarMonth: number, birthHourBranch: number): number {
  const m = Math.abs(Math.trunc(birthLunarMonth));
  return mod12(yearBranch - (m - 1) + birthHourBranch);
}

/** 流月 n 月（农历 1–12）所在宫 */
export function liuYueBranch(douJun: number, month: number): number {
  return mod12(douJun + (Math.trunc(month) - 1));
}

export type LiuRiRule = 'nihaixia' | 'common';

/** 流日（农历日 1–30）所在宫；默认倪师口径：初一起于流月宫的下一宫 */
export function liuRiBranch(liuYue: number, day: number, rule: LiuRiRule = 'nihaixia'): number {
  return mod12(liuYue + Math.trunc(day) - (rule === 'nihaixia' ? 0 : 1));
}

export interface LunarDate {
  year: number;
  month: number;   // 1–12
  day: number;
  isLeapMonth: boolean;
}

/** 公历 → 农历 */
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

/** 某流年（农历年）某流月的宫位与四化 */
export function getLiuYue(chart: ZiweiChart, lunarYear: number, month: number, opts: { isLeapMonth?: boolean; day?: number } = {}): LiuYueInfo {
  const douJun = douJunBranch(getYearBranchIndex(lunarYear), chart.lunarInfo.lunarMonth, chart.birthInfo.hour);
  const sh = getLiuYueSiHua(getYearStemIndex(lunarYear), month, {
    isLeapMonth: opts.isLeapMonth,
    liuriDay: opts.day,
    nextYearStem: getYearStemIndex(lunarYear + 1),
  });
  // 闰月后半月按下月取四化时，宫位也随之走到下月
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

/** 某公历日的流日宫位与四化（流年、流月按该日的农历年月） */
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

/** 供测试 / 调试：农历日的日干 */
export function lunarDayStem(lunarYear: number, month: number, day: number, isLeap = false): string {
  return Lunar.fromYmd(lunarYear, isLeap ? -month : month, day).getDayGan();
}
