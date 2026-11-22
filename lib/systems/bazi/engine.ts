/**
 * lib/systems/bazi/engine.ts —— 八字排盤（確定性）
 *
 * 口徑（每一條都會在輸出裡交代，有分歧的地方以「⚠ 假設：」聲明）：
 *   · 年柱、月柱：以出生時刻的**東八區標準時間**對照節氣時刻（立春換年、交節換月）。
 *     節氣是天文時刻，與出生地經度無關；若改用真太陽時會落到另一柱，一併列出。
 *   · 日柱、時柱：以**真太陽時**（經度差 + 均時差，與紫微引擎同一函數）定時辰。
 *   · 晚子時（真太陽時 23:00–24:00）：默認「次日」——日柱按次日、時柱按次日日干起子時；
 *     可選「當天」——日柱留在當天、時柱仍按次日日干起（lunar-javascript 的 sect 2，即夜子時說）。
 *   · 大運：陽年男、陰年女順排，陰年男、陽年女逆排；起運按出生到前 / 後一個「節」的分鐘數精確折算
 *     （三天折一年）。大運歲數為虛歲。
 *   · 時辰不詳：只排年、月、日三柱；年月柱與起運按當天 12:00 估算。
 *
 * 干支、節氣、起運由 lunar-javascript 計算；十神、藏干、干支關係、旺相休囚死由本目錄的表按定義推出。
 * 獨立校驗見 scripts/regression/bazi-engine.test.ts（儒略日推日柱、近似太陽黃經推年月柱）。
 */
import { LunarUtil, Solar } from '../../calendar/lunar';
import { calculateTrueSolarTime, isValidGregorianDate, shiftGregorianDate } from '@/lib/calendar/true-solar-time';
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';
import {
  BRANCHES, BRANCH_CLASH, BRANCH_COMBINE, BRANCH_DIRECTION, BRANCH_HARM, BRANCH_PUNISH_GROUPS,
  BRANCH_SELF_PUNISH, BRANCH_TRINE, BRANCH_WUXING, HIDDEN_STEMS, STEMS, STEM_CLASH, STEM_COMBINE,
  STEM_WUXING, WUXING, controls, generates, ganZhiOf, shiShen,
  type Branch, type ShiShen, type Stem, type WuXing,
} from './constants';

export type LateZishi = 'next-day' | 'same-day';

export interface BaziInput {
  /** 東八區鐘表日期（海外出生請先換算，見 scripts/skill/common.ts） */
  year: number;
  month: number;
  day: number;
  /** 東八區鐘表時間；時辰不詳時為 null */
  clock: { hour: number; minute: number } | null;
  /** 出生地經度（東經為正）；不給則不做真太陽時校正 */
  longitude?: number;
  gender: 'male' | 'female';
  lateZishi?: LateZishi;
  /** 要看的流年（公曆年，以立春換年）；不給則不排流年 */
  liunianYear?: number;
}

export type PillarKey = 'year' | 'month' | 'day' | 'hour';
export const PILLAR_LABEL: Record<PillarKey, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };

export interface Pillar {
  key: PillarKey;
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  /** 天干十神；日柱為「日主」 */
  stemShiShen: ShiShen | '日主';
  hidden: { stem: Stem; shiShen: ShiShen }[];
  naYin: string;
}

export interface Relation {
  kind: '天干五合' | '天干相沖' | '地支六合' | '地支三合' | '地支半合' | '地支三會' | '地支六沖' | '地支三刑' | '地支自刑' | '地支六害';
  /** 參與的位置（如 年柱、日柱、大運、流年） */
  members: string[];
  detail: string;
}

export interface DaYunStep {
  index: number;
  ganZhi: string;
  startYear: number;
  endYear: number;
  /** 虛歲 */
  startAge: number;
  endAge: number;
}

export interface BaziChart {
  pillars: Pillar[];
  dayMaster: { stem: Stem; wuXing: WuXing; yang: boolean };
  /** 日主在月令的旺相休囚死 */
  season: { monthBranch: Branch; seasonWuXing: WuXing; dayMasterState: '旺' | '相' | '休' | '囚' | '死' };
  /** 日主五行在地支藏干中的根 */
  roots: { pillar: PillarKey; branch: Branch; stem: Stem; position: '本氣' | '中氣' | '餘氣' }[];
  /** 五行個數：天干 + 地支本氣；以及天干 + 全部藏干 */
  wuXingCount: { surface: Record<WuXing, number>; withHidden: Record<WuXing, number> };
  /** 十神分組計數（天干，不含日主） */
  shiShenGroups: Record<'比劫' | '食傷' | '財' | '官殺' | '印', number>;
  relations: Relation[];
  xunKong: { day: Branch[]; year: Branch[] };
  yun: {
    forward: boolean;
    start: { years: number; months: number; days: number; hours: number; solar: string };
    steps: DaYunStep[];
  } ;
  liunian?: { year: number; ganZhi: string; daYun: DaYunStep | null; relations: Relation[] };
  /** 排盤所用時刻 */
  time: { standard: string; trueSolar: string | null; corrected: boolean };
  /** 必須轉告的口徑聲明（均以 ASSUMPTION_MARK 開頭）與一般說明 */
  assumptions: string[];
  notes: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (y: number, m: number, d: number, h: number, mi: number) => `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}`;

function shiShenGroup(s: ShiShen): keyof BaziChart['shiShenGroups'] {
  if (s === '比肩' || s === '劫財') return '比劫';
  if (s === '食神' || s === '傷官') return '食傷';
  if (s === '偏財' || s === '正財') return '財';
  if (s === '七殺' || s === '正官') return '官殺';
  return '印';
}

/** 月令當旺之五行：寅卯木、巳午火、申酉金、亥子水、辰戌丑未土 */
export function seasonWuXing(b: Branch): WuXing {
  if (b === '寅' || b === '卯') return '木';
  if (b === '巳' || b === '午') return '火';
  if (b === '申' || b === '酉') return '金';
  if (b === '亥' || b === '子') return '水';
  return '土';
}

/** 旺相休囚死：當令者旺、令所生者相、生令者休、克令者囚、令所克者死 */
export function seasonState(season: WuXing, el: WuXing): '旺' | '相' | '休' | '囚' | '死' {
  if (season === el) return '旺';
  if (generates(season, el)) return '相';
  if (generates(el, season)) return '休';
  if (controls(el, season)) return '囚';
  return '死';
}

/** 旬空：某干支所在旬缺的兩個地支 */
export function xunKongOf(ganZhi: string): Branch[] {
  const s = STEMS.indexOf(ganZhi[0] as Stem);
  const b = BRANCHES.indexOf(ganZhi[1] as Branch);
  const xunStartBranch = (b - s + 12) % 12;
  return [BRANCHES[(xunStartBranch + 10) % 12], BRANCHES[(xunStartBranch + 11) % 12]];
}

function makePillar(key: PillarKey, gz: string, dayStem: Stem): Pillar {
  const stem = gz[0] as Stem;
  const branch = gz[1] as Branch;
  return {
    key, ganZhi: gz, stem, branch,
    stemShiShen: key === 'day' ? '日主' : shiShen(dayStem, stem),
    hidden: HIDDEN_STEMS[branch].map(h => ({ stem: h, shiShen: shiShen(dayStem, h) })),
    naYin: LunarUtil.NAYIN[gz] ?? '',
  };
}

/** 找出一組（位置, 干支）之間的干支關係；只列成立的組合，不判斷合化成敗 */
export function findRelations(items: { label: string; ganZhi: string }[]): Relation[] {
  const out: Relation[] = [];
  const stems = items.map(i => ({ label: i.label, v: i.ganZhi[0] as Stem }));
  const branches = items.map(i => ({ label: i.label, v: i.ganZhi[1] as Branch }));
  const pairs = <T,>(arr: { label: string; v: T }[]) => {
    const r: [{ label: string; v: T }, { label: string; v: T }][] = [];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) r.push([arr[i], arr[j]]);
    return r;
  };
  const isPair = <T,>(a: T, b: T, x: T, y: T) => (a === x && b === y) || (a === y && b === x);

  for (const [a, b] of pairs(stems)) {
    for (const [x, y, el] of STEM_COMBINE) if (isPair(a.v, b.v, x, y)) out.push({ kind: '天干五合', members: [a.label, b.label], detail: `${a.v}${b.v}合（化${el}，能否合化另看月令等條件）` });
    for (const [x, y] of STEM_CLASH) if (isPair(a.v, b.v, x, y)) out.push({ kind: '天干相沖', members: [a.label, b.label], detail: `${a.v}${b.v}沖` });
  }
  for (const [a, b] of pairs(branches)) {
    for (const [x, y, el] of BRANCH_COMBINE) if (isPair(a.v, b.v, x, y)) out.push({ kind: '地支六合', members: [a.label, b.label], detail: `${a.v}${b.v}合${el ? `（化${el}）` : '（午未合，化神諸書不一）'}` });
    for (const [x, y] of BRANCH_CLASH) if (isPair(a.v, b.v, x, y)) out.push({ kind: '地支六沖', members: [a.label, b.label], detail: `${a.v}${b.v}沖` });
    for (const [x, y] of BRANCH_HARM) if (isPair(a.v, b.v, x, y)) out.push({ kind: '地支六害', members: [a.label, b.label], detail: `${a.v}${b.v}害` });
    if (a.v === b.v && BRANCH_SELF_PUNISH.includes(a.v)) out.push({ kind: '地支自刑', members: [a.label, b.label], detail: `${a.v}${a.v}自刑` });
  }
  const groupHits = (members: Branch[]) => members.map(m => branches.filter(b => b.v === m));
  for (const [x, y, z, el] of BRANCH_TRINE) {
    const hits = groupHits([x, y, z]);
    if (hits.every(h => h.length)) {
      out.push({ kind: '地支三合', members: hits.flat().map(h => h.label), detail: `${x}${y}${z}三合${el}局` });
    } else if (hits[1].length && (hits[0].length || hits[2].length)) {
      const other = hits[0].length ? hits[0] : hits[2];
      out.push({ kind: '地支半合', members: [...hits[1], ...other].map(h => h.label), detail: `${hits[0].length ? x : z}${y}半合${el}（含中神${y}；半合是否成局各派看法不一）` });
    }
  }
  for (const [x, y, z, el] of BRANCH_DIRECTION) {
    const hits = groupHits([x, y, z]);
    if (hits.every(h => h.length)) out.push({ kind: '地支三會', members: hits.flat().map(h => h.label), detail: `${x}${y}${z}三會${el}方` });
  }
  for (const g of BRANCH_PUNISH_GROUPS) {
    const hits = groupHits(g.members);
    const present = hits.filter(h => h.length);
    if (g.members.length === 2 ? present.length === 2 : present.length >= 2) {
      const which = g.members.filter((_, i) => hits[i].length).join('');
      out.push({
        kind: '地支三刑', members: present.flat().map(h => h.label),
        detail: `${which}刑（${g.name}${g.members.length === 3 && present.length === 2 ? '，三刑只見其二' : ''}）`,
      });
    }
  }
  return out;
}

function emptyCount(): Record<WuXing, number> {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
}

export function computeBazi(input: BaziInput): BaziChart {
  if (!isValidGregorianDate(input.year, input.month, input.day)) {
    throw new RangeError(`公曆日期不存在：${input.year}-${input.month}-${input.day}`);
  }
  if (input.year < 1901 || input.year > 2099) throw new RangeError(`年份應在 1901–2099 之間，收到 ${input.year}`);
  if (input.clock && !(input.clock.hour >= 0 && input.clock.hour < 24 && input.clock.minute >= 0 && input.clock.minute < 60)) {
    throw new RangeError(`時間超出範圍：${input.clock.hour}:${input.clock.minute}`);
  }
  const assumptions: string[] = [];
  const notes: string[] = [];
  const lateZishi = input.lateZishi ?? 'next-day';
  const known = input.clock !== null;
  const stdH = known ? input.clock!.hour : 12;
  const stdM = known ? input.clock!.minute : 0;
  const std = Solar.fromYmdHms(input.year, input.month, input.day, stdH, stdM, 0);
  const ecStd = std.getLunar().getEightChar();

  // ── 年柱、月柱：標準時間對節氣 ──
  const yearGz = ecStd.getYear();
  const monthGz = ecStd.getMonth();

  // ── 日柱、時柱：真太陽時 ──
  let dayGz: string;
  let hourGz: string | null = null;
  let trueSolarText: string | null = null;
  let corrected = false;
  if (known) {
    const tst = calculateTrueSolarTime({
      year: input.year, month: input.month, day: input.day,
      clockHour: stdH, clockMinute: stdM, longitude: input.longitude, utcOffsetMinutes: 480,
    });
    corrected = tst.corrected;
    const d = shiftGregorianDate({ year: input.year, month: input.month, day: input.day }, tst.dayOffset);
    trueSolarText = fmt(d.year, d.month, d.day, tst.hour, tst.minute);
    const ecTst = Solar.fromYmdHms(d.year, d.month, d.day, tst.hour, tst.minute, 0).getLunar().getEightChar();
    ecTst.setSect(lateZishi === 'next-day' ? 1 : 2);
    dayGz = ecTst.getDay();
    hourGz = ecTst.getTime();
    if (tst.hour === 23) {
      assumptions.push(lateZishi === 'next-day'
        ? `${ASSUMPTION_MARK}出生在晚子時（真太陽時 23 點後），按「次日」排日柱（${dayGz}）；另一派「夜子時」日柱留在當天，結果會不同，可用 --zishi same-day 對照。`
        : `${ASSUMPTION_MARK}出生在晚子時，按「夜子時」日柱留在當天（${dayGz}），時柱仍按次日日干起；通行另一派按次日排日柱。`);
    }
    // 真太陽時若跨過節氣，年 / 月柱會不同：列出供對照
    const ecAlt = Solar.fromYmdHms(d.year, d.month, d.day, tst.hour, tst.minute, 0).getLunar().getEightChar();
    if (ecAlt.getYear() !== yearGz || ecAlt.getMonth() !== monthGz) {
      assumptions.push(`${ASSUMPTION_MARK}出生時刻貼近節氣：按標準時間對節氣，年月柱為 ${yearGz} ${monthGz}；若按真太陽時對節氣則為 ${ecAlt.getYear()} ${ecAlt.getMonth()}。本盤採用前者（節氣是天文時刻，與經度無關）。`);
    }
  } else {
    const ec = Solar.fromYmdHms(input.year, input.month, input.day, 12, 0, 0).getLunar().getEightChar();
    dayGz = ec.getDay();
    assumptions.push(`${ASSUMPTION_MARK}出生時辰不詳，只排年、月、日三柱；年月柱與起運按當天 12:00 估算，時柱及一切依賴時柱的判斷都不做。`);
  }

  // 離節氣太近時提醒：出生時間差幾分鐘就會換月柱
  const lunar = std.getLunar();
  const prev = lunar.getPrevJie(false).getSolar();
  const next = lunar.getNextJie(false).getSolar();
  const toPrev = std.subtractMinute(prev);
  const toNext = next.subtractMinute(std);
  const near = Math.min(toPrev, toNext);
  if (known && near <= 120) {
    const which = toPrev <= toNext ? lunar.getPrevJie(false) : lunar.getNextJie(false);
    assumptions.push(`${ASSUMPTION_MARK}出生時刻距${which.getName()}（${which.getSolar().toYmdHms().slice(0, 16)}）僅 ${near} 分鐘，月柱${which.getName() === '立春' ? '與年柱' : ''}對出生時間非常敏感，請確認出生時間是否準確。`);
  }

  const dayStem = dayGz[0] as Stem;
  const pillars: Pillar[] = [
    makePillar('year', yearGz, dayStem),
    makePillar('month', monthGz, dayStem),
    makePillar('day', dayGz, dayStem),
    ...(hourGz ? [makePillar('hour', hourGz, dayStem)] : []),
  ];

  // ── 月令、根、五行、十神 ──
  const monthBranch = monthGz[1] as Branch;
  const sw = seasonWuXing(monthBranch);
  const dmWx = STEM_WUXING[dayStem];
  const roots: BaziChart['roots'] = [];
  const positions = ['本氣', '中氣', '餘氣'] as const;
  for (const p of pillars) {
    HIDDEN_STEMS[p.branch].forEach((h, i) => {
      if (STEM_WUXING[h] === dmWx) roots.push({ pillar: p.key, branch: p.branch, stem: h, position: positions[i] });
    });
  }
  const surface = emptyCount();
  const withHidden = emptyCount();
  for (const p of pillars) {
    surface[STEM_WUXING[p.stem]]++;
    surface[BRANCH_WUXING[p.branch]]++;
    withHidden[STEM_WUXING[p.stem]]++;
    for (const h of HIDDEN_STEMS[p.branch]) withHidden[STEM_WUXING[h]]++;
  }
  const shiShenGroups = { 比劫: 0, 食傷: 0, 財: 0, 官殺: 0, 印: 0 };
  for (const p of pillars) if (p.stemShiShen !== '日主') shiShenGroups[shiShenGroup(p.stemShiShen)]++;

  // ── 大運 ──
  const yun = ecStd.getYun(input.gender === 'male' ? 1 : 0, 2);
  const steps: DaYunStep[] = yun.getDaYun(10).filter(d => d.getIndex() > 0).map(d => ({
    index: d.getIndex(), ganZhi: d.getGanZhi(),
    startYear: d.getStartYear(), endYear: d.getEndYear(), startAge: d.getStartAge(), endAge: d.getEndAge(),
  }));

  const natalItems = pillars.map(p => ({ label: PILLAR_LABEL[p.key], ganZhi: p.ganZhi }));
  const chart: BaziChart = {
    pillars,
    dayMaster: { stem: dayStem, wuXing: dmWx, yang: STEMS.indexOf(dayStem) % 2 === 0 },
    season: { monthBranch, seasonWuXing: sw, dayMasterState: seasonState(sw, dmWx) },
    roots,
    wuXingCount: { surface, withHidden },
    shiShenGroups,
    relations: findRelations(natalItems),
    xunKong: { day: xunKongOf(dayGz), year: xunKongOf(yearGz) },
    yun: {
      forward: yun.isForward(),
      start: {
        years: yun.getStartYear(), months: yun.getStartMonth(), days: yun.getStartDay(), hours: yun.getStartHour(),
        solar: yun.getStartSolar().toYmdHms().slice(0, 10),
      },
      steps,
    },
    time: {
      standard: fmt(input.year, input.month, input.day, stdH, stdM),
      trueSolar: trueSolarText,
      corrected,
    },
    assumptions,
    notes,
  };
  if (!known) notes.push('起運時刻按當天 12:00 估算，實際可差數月');

  if (input.liunianYear !== undefined) {
    const y = input.liunianYear;
    const gz = ganZhiOf(y - 4);
    const dy = steps.find(s => s.startYear <= y && y <= s.endYear) ?? null;
    const items = [...natalItems, ...(dy ? [{ label: '大運', ganZhi: dy.ganZhi }] : []), { label: '流年', ganZhi: gz }];
    chart.liunian = {
      year: y, ganZhi: gz, daYun: dy,
      relations: findRelations(items).filter(r => r.members.includes('流年') || r.members.includes('大運')),
    };
  }
  return chart;
}

export { WUXING };
