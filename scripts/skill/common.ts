/**
 * scripts/skill/common.ts —— 各 Skill 命令行工具共用的參數解析與出生資料處理
 *
 * 出生資料統一換算成「東八區鐘表時間 + 出生地經度」，真太陽時校正由各體系引擎自己做
 * （紫微：lib/systems/ziwei/share.ts；八字：lib/systems/bazi/engine.ts），兩邊同一口徑。
 */
import { PROVINCES } from '../../lib/calendar/cities';
import { isChinaDST } from '../../lib/calendar/dst-cn';
import { isValidLunarDate, lunarToSolar } from '../../lib/calendar/lunar-solar';
import { calculateTrueSolarTime, shiftGregorianDate } from '../../lib/calendar/true-solar-time';
import { ASSUMPTION_MARK } from '../../lib/reasoning/kinds';
import type { BirthFormState } from '../../lib/systems/ziwei/share';
import { readFileSync } from 'node:fs';
import { checkMarks, enforceMarks } from '../../lib/reasoning/check';
import { ABDUCTION_MAX_LINES, UNCERTAINTY_MARK, type SectionSpec } from '../../lib/reasoning/kinds';
import type { CastMoment } from '../../lib/systems/liuyao/engine';

export type Args = { _: string[]; [k: string]: string | boolean | string[] };

export function parseArgs(argv: string[]): Args {
  const out: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else {
      out._.push(a);
    }
  }
  return out;
}

export function fail(msg: string): never {
  console.error(`錯誤：${msg}`);
  process.exit(2);
}

export const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export function findCity(name: string): { province: string; city: string; longitude: number } | null {
  const n = name.replace(/[市縣區]$/, '');
  const hits: { province: string; city: string; longitude: number }[] = [];
  for (const p of PROVINCES) {
    for (const c of p.cities) {
      if (c.name === name || c.name.replace(/[市縣區]$/, '') === n) {
        hits.push({ province: p.name, city: c.name, longitude: c.longitude });
      }
    }
    if (p.name.replace(/[省市]$/, '') === n && p.cities.length) {
      hits.push({ province: p.name, city: p.cities[0].name, longitude: p.cities[0].longitude });
    }
  }
  return hits[0] ?? null;
}

/** 解析出生參數（公曆 / 農曆、鐘表時間、海外時區、出生地），換算成東八區鐘表時間；notes 為要轉告的說明 */
export function parseBirthArgs(args: Args): { form: BirthFormState; notes: string[] } {
  const date = str(args.date) ?? fail('缺少 --date YYYY-MM-DD（出生日期）');
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式應為 YYYY-MM-DD，收到「${date}」`);
  let [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];

  if (args.lunar) {
    const leap = !!args.leap;
    if (!isValidLunarDate(y, mo, d, leap)) fail(`農曆 ${y}年${leap ? '閏' : ''}${mo}月${d}日 不存在`);
    const solar = lunarToSolar(y, mo, d, leap) ?? fail('農曆轉公曆失敗');
    [y, mo, d] = [solar.year, solar.month, solar.day];
  }

  const g = str(args.gender) ?? fail('缺少 --gender（男 / 女）');
  const gender = /^(男|m|male)$/i.test(g) ? 'male' : /^(女|f|female)$/i.test(g) ? 'female' : fail(`--gender 無法識別：${g}`);

  const unknownTime = !!args['unknown-time'];
  let clockHour = '', clockMinute = '';
  if (!unknownTime) {
    const t = str(args.time) ?? fail('缺少 --time HH:MM；不知道出生時間請改用 --unknown-time');
    const tm = t.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式應為 HH:MM，收到「${t}」`);
    let minutes = Number(tm[1]) * 60 + Number(tm[2]);
    if (minutes >= 1440) fail(`--time 超出範圍：${t}`);
    // 海外出生：把當地鐘表時間換成東八區時間（經度另給 --longitude），引擎按 120° 基準做真太陽時
    const offArg = str(args['utc-offset']);
    if (offArg) {
      const off = Number(offArg);
      if (!Number.isFinite(off) || off < -12 || off > 14) fail(`--utc-offset 應為 -12 ~ +14 的小時數，收到「${offArg}」`);
      if (!str(args.longitude)) fail('海外出生請同時給 --longitude（出生地經度，西經為負），否則無法做真太陽時校正');
      minutes += Math.round((8 - off) * 60);
      const dayShift = Math.floor(minutes / 1440);
      minutes = ((minutes % 1440) + 1440) % 1440;
      if (dayShift) ({ year: y, month: mo, day: d } = shiftGregorianDate({ year: y, month: mo, day: d }, dayShift));
    }
    clockHour = String(Math.floor(minutes / 60));
    clockMinute = String(minutes % 60);
  }

  let province = '', city = '', longitude = 120;
  const cityArg = str(args.city);
  const lonArg = str(args.longitude);
  if (lonArg) {
    longitude = Number(lonArg);
    if (!Number.isFinite(longitude)) fail(`--longitude 不是數字：${lonArg}`);
    province = '自填經度';
    city = cityArg ?? '';
  } else if (cityArg) {
    const hit = findCity(cityArg) ?? fail(`找不到城市「${cityArg}」，請改用 --longitude 直接給經度（東經為正）`);
    ({ province, city, longitude } = hit);
  }

  const form: BirthFormState = {
    name: '', year: String(y), month: String(mo), day: String(d),
    clockHour, clockMinute, unknownTime, province, city, longitude, gender,
  };

  const notes: string[] = [];
  if (args.lunar) notes.push(`農曆輸入已換算為公曆 ${y}-${mo}-${d}`);
  if (str(args['utc-offset'])) notes.push(`當地時間（UTC${Number(args['utc-offset']) >= 0 ? '+' : ''}${args['utc-offset']}）已換算為東八區 ${y}-${mo}-${d} ${clockHour}:${clockMinute.padStart(2, '0')} 再排盤`);
  if (province) notes.push(`已按出生地經度 ${longitude}° 做真太陽時校正（${province}${city ? ' ' + city : ''}）`);
  else if (!unknownTime) notes.push('未給出生地：按東經 120° 鐘表時間排盤，未做真太陽時校正');
  if (!unknownTime) {
    const near = hourBoundaryNote(y, mo, d, Number(clockHour), Number(clockMinute), province ? longitude : undefined);
    if (near) notes.push(near);
  }
  if (!unknownTime && !str(args['utc-offset']) && isChinaDST(y, mo, d)) {
    notes.push('⚠ 該日期處於中國夏令時期間：若給的是當時的鐘表時間，應先減 1 小時再排；請向命主確認，不要自行假設');
  }
  return { form, notes };
}


/** 出生時刻離時辰交界多近（分鐘數閾值）：出生記錄常取整到 5–15 分鐘，再近就可能換時辰 */
export const HOUR_BOUNDARY_MINUTES = 15;
const BRANCH_NAMES = '子丑寅卯辰巳午未申酉戌亥';

/**
 * 真太陽時（有出生地時）或東八區鐘表時間離最近的時辰交界（奇數整點）不到 HOUR_BOUNDARY_MINUTES 分鐘時，
 * 給出「⚠ 假設：」提醒：時辰對出生記錄誤差敏感，應問清時間來源，必要時兩個時辰各排一次定盤。
 */
export function hourBoundaryNote(y: number, mo: number, d: number, hour: number, minute: number, longitude?: number): string | null {
  const t = longitude === undefined
    ? { hour, minute }
    : calculateTrueSolarTime({ year: y, month: mo, day: d, clockHour: hour, clockMinute: minute, longitude, utcOffsetMinutes: 480 });
  const mins = t.hour * 60 + t.minute;
  let best = Infinity, boundary = 0;
  for (let b = 60; b <= 1440; b += 120) {
    const dist = Math.min(Math.abs(mins - b), Math.abs(mins + 1440 - b), Math.abs(mins - 1440 - b));
    if (dist < best) { best = dist; boundary = b % 1440; }
  }
  if (best > HOUR_BOUNDARY_MINUTES) return null;
  const after = Math.floor(((boundary + 60) % 1440) / 120) % 12;  // 交界之後的時辰
  const before = (after + 11) % 12;
  const hh = String(t.hour).padStart(2, '0'), mm = String(t.minute).padStart(2, '0');
  return `${ASSUMPTION_MARK}出生時刻（${longitude === undefined ? '鐘表時間' : '真太陽時'} ${hh}:${mm}）距${BRANCH_NAMES[before]}、${BRANCH_NAMES[after]}兩個時辰的交界只有 ${Math.round(best)} 分鐘，記錄差幾分鐘時辰就會變。請問清出生時間的來源（出生證明、家人記憶或估計），不確定時兩個時辰各排一次，用已發生的事定盤。`;
}

/** check 子命令的共用部分：讀草稿（--file 或標準輸入），--fix 輸出補標版本，否則報告缺漏並以非零退出 */
export function runCheck(args: Args, sections: SectionSpec[]): void {
  const text = typeof args.file === 'string' ? readFileSync(args.file, 'utf8') : readFileSync(0, 'utf8');
  if (args.fix) {
    process.stdout.write(enforceMarks(text, sections));
    return;
  }
  const r = checkMarks(text, sections);
  if (r.ok) { console.log('✓ 溯因節都已標注，篇幅也在限制內。'); return; }
  if (r.unmarkedAbduction.length) console.log(`✗ 這些溯因節第一行沒有以「${UNCERTAINTY_MARK}」開頭：${r.unmarkedAbduction.join('、')}`);
  if (r.tooLongAbduction.length) console.log(`✗ 這些溯因節超過 ${ABDUCTION_MAX_LINES} 行（只寫結論與「另一種讀法」，不列訊號、不貼過程）：${r.tooLongAbduction.join('、')}`);
  process.exitCode = 1;
}


// ── 起卦（起課）時刻：六爻、梅花、六壬共用 ─────────────────

/** --date/--time（當地時間，可加 --utc-offset）或 --now --utc-offset */
export function parseMoment(args: Args): CastMoment {
  if (args.now) {
    const offArg = str(args['utc-offset']) ?? fail('--now 須同時給 --utc-offset（起卦當地的時區，如 8 或 -5），不能用服務器時區代替');
    const off = Number(offArg);
    if (!Number.isFinite(off) || off < -12 || off > 14) fail(`--utc-offset 應為 -12 ~ +14，收到「${offArg}」`);
    const t = new Date(Date.now() + off * 3600_000);
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours(), minute: t.getUTCMinutes(), utcOffset: off };
  }
  const ds = str(args.date) ?? fail('缺少起卦時間：用 --date YYYY-MM-DD --time HH:MM（起卦當下的當地時間），或 --now --utc-offset 8');
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式應為 YYYY-MM-DD，收到「${ds}」`);
  const ts = str(args.time) ?? fail('缺少 --time HH:MM');
  const tm = ts.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式應為 HH:MM，收到「${ts}」`);
  const [y, mo, d, hh, mm] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) fail(`日期不存在：${ds}`);
  if (y < 1901 || y > 2099) fail('年份應在 1901–2099 之間');
  if (hh > 23 || mm > 59) fail(`--time 超出範圍：${ts}`);
  const offArg = str(args['utc-offset']);
  const off = offArg === undefined ? undefined : Number(offArg);
  if (off !== undefined && (!Number.isFinite(off) || off < -12 || off > 14)) fail(`--utc-offset 應為 -12 ~ +14，收到「${offArg}」`);
  return { year: y, month: mo, day: d, hour: hh, minute: mm, utcOffset: off };
}

/** 鐘表小時 → 時支序號（子 0 … 亥 11） */
export const clockBranch = (h: number) => Math.floor(((h + 1) % 24) / 2);
