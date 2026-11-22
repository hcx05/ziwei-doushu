/**
 * 迴歸測試共用的「獨立算法」—— 與 lunar-javascript 無關，用來交叉驗證引擎：
 *   · 儒略日數（公曆 → JDN）與日干支（1949-10-01 甲子）；
 *   · Meeus《天文算法》第 25 章低精度太陽視黃經（約 0.01°，即十幾分鍾），二分法求節氣時刻。
 */
import { ganZhiOf } from '../../lib/systems/bazi/constants';

export function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export const dayGanZhi = (y: number, m: number, d: number) => ganZhiOf(jdn(y, m, d) - 11);

const rad = (x: number) => (x * Math.PI) / 180;
export function sunLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M))
    + (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M)) + 0.000289 * Math.sin(rad(3 * M));
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  return ((lambda % 360) + 360) % 360;
}

/** 太陽視黃經到達 lon 度的儒略日（在 nearJd 前後 20 天內找） */
export function termJd(lon: number, nearJd: number): number {
  let lo = nearJd - 20, hi = nearJd + 20;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const diff = ((sunLongitude(mid) - lon + 540) % 360) - 180;
    if (diff < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 儒略日 → 北京時間 */
export function jdToBeijing(jd: number): { y: number; m: number; d: number; h: number; mi: number; minutesOfDay: number } {
  const t = new Date(Math.round((jd - 2440587.5) * 86400_000 + 8 * 3600_000));
  const h = t.getUTCHours(), mi = t.getUTCMinutes();
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h, mi, minutesOfDay: h * 60 + mi };
}

/** 線性同餘偽隨機（固定種子，結果可重現） */
export function seeded(seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  return { rand, int: (a: number, b: number) => a + Math.floor(rand() * (b - a + 1)) };
}
