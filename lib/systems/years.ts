/**
 * lib/systems/years.ts —— 公元年與天文紀年互換（世局類體系共用）
 *
 * 使用者輸入的「公元前 N 年」以負數 −N 表示；公元沒有 0 年。
 * 天文紀年：公元前 1 年 = 0、公元前 2 年 = −1……便於做減法。
 */
export function toAstronomical(year: number): number {
  if (!Number.isInteger(year) || year === 0) throw new Error('年份須為非零整數（公元前用負數，如 -2357 表示公元前 2357 年）');
  return year < 0 ? year + 1 : year;
}
export const fromAstronomical = (astro: number) => (astro <= 0 ? astro - 1 : astro);
export const formatYear = (astro: number) => (astro <= 0 ? `公元前 ${1 - astro} 年` : `公元 ${astro} 年`);
