import type { BirthInfo } from './types';
import { calculateTrueSolarTime, resolveZiweiDayOffset, shiftGregorianDate } from '../../calendar/true-solar-time';


/** 出生資料的原始輸入（字符串形式，與 CLI 參數一一對應） */
export interface BirthFormState {
  name: string;
  year: string;
  month: string;
  day: string;
  clockHour: string;
  clockMinute: string;
  unknownTime: boolean;
  province: string;
  city: string;
  longitude: number;
  gender: 'male' | 'female';
}

/** BirthFormState → BirthInfo
 *
 * 子時規則（倪海廈體系/三合派標準）：
 * · 23:00-23:59 = 晚子時，**按次日**排盤（日期 +1）
 * · 00:00-00:59 = 早子時，按本日排盤
 * 這與「時辰支同為子(0)」並不衝突——子時分早晚兩段，需要在日期上區分。
 */
export function formToBirthInfo(form: BirthFormState): BirthInfo {
  let y = parseInt(form.year) || 0;
  let m = parseInt(form.month) || 0;
  let d = parseInt(form.day) || 0;
  let hour = 0;

  // 時辰支與晚子時換日都按真太陽時判定（true-solar-time.ts：鐘表時間＋經度修正＋均時差），與八字引擎、時辰交界提醒同一口徑。
  // 只看鐘表 23 點會和校正後的時辰錯位：東經 100° 鐘表 23:30 約是真太陽時 22:10 亥時，不該換日。
  // ★ 2026-11-22 修正：此前這裡只做經度修正、漏了均時差，與八字引擎判出的時辰可能不同（均時差全年約 −14～+16 分鐘）。
  // 沒填出生地（province 為空）時不做校正，按東八區鐘表時間。
  if (!form.unknownTime) {
    const tst = calculateTrueSolarTime({
      year: y, month: m, day: d,
      clockHour: parseInt(form.clockHour) || 0, clockMinute: parseInt(form.clockMinute) || 0,
      longitude: form.province ? form.longitude : undefined, utcOffsetMinutes: 480,
    });
    hour = tst.branch;
    const dayOffset = resolveZiweiDayOffset(tst);
    if (dayOffset !== 0 && y > 0 && m > 0 && d > 0) {
      ({ year: y, month: m, day: d } = shiftGregorianDate({ year: y, month: m, day: d }, dayOffset));
    }
  }

  return {
    year: y, month: m, day: d,
    hour,
    gender: form.gender,
    name: form.name || undefined,
    province: form.province || undefined,
    city: form.city || undefined,
    longitude: form.province ? form.longitude : undefined,
    ...(form.unknownTime ? { hourUnknown: true } : {}),
  };
}
