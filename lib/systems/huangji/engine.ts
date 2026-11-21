/**
 * lib/systems/huangji/engine.ts —— 皇極經世（邵雍）元會運世定位與「以運經世」原文查詢
 *
 * 純算術，依《皇極經世書》（四庫全書本）的編排：
 *   一元 = 十二會 = 三百六十運 = 四千三百二十世 = 十二萬九千六百年；一會三十運、一運十二世、一世三十年。
 *   標記：元以日（甲）、會以月（子…亥）、運以星（甲…癸循環）、世以辰（子…亥循環），
 *   見卷一「日甲一 月寅三 星甲六十一 辰子七百二十一」等。
 * 定年錨點：卷五上「經世之申二千一百五十七」下第一年為「甲子 唐帝堯二十一年」，
 *   以通行紀年即公元前 2337 年（天文紀年 −2336）。回歸測試另以卷六下
 *   「經世之申二千二百六十五／甲子 唐景文皇帝十六年……改元天祐」（公元 904 年）驗算。
 * 本模組不做：值卦（元會運世配卦各家推法不一）、開物閉物（出自後人注解，原書正文未載）。
 */
import { ganZhiOf } from '../bazi/constants';
import { CHRONICLE, type ChronicleYear } from './chronicle.data';
import { formatYear, fromAstronomical, toAstronomical } from '../years';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

/** 一元中的第 1 年 = 天文紀年 −67016（由「世 2157 第 1 年 = −2336」推得） */
export const YUAN_EPOCH_ASTRO = -2336 - (2156 * 30);
export const YEARS_PER = { hui: 10800, yun: 360, shi: 30 } as const;

const fromN = (n: number) => n + YUAN_EPOCH_ASTRO - 1;

export interface HuangjiPosition {
  year: number;
  astro: number;
  label: string;
  /** 本元第幾年（1 起） */
  n: number;
  ganZhi: string;
  hui: { no: number; label: string; inHui: number; span: [string, string] };
  yun: { no: number; label: string; inHui: number; span: [string, string] };
  shi: { no: number; label: string; inYun: number; span: [string, string] };
  yearInShi: number;
  /** 《皇極經世》以運經世的原文（若在收錄範圍內） */
  chronicle: { entry: ChronicleYear | null; status: 'text' | 'blank' | 'missing' | 'gap' | 'out-of-range' };
}

const CHRON_FIRST_SHI = CHRONICLE[0].shi;
const CHRON_LAST_SHI = CHRONICLE[CHRONICLE.length - 1].shi;
const chronIndex = new Map(CHRONICLE.map(e => [`${e.shi}-${e.n}`, e]));

export function locate(year: number): HuangjiPosition {
  const astro = toAstronomical(year);
  const n = astro - YUAN_EPOCH_ASTRO + 1;
  if (n < 1 || n > 129600) throw new Error('超出本元範圍（公元前 67017 年至公元 62583 年）');
  const hui = Math.ceil(n / YEARS_PER.hui);
  const yun = Math.ceil(n / YEARS_PER.yun);
  const shi = Math.ceil(n / YEARS_PER.shi);
  const yearInShi = ((n - 1) % 30) + 1;
  const span = (no: number, per: number): [string, string] => [formatYear(fromN((no - 1) * per + 1)), formatYear(fromN(no * per))];

  let chronicle: HuangjiPosition['chronicle'];
  if (shi < CHRON_FIRST_SHI || shi > CHRON_LAST_SHI) chronicle = { entry: null, status: 'out-of-range' };
  else {
    const e = chronIndex.get(`${shi}-${yearInShi}`) ?? null;
    chronicle = !e ? { entry: null, status: 'gap' } : e.missing ? { entry: e, status: 'missing' } : { entry: e, status: e.text ? 'text' : 'blank' };
  }

  return {
    year, astro, label: formatYear(astro), n,
    ganZhi: ganZhiOf(n - 1),
    hui: { no: hui, label: `月${BRANCHES[(hui - 1) % 12]}`, inHui: hui, span: span(hui, YEARS_PER.hui) },
    yun: { no: yun, label: `星${STEMS[(yun - 1) % 10]}`, inHui: ((yun - 1) % 30) + 1, span: span(yun, YEARS_PER.yun) },
    shi: { no: shi, label: `辰${BRANCHES[(shi - 1) % 12]}`, inYun: ((shi - 1) % 12) + 1, span: span(shi, YEARS_PER.shi) },
    yearInShi,
    chronicle,
  };
}

/** 原文中以關鍵字搜尋（回傳定年後的條目） */
export function searchChronicle(keyword: string, limit = 30): { position: HuangjiPosition; text: string }[] {
  if (!keyword.trim()) throw new Error('關鍵字不能為空');
  const hits: { position: HuangjiPosition; text: string }[] = [];
  for (const e of CHRONICLE) {
    if (!e.text.includes(keyword)) continue;
    const n = (e.shi - 1) * 30 + e.n;
    hits.push({ position: locate(fromAstronomical(fromN(n))), text: e.text });
    if (hits.length >= limit) break;
  }
  return hits;
}

export const CHRONICLE_RANGE = {
  from: formatYear(fromN((CHRON_FIRST_SHI - 1) * 30 + 1)),
  to: formatYear(fromN(CHRON_LAST_SHI * 30)),
};
