/**
 * lib/systems/ziwei/xiaoliuren.ts —— 小六壬起課（確定性推算）
 *
 * 依據倪海廈《天紀》（視頻分P25 00:19:23–00:25:19）：
 *   「我們從大安開始算起月令，需要的資料呢就是月日時……按農曆……你就從四月開始，從一月令吶，
 *    一二三四四月對不對，然後再從當宮開始走，一二三四五，四月五號啦，然後戌時的話，
 *    子丑寅卯辰巳午未申酉戌……有落空亡，那就告訴你，凶此行不利」
 *
 * 起法：六宮依序 大安 → 留連 → 速喜 → 赤口 → 小吉 → 空亡。
 *   從大安起正月數到農曆月；從該宮起初一數到農曆日；從該宮起子時數到時辰。
 *   倪師示例「農曆四月初五戌時 → 空亡」由 scripts/regression/liuyue-xiaoliuren.test.ts 釘住。
 *
 * 各課含義只收倪師原話（逐字，帶出處時間），不另行發揮。
 */

export const LIUREN_NAMES = ['大安', '留連', '速喜', '赤口', '小吉', '空亡'] as const;
export type LiurenName = (typeof LIUREN_NAMES)[number];

const NI_URL = (sec: number) => `https://www.bilibili.com/video/BV1KJsLekEfA?p=25&t=${sec}`;

/** 倪師對各課的原話（字幕原文，「流連」即留連） */
export const LIUREN_MEANING: Record<LiurenName, { quote: string; time: string; url: string }> = {
  大安: { quote: '大安大概一個禮拜左右', time: '00:24:19', url: NI_URL(1459) },
  留連: { quote: '流連是事情還停滯未未前', time: '00:24:19', url: NI_URL(1459) },
  速喜: { quote: '速喜是立竿見影馬上看到', time: '00:24:19', url: NI_URL(1459) },
  赤口: { quote: '赤口代表說有第三者介入，代表有小人竊災是非，有人人為的因素', time: '00:24:19', url: NI_URL(1459) },
  小吉: { quote: '小吉大概兩個禮拜以後會看到', time: '00:24:19', url: NI_URL(1459) },
  空亡: { quote: '空亡就是你不用看了，你可以斷念了', time: '00:24:19', url: NI_URL(1459) },
};

/** 倪師講的使用規矩 */
export const LIUREN_USAGE: { quote: string; time: string; url: string }[] = [
  { quote: '當你心血來潮的時候，你就開始想用它的時候，就要以當時為準', time: '00:21:50', url: NI_URL(1310) },
  { quote: '你不要給我算國曆哈算農曆的', time: '00:21:50', url: NI_URL(1310) },
  { quote: '算過以後，你不要在同一個念再去起第二次，一定不對的嘛', time: '00:22:52', url: NI_URL(1372) },
  { quote: '就是說只是單一一件事情，尤其測心血來潮的時候哦很準', time: '00:24:19', url: NI_URL(1459) },
];

export interface LiurenResult {
  /** 月、日、時各自落在哪一課 */
  monthPos: LiurenName;
  dayPos: LiurenName;
  hourPos: LiurenName;
  /** 最終課象 = 時落之課 */
  result: LiurenName;
}

/**
 * @param lunarMonth 農曆月 1–12（閏月按月份數字）
 * @param lunarDay   農曆日 1–30
 * @param hourBranch 時辰地支索引 0=子 … 11=亥
 */
export function xiaoLiuRen(lunarMonth: number, lunarDay: number, hourBranch: number): LiurenResult {
  const m = Math.abs(Math.trunc(lunarMonth));
  const d = Math.trunc(lunarDay);
  const h = Math.trunc(hourBranch);
  if (m < 1 || m > 12) throw new RangeError(`農曆月應為 1–12，收到 ${lunarMonth}`);
  if (d < 1 || d > 30) throw new RangeError(`農曆日應為 1–30，收到 ${lunarDay}`);
  if (h < 0 || h > 11) throw new RangeError(`時辰應為 0–11（子=0），收到 ${hourBranch}`);
  const monthIdx = (m - 1) % 6;
  const dayIdx = (monthIdx + d - 1) % 6;
  const hourIdx = (dayIdx + h) % 6;
  return {
    monthPos: LIUREN_NAMES[monthIdx],
    dayPos: LIUREN_NAMES[dayIdx],
    hourPos: LIUREN_NAMES[hourIdx],
    result: LIUREN_NAMES[hourIdx],
  };
}

/** 鐘表時間 → 時辰地支索引（23:00–00:59 子、01:00–02:59 丑 …） */
export function clockToBranch(hour: number, minute = 0): number {
  const mins = hour * 60 + minute;
  return Math.floor(((mins + 60) % 1440) / 120);
}
