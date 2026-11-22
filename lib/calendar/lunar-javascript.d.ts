declare module 'lunar-javascript' {
  class Lunar {
    /** month 为负表示闰月（如 -5 = 闰五月） */
    static fromYmd(year: number, month: number, day: number): Lunar;
    getYear(): number;
    getMonth(): number;  // negative = leap month
    getDay(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getEightChar(): EightChar;
    getPrevJie(wholeDay?: boolean): JieQi;
    // ── 梅花、六壬（2026-11-21 补：lib/systems/meihua、lib/systems/liuren 用） ──
    /** 以立春换年的年支（getYearZhi 以春节换年） */
    getYearZhiByLiChun(): string;
    /** 上一个「气」（中气：雨水、春分……大寒）；六壬月将用 */
    getPrevQi(wholeDay?: boolean): JieQi;
    /** 上一個節或氣（二十四節氣都算）；奇門用 */
    getPrevJieQi(wholeDay?: boolean): JieQi;
    getNextJie(wholeDay?: boolean): JieQi;
    /** 换算成公历(2026-08-05 补声明:lib/systems/ziwei/share.ts 早在用，只是从前靠 as any 绕过) */
    getSolar(): Solar;
    // ── 择日 / 五运六气（2026-11-21 补：lib/systems/zeri、lib/systems/wuyun 用） ──
    getYearInGanZhiByLiChun(): string;
    /** 按「节」所在日换月（交节当日即用新月），通书口径 */
    getMonthInGanZhi(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhi(): string;
    getDayNaYin(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getZhiXing(): string;
    getXiu(): string;
    getXiuLuck(): string;
    getZheng(): string;
    getAnimal(): string;
    getDayTianShen(): string;
    getDayTianShenType(): string;
    getDayTianShenLuck(): string;
    getDayYi(sect?: 1 | 2): string[];
    getDayJi(sect?: 1 | 2): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    getDayChong(): string;
    getDayChongGan(): string;
    getDayChongShengXiao(): string;
    getDaySha(): string;
    getPengZuGan(): string;
    getPengZuZhi(): string;
    getDayNineStar(): { toString(): string };
    /** 当日若为十二节之一则返回节名，否则空字符串 */
    getJie(): string;
    getTimes(): LunarTime[];
    /** 本农历年附近的节气表；当年为中文名，前后一年的为拼音大写键（如 DA_HAN） */
    getJieQiTable(): Record<string, Solar>;
  }

  class LunarTime {
    getGanZhi(): string;
    getZhi(): string;
    getMinHm(): string;
    getMaxHm(): string;
    getTianShen(): string;
    getTianShenType(): string;
    getTianShenLuck(): string;
    getChongShengXiao(): string;
    getSha(): string;
    getYi(): string[];
    getJi(): string[];
  }

  class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    /** 本时刻减去另一时刻的分钟数 */
    subtractMinute(other: Solar): number;
    toYmdHms(): string;
    toYmd(): string;
    /** 0 = 星期日 */
    getWeek(): number;
    getJulianDay(): number;
  }

  /** 节气（2026-11-21 补：八字月柱边界用） */
  class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  /** 八字（2026-11-21 补：lib/systems/bazi 用） */
  class EightChar {
    /** 1 = 晚子时日柱算次日；2 = 晚子时日柱算当天（时柱仍按次日日干起） */
    setSect(sect: 1 | 2): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    /** gender：1 男、0 女；sect：2 = 按分钟数精确计算起运 */
    getYun(gender: 0 | 1, sect?: 1 | 2): Yun;
  }

  class Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    getStartSolar(): Solar;
    isForward(): boolean;
    getDaYun(n?: number): DaYun[];
  }

  class DaYun {
    getIndex(): number;
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
  }

  const LunarUtil: {
    NAYIN: Record<string, string>;
    /** 通书宜忌用语全表 */
    YI_JI: string[];
    getDayYi(monthGanZhi: string, dayGanZhi: string): string[];
    getDayJi(monthGanZhi: string, dayGanZhi: string): string[];
  };

  /** 农历月信息(2026-06-10 补:闰月大小月边界 clamp 用) */
  class LunarMonth {
    /** month 为负表示闰月(如 -5 = 闰五月);查无此月返回 null */
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }
}
