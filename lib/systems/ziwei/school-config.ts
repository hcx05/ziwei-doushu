/**
 * 排盤流派配置 — 9 類排盤流派開關 + 默認值 + 持久化
 *
 * 數據源：按通行口徑整理（詳見 docs/school-alignment.md）
 *
 * 用戶在 chart 頁設置面板切換，立即重新排盤
 */

import type { BrightnessSchool } from './school-data';

// ─── 9 類流派配置 ───────────────────────────────────────────────────────

/** 1. 14 主星亮度表 */
export type BrightnessSchoolOption = 'default' | BrightnessSchool;

/** 2. 庚年四化（5 種變體）*/
export type GengYearSihua =
  | 'GYWYT'   // 陽武陰同（主流默認口徑，與 iztro 一致）
  | 'GYWTY'   // 陽武同陰（科忌互換說）
  | 'GYWFT'   // 陽武府同
  | 'GYWFX'   // 陽武府相
  | 'GYWTX';  // 陽武同相

/** 3. 安天馬 */
export type TianmaSchool = 'year-branch' | 'month-branch';

/** 4. 安天空 */
export type TiankongSchool = 'normal' | 'shun-jia-shi';

/** 5. 截空旬空 */
export type JiekongSchool = 'single' | 'double' | 'zhanyan';

/** 6. 安魁鉞 */
export type KuiyueSchool = 'qs1' | 'qs2' | 'zhong-yiming' | 'network';

/** 7. 安天使天傷 */
export type TianshiTianshangSchool = 'normal' | 'zhongzhou';

/** 8. 安長生十二神 */
export type ChangshengSchool = 'yin-yang-shun-ni' | 'shui-tu' | 'huo-tu';

/** 9. 晚子時處理 */
export type LateZishi =
  | 'next-day'           // 視為次日（主流默認口徑 + 我們當前）
  | 'current-day'        // 視為當日（倪師派）
  | 'all-current'        // 日柱當日時柱當日（八字）
  | 'day-cur-time-next'; // 日柱當日時柱次日（八字）

/** 10. 閏月處理（用戶反饋：倪師派要求閏月歸下月）*/
export type LeapMonth =
  | 'split'         // 分半（前 15 天歸上月，後 15 天歸下月）— ★我們默認 = 主流排盤默認口徑「月中分界」（2026-09-05 150 組金標準盤對照：9 張閏月後半月盤唯此口徑逐星全同）
  | 'next-month'    // 整月歸下月（倪師派：閏四月當五月）
  | 'prev-month'    // 整月當本月普通月（閏四月當四月）— 可選口徑「視為本月」；早先 2.6 萬盤驗證針對的是另一套參照引擎，與金標準盤默認口徑不一致
  | 'origin-month'; // 不調整（閏四月仍標閏月，iztro fixLeap=false）

// ─── 完整配置對象 ──────────────────────────────────────────────────────

export interface SchoolConfig {
  brightnessSchool: BrightnessSchoolOption;
  gengYearSihua: GengYearSihua;
  tianmaSchool: TianmaSchool;
  tiankongSchool: TiankongSchool;
  jiekongSchool: JiekongSchool;
  kuiyueSchool: KuiyueSchool;
  tianshiTianshang: TianshiTianshangSchool;
  changshengSchool: ChangshengSchool;
  lateZishi: LateZishi;
  leapMonth: LeapMonth;
}

/** 默認配置 = 對齊主流排盤默認口徑（輔星六煞雜曜+四化+運限 窮舉零差異；閏月口徑=整月歸本月）*/
/**
 * ★ 2026-09-05 默認閏月口徑 prev-month → split：150 組金標準盤對照，隨機 100 盤 0 排星差異，
 * 唯一系統性差異是 9 張閏月後半月盤——金標準盤默認「月中分界」(split)，Metis 舊默認整月歸本月；切 split 後逐星全同。
 * 站長 2026-09-05 拍板改默認。algorithm / school-patches / yunxian-palace 的兜底默認都引用這一個常量，別再各寫字面量。
 */
export const DEFAULT_LEAP_MONTH: LeapMonth = 'split';

/** 四個合法閏月口徑，供運行時校驗（引擎對非法 policy 拋 RangeError，分享鏈接解析在到達引擎前回落默認）。 */
const LEAP_MONTH_VALUES: readonly LeapMonth[] = ['split', 'prev-month', 'next-month', 'origin-month'];

export const SCHOOL_DEFAULT_CONFIG: SchoolConfig = {
  brightnessSchool: 'default',           // = 《斗數全書》（algorithm.ts 把 'default' 當 QS 用，對齊主流排盤默認口徑，10-20 改）
  gengYearSihua: 'GYWYT',                // 陽武陰同
  tianmaSchool: 'year-branch',           // 依據年支
  tiankongSchool: 'normal',              // 常規
  jiekongSchool: 'double',               // 正副雙星
  kuiyueSchool: 'qs1',                   // 斗數全書歌訣理解1
  tianshiTianshang: 'normal',            // 常規
  changshengSchool: 'yin-yang-shun-ni',  // 區分陰陽順逆
  lateZishi: 'next-day',                 // 視為次日
  leapMonth: DEFAULT_LEAP_MONTH,         // 閏月分半（主流排盤默認口徑「月中分界」，150 組金標準盤對照驗證）
};

// ─── UI 顯示用：每個開關的所有選項 + 中文標籤 ──────────────────────────

export const SCHOOL_OPTIONS = {
  // ★ 2026-06-17 統一格式(用戶要求):每組【默認項】固定排第一,且 desc 統一以「默認 · xxx」開頭
  brightnessSchool: [
    // ★ 10-20 默認項 = 《斗數全書》（主流排盤默認口徑「星曜亮度依據斗數全書」），底層就是 QS 表，所以不再另列 QS
    { value: 'default', label: '《斗數全書》派', desc: '默認 · 與主流排盤軟件默認一致' },
    { value: 'XD2', label: '現代修正 v2', desc: '現代修訂亮度表（第二版）' },
    { value: 'XD1', label: '現代修正 v1', desc: '現代修訂亮度表（第一版）' },
    { value: 'ZZ', label: '中州派', desc: '中州派理論' },
  ],
  gengYearSihua: [
    { value: 'GYWYT', label: '陽武陰同', desc: '默認 · 與 iztro / 主流一致' },
    { value: 'GYWTY', label: '陽武同陰', desc: '科忌互換說' },
    { value: 'GYWFT', label: '陽武府同' },
    { value: 'GYWFX', label: '陽武府相' },
    { value: 'GYWTX', label: '陽武同相' },
  ],
  tianmaSchool: [
    { value: 'year-branch', label: '依據年支', desc: '默認 · 年支起天馬' },
    { value: 'month-branch', label: '依據月支' },
  ],
  tiankongSchool: [
    { value: 'normal', label: '常規排法', desc: '默認 · 常規起天空' },
    { value: 'shun-jia-shi', label: '順加生時' },
  ],
  jiekongSchool: [
    { value: 'double', label: '正副雙星', desc: '默認 · 正副雙星並用' },
    { value: 'single', label: '常規單星' },
    { value: 'zhanyan', label: '占驗派' },
  ],
  kuiyueSchool: [
    { value: 'qs1', label: '《斗數全書》理解 1', desc: '默認 · 全書歌訣理解一' },
    { value: 'qs2', label: '《斗數全書》理解 2', desc: '差異僅在庚辛壬癸年生人' },
    { value: 'zhong-yiming', label: '鍾義明先生書籍排法' },
    { value: 'network', label: '網絡流傳排法' },
  ],
  tianshiTianshang: [
    { value: 'normal', label: '常規排法', desc: '默認 · 身宮 ±5 位' },
    { value: 'zhongzhou', label: '中州派排法', desc: '生月奇偶 × 性別 交換' },
  ],
  changshengSchool: [
    { value: 'yin-yang-shun-ni', label: '區分陰陽順逆', desc: '默認 · 陰陽順逆起長生' },
    { value: 'shui-tu', label: '水土共長生', desc: '土五局起點 = 水二局起點 (申)' },
    { value: 'huo-tu', label: '火土共長生', desc: '土五局起點 = 火六局起點 (寅)' },
  ],
  lateZishi: [
    { value: 'next-day', label: '視為次日', desc: '默認 · 主流做法' },
    { value: 'current-day', label: '視為當日', desc: '倪師派' },
    { value: 'all-current', label: '日柱當日 / 時柱當日（八字）' },
    { value: 'day-cur-time-next', label: '日柱當日 / 時柱次日（八字）' },
  ],
  // ★ 2026-06-17 全站約定:每組默認選項一律排第一；去「天機」二字(避商標侵權)
  // ★ 2026-09-05 默認改為分半：主流排盤默認口徑「月中分界」，150 組金標準盤對照唯此口徑逐星全同
  leapMonth: [
    { value: 'split', label: '視為分半', desc: '默認 · 「月中分界」，與主流排盤軟件默認一致（前 15 天歸本月 / 後 15 天歸下月，150 組對照盤驗證）' },
    { value: 'prev-month', label: '視為本月', desc: '閏四月整月當四月普通月排' },
    { value: 'next-month', label: '視為下月', desc: '倪師派（閏四月整月當五月排）' },
    { value: 'origin-month', label: '保持閏月', desc: '不調整，閏四月仍標閏月' },
  ],
} as const;

/** 10 類配置的中文標籤（用於 UI 標題）*/
export const SCHOOL_LABELS: Record<keyof SchoolConfig, string> = {
  brightnessSchool: '星曜亮度表',
  gengYearSihua: '庚年四化',
  tianmaSchool: '安天馬',
  tiankongSchool: '安天空',
  jiekongSchool: '安截空旬空',
  kuiyueSchool: '安魁鉞',
  tianshiTianshang: '安天使天傷',
  changshengSchool: '長生十二神',
  lateZishi: '晚子時',
  leapMonth: '閏月歸屬',
};
