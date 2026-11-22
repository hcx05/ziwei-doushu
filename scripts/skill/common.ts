/**
 * scripts/skill/common.ts —— 各 Skill 命令行工具共用的参数解析与出生资料处理
 *
 * 出生资料统一换算成「东八区钟表时间 + 出生地经度」，真太阳时校正由各体系引擎自己做
 * （紫微：lib/systems/ziwei/share.ts；八字：lib/systems/bazi/engine.ts），两边同一口径。
 */
import { PROVINCES } from '../../lib/calendar/cities';
import { isChinaDST } from '../../lib/calendar/dst-cn';
import { isValidLunarDate, lunarToSolar } from '../../lib/calendar/lunar-solar';
import { shiftGregorianDate } from '../../lib/calendar/true-solar-time';
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
  console.error(`错误：${msg}`);
  process.exit(2);
}

export const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export function findCity(name: string): { province: string; city: string; longitude: number } | null {
  const n = name.replace(/[市县区]$/, '');
  const hits: { province: string; city: string; longitude: number }[] = [];
  for (const p of PROVINCES) {
    for (const c of p.cities) {
      if (c.name === name || c.name.replace(/[市县区]$/, '') === n) {
        hits.push({ province: p.name, city: c.name, longitude: c.longitude });
      }
    }
    if (p.name.replace(/[省市]$/, '') === n && p.cities.length) {
      hits.push({ province: p.name, city: p.cities[0].name, longitude: p.cities[0].longitude });
    }
  }
  return hits[0] ?? null;
}

/** 解析出生参数（公历 / 农历、钟表时间、海外时区、出生地），换算成东八区钟表时间；notes 为要转告的说明 */
export function parseBirthArgs(args: Args): { form: BirthFormState; notes: string[] } {
  const date = str(args.date) ?? fail('缺少 --date YYYY-MM-DD（出生日期）');
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式应为 YYYY-MM-DD，收到「${date}」`);
  let [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];

  if (args.lunar) {
    const leap = !!args.leap;
    if (!isValidLunarDate(y, mo, d, leap)) fail(`农历 ${y}年${leap ? '闰' : ''}${mo}月${d}日 不存在`);
    const solar = lunarToSolar(y, mo, d, leap) ?? fail('农历转公历失败');
    [y, mo, d] = [solar.year, solar.month, solar.day];
  }

  const g = str(args.gender) ?? fail('缺少 --gender（男 / 女）');
  const gender = /^(男|m|male)$/i.test(g) ? 'male' : /^(女|f|female)$/i.test(g) ? 'female' : fail(`--gender 无法识别：${g}`);

  const unknownTime = !!args['unknown-time'];
  let clockHour = '', clockMinute = '';
  if (!unknownTime) {
    const t = str(args.time) ?? fail('缺少 --time HH:MM；不知道出生时间请改用 --unknown-time');
    const tm = t.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式应为 HH:MM，收到「${t}」`);
    let minutes = Number(tm[1]) * 60 + Number(tm[2]);
    if (minutes >= 1440) fail(`--time 超出范围：${t}`);
    // 海外出生：把当地钟表时间换成东八区时间（经度另给 --longitude），引擎按 120° 基准做真太阳时
    const offArg = str(args['utc-offset']);
    if (offArg) {
      const off = Number(offArg);
      if (!Number.isFinite(off) || off < -12 || off > 14) fail(`--utc-offset 应为 -12 ~ +14 的小时数，收到「${offArg}」`);
      if (!str(args.longitude)) fail('海外出生请同时给 --longitude（出生地经度，西经为负），否则无法做真太阳时校正');
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
    if (!Number.isFinite(longitude)) fail(`--longitude 不是数字：${lonArg}`);
    province = '自填经度';
    city = cityArg ?? '';
  } else if (cityArg) {
    const hit = findCity(cityArg) ?? fail(`找不到城市「${cityArg}」，请改用 --longitude 直接给经度（东经为正）`);
    ({ province, city, longitude } = hit);
  }

  const form: BirthFormState = {
    name: '', year: String(y), month: String(mo), day: String(d),
    clockHour, clockMinute, unknownTime, province, city, longitude, gender,
  };

  const notes: string[] = [];
  if (args.lunar) notes.push(`农历输入已换算为公历 ${y}-${mo}-${d}`);
  if (str(args['utc-offset'])) notes.push(`当地时间（UTC${Number(args['utc-offset']) >= 0 ? '+' : ''}${args['utc-offset']}）已换算为东八区 ${y}-${mo}-${d} ${clockHour}:${clockMinute.padStart(2, '0')} 再排盘`);
  if (province) notes.push(`已按出生地经度 ${longitude}° 做真太阳时校正（${province}${city ? ' ' + city : ''}）`);
  else if (!unknownTime) notes.push('未给出生地：按东经 120° 钟表时间排盘，未做真太阳时校正');
  if (!unknownTime && !str(args['utc-offset']) && isChinaDST(y, mo, d)) {
    notes.push('⚠ 该日期处于中国夏令时期间：若给的是当时的钟表时间，应先减 1 小时再排；请向命主确认，不要自行假设');
  }
  return { form, notes };
}


/** check 子命令的共用部分：读草稿（--file 或标准输入），--fix 输出补标版本，否则报告缺漏并以非零退出 */
export function runCheck(args: Args, sections: SectionSpec[]): void {
  const text = typeof args.file === 'string' ? readFileSync(args.file, 'utf8') : readFileSync(0, 'utf8');
  if (args.fix) {
    process.stdout.write(enforceMarks(text, sections));
    return;
  }
  const r = checkMarks(text, sections);
  if (r.ok) { console.log('✓ 溯因节都已标注，篇幅也在限制内。'); return; }
  if (r.unmarkedAbduction.length) console.log(`✗ 这些溯因节第一行没有以「${UNCERTAINTY_MARK}」开头：${r.unmarkedAbduction.join('、')}`);
  if (r.tooLongAbduction.length) console.log(`✗ 这些溯因节超过 ${ABDUCTION_MAX_LINES} 行（只写结论与「另一种读法」，不列讯号、不贴过程）：${r.tooLongAbduction.join('、')}`);
  process.exitCode = 1;
}


// ── 起卦（起课）时刻：六爻、梅花、六壬共用 ─────────────────

/** --date/--time（当地时间，可加 --utc-offset）或 --now --utc-offset */
export function parseMoment(args: Args): CastMoment {
  if (args.now) {
    const offArg = str(args['utc-offset']) ?? fail('--now 须同时给 --utc-offset（起卦当地的时区，如 8 或 -5），不能用服务器时区代替');
    const off = Number(offArg);
    if (!Number.isFinite(off) || off < -12 || off > 14) fail(`--utc-offset 应为 -12 ~ +14，收到「${offArg}」`);
    const t = new Date(Date.now() + off * 3600_000);
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours(), minute: t.getUTCMinutes(), utcOffset: off };
  }
  const ds = str(args.date) ?? fail('缺少起卦时间：用 --date YYYY-MM-DD --time HH:MM（起卦当下的当地时间），或 --now --utc-offset 8');
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式应为 YYYY-MM-DD，收到「${ds}」`);
  const ts = str(args.time) ?? fail('缺少 --time HH:MM');
  const tm = ts.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式应为 HH:MM，收到「${ts}」`);
  const [y, mo, d, hh, mm] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) fail(`日期不存在：${ds}`);
  if (y < 1901 || y > 2099) fail('年份应在 1901–2099 之间');
  if (hh > 23 || mm > 59) fail(`--time 超出范围：${ts}`);
  const offArg = str(args['utc-offset']);
  const off = offArg === undefined ? undefined : Number(offArg);
  if (off !== undefined && (!Number.isFinite(off) || off < -12 || off > 14)) fail(`--utc-offset 应为 -12 ~ +14，收到「${offArg}」`);
  return { year: y, month: mo, day: d, hour: hh, minute: mm, utcOffset: off };
}

/** 钟表小时 → 时支序号（子 0 … 亥 11） */
export const clockBranch = (h: number) => Math.floor(((h + 1) % 24) / 2);
