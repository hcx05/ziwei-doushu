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
    getNextJie(wholeDay?: boolean): JieQi;
    /** 换算成公历(2026-08-05 补声明:lib/ziwei/share.ts 早在用，只是从前靠 as any 绕过) */
    getSolar(): Solar;
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

  const LunarUtil: { NAYIN: Record<string, string> };

  /** 农历月信息(2026-06-10 补:闰月大小月边界 clamp 用) */
  class LunarMonth {
    /** month 为负表示闰月(如 -5 = 闰五月);查无此月返回 null */
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }
}
