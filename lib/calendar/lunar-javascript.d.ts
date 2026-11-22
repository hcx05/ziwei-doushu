declare module 'lunar-javascript' {
  class Lunar {
    /** month 為負表示閏月（如 -5 = 閏五月） */
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
    // ── 梅花、六壬（2026-11-21 補：lib/systems/meihua、lib/systems/liuren 用） ──
    /** 以立春換年的年支（getYearZhi 以春節換年） */
    getYearZhiByLiChun(): string;
    /** 上一個「氣」（中氣：雨水、春分……大寒）；六壬月將用 */
    getPrevQi(wholeDay?: boolean): JieQi;
    /** 上一個節或氣（二十四節氣都算）；奇門用 */
    getPrevJieQi(wholeDay?: boolean): JieQi;
    getNextJie(wholeDay?: boolean): JieQi;
    /** 換算成公曆(2026-08-05 補聲明:lib/systems/ziwei/share.ts 早在用，只是從前靠 as any 繞過) */
    getSolar(): Solar;
    // ── 擇日 / 五運六氣（2026-11-21 補：lib/systems/zeri、lib/systems/wuyun 用） ──
    getYearInGanZhiByLiChun(): string;
    /** 按「節」所在日換月（交節當日即用新月），通書口徑 */
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
    /** 當日若為十二節之一則返回節名，否則空字符串 */
    getJie(): string;
    getTimes(): LunarTime[];
    /** 本農曆年附近的節氣表；當年為中文名，前後一年的為拼音大寫鍵（如 DA_HAN） */
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
    /** 本時刻減去另一時刻的分鐘數 */
    subtractMinute(other: Solar): number;
    toYmdHms(): string;
    toYmd(): string;
    /** 0 = 星期日 */
    getWeek(): number;
    getJulianDay(): number;
  }

  /** 節氣（2026-11-21 補：八字月柱邊界用） */
  class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  /** 八字（2026-11-21 補：lib/systems/bazi 用） */
  class EightChar {
    /** 1 = 晚子時日柱算次日；2 = 晚子時日柱算當天（時柱仍按次日日干起） */
    setSect(sect: 1 | 2): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    /** gender：1 男、0 女；sect：2 = 按分鐘數精確計算起運 */
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
    /** 通書宜忌用語全表 */
    YI_JI: string[];
    getDayYi(monthGanZhi: string, dayGanZhi: string): string[];
    getDayJi(monthGanZhi: string, dayGanZhi: string): string[];
  };

  /** 農曆月信息(2026-06-10 補:閏月大小月邊界 clamp 用) */
  class LunarMonth {
    /** month 為負表示閏月(如 -5 = 閏五月);查無此月返回 null */
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }
}
