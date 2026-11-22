/**
 * lib/systems/ziwei/xiaoliuren.ts —— 小六壬起课（确定性推算）
 *
 * 依据倪海厦《天纪》（视频分P25 00:19:23–00:25:19）：
 *   「我们从大安开始算起月令，需要的资料呢就是月日时……按农历……你就从四月开始，从一月令呐，
 *    一二三四四月对不对，然后再从当宫开始走，一二三四五，四月五号啦，然后戌时的话，
 *    子丑寅卯辰巳午未申酉戌……有落空亡，那就告诉你，凶此行不利」
 *
 * 起法：六宫依序 大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡。
 *   从大安起正月数到农历月；从该宫起初一数到农历日；从该宫起子时数到时辰。
 *   倪师示例「农历四月初五戌时 → 空亡」由 scripts/regression/liuyue-xiaoliuren.test.ts 钉住。
 *
 * 各课含义只收倪师原话（逐字，带出处时间），不另行发挥。
 */

export const LIUREN_NAMES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'] as const;
export type LiurenName = (typeof LIUREN_NAMES)[number];

const NI_URL = (sec: number) => `https://www.bilibili.com/video/BV1KJsLekEfA?p=25&t=${sec}`;

/** 倪师对各课的原话（字幕原文，「流连」即留连） */
export const LIUREN_MEANING: Record<LiurenName, { quote: string; time: string; url: string }> = {
  大安: { quote: '大安大概一个礼拜左右', time: '00:24:19', url: NI_URL(1459) },
  留连: { quote: '流连是事情还停滞未未前', time: '00:24:19', url: NI_URL(1459) },
  速喜: { quote: '速喜是立竿见影马上看到', time: '00:24:19', url: NI_URL(1459) },
  赤口: { quote: '赤口代表说有第三者介入，代表有小人窃灾是非，有人人为的因素', time: '00:24:19', url: NI_URL(1459) },
  小吉: { quote: '小吉大概两个礼拜以后会看到', time: '00:24:19', url: NI_URL(1459) },
  空亡: { quote: '空亡就是你不用看了，你可以断念了', time: '00:24:19', url: NI_URL(1459) },
};

/** 倪师讲的使用规矩 */
export const LIUREN_USAGE: { quote: string; time: string; url: string }[] = [
  { quote: '当你心血来潮的时候，你就开始想用它的时候，就要以当时为准', time: '00:21:50', url: NI_URL(1310) },
  { quote: '你不要给我算国历哈算农历的', time: '00:21:50', url: NI_URL(1310) },
  { quote: '算过以后，你不要在同一个念再去起第二次，一定不对的嘛', time: '00:22:52', url: NI_URL(1372) },
  { quote: '就是说只是单一一件事情，尤其测心血来潮的时候哦很准', time: '00:24:19', url: NI_URL(1459) },
];

export interface LiurenResult {
  /** 月、日、时各自落在哪一课 */
  monthPos: LiurenName;
  dayPos: LiurenName;
  hourPos: LiurenName;
  /** 最终课象 = 时落之课 */
  result: LiurenName;
}

/**
 * @param lunarMonth 农历月 1–12（闰月按月份数字）
 * @param lunarDay   农历日 1–30
 * @param hourBranch 时辰地支索引 0=子 … 11=亥
 */
export function xiaoLiuRen(lunarMonth: number, lunarDay: number, hourBranch: number): LiurenResult {
  const m = Math.abs(Math.trunc(lunarMonth));
  const d = Math.trunc(lunarDay);
  const h = Math.trunc(hourBranch);
  if (m < 1 || m > 12) throw new RangeError(`农历月应为 1–12，收到 ${lunarMonth}`);
  if (d < 1 || d > 30) throw new RangeError(`农历日应为 1–30，收到 ${lunarDay}`);
  if (h < 0 || h > 11) throw new RangeError(`时辰应为 0–11（子=0），收到 ${hourBranch}`);
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

/** 钟表时间 → 时辰地支索引（23:00–00:59 子、01:00–02:59 丑 …） */
export function clockToBranch(hour: number, minute = 0): number {
  const mins = hour * 60 + minute;
  return Math.floor(((mins + 60) % 1440) / 120);
}
