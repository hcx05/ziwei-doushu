import type { BirthInfo } from './types';
import { calculateTrueSolarTime, resolveZiweiDayOffset, shiftGregorianDate } from '../../calendar/true-solar-time';


/** 出生资料的原始输入（字符串形式，与 CLI 参数一一对应） */
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
 * 子时规则（倪海厦体系/三合派标准）：
 * · 23:00-23:59 = 晚子时，**按次日**排盘（日期 +1）
 * · 00:00-00:59 = 早子时，按本日排盘
 * 这与「时辰支同为子(0)」并不冲突——子时分早晚两段，需要在日期上区分。
 */
export function formToBirthInfo(form: BirthFormState): BirthInfo {
  let y = parseInt(form.year) || 0;
  let m = parseInt(form.month) || 0;
  let d = parseInt(form.day) || 0;
  let hour = 0;

  // 时辰支与晚子时换日都按真太阳时判定（true-solar-time.ts：钟表时间＋经度修正＋均时差），与八字引擎、时辰交界提醒同一口径。
  // 只看钟表 23 点会和校正后的时辰错位：东经 100° 钟表 23:30 约是真太阳时 22:10 亥时，不该换日。
  // ★ 2026-11-22 修正：此前这里只做经度修正、漏了均时差，与八字引擎判出的时辰可能不同（均时差全年约 −14～+16 分钟）。
  // 没填出生地（province 为空）时不做校正，按东八区钟表时间。
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
