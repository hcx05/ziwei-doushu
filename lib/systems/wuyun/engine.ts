/**
 * lib/systems/wuyun/engine.ts —— 五运六气（《素问》运气七篇的查表部分）
 *
 * 全部是按定义查表与推算，不含任何判断：
 *   · 岁运（中运）：甲己土、乙庚金、丙辛水、丁壬木、戊癸火；阳干太过、阴干不及；
 *   · 主运五步：恒为木火土金水（角徵宫商羽），太少按「太少相生」由岁运那一步推出；
 *   · 客运五步：初运即岁运，按五行相生顺推，太少相生；
 *   · 司天：子午少阴君火、丑未太阴湿土、寅申少阳相火、卯酉阳明燥金、辰戌太阳寒水、巳亥厥阴风木；
 *     客气六步依三阴三阳次序（厥阴→少阴→太阴→少阳→阳明→太阳），三之气为司天，终之气为在泉；
 *   · 主气六步恒为：厥阴风木、少阴君火、少阳相火、太阴湿土、阳明燥金、太阳寒水；
 *   · 运气同化：天符、岁会、太乙天符、同天符、同岁会；运气关系：顺化、天刑、小逆、不和、天符；
 *   · 客主加临：主胜逆、客胜从；君位臣则顺、臣位君则逆。
 * 日期：运气年以大寒交司（通行口径），六步以大寒、春分、小满、大暑、秋分、小雪为界，
 *       五运每步按全年五等分（约七十三日五刻）。节气时刻取自 lunar-javascript（北京时间）。
 */
import { Solar } from 'lunar-javascript';
import { BRANCHES, BRANCH_WUXING, STEMS, WUXING, controls, generates, ganZhiOf, type Branch, type Stem, type WuXing } from '../bazi/constants';
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';

export const YIN_OF: Record<WuXing, string> = { 木: '角', 火: '徵', 土: '宫', 金: '商', 水: '羽' };

/** 十干化运 */
export const STEM_YUN: Record<Stem, WuXing> = {
  甲: '土', 己: '土', 乙: '金', 庚: '金', 丙: '水', 辛: '水', 丁: '木', 壬: '木', 戊: '火', 癸: '火',
};

export interface Qi { name: string; short: string; wuXing: WuXing }
/** 三阴三阳次序（客气按此顺推） */
export const SIX_QI: Qi[] = [
  { name: '厥阴风木', short: '厥阴', wuXing: '木' },
  { name: '少阴君火', short: '少阴', wuXing: '火' },
  { name: '太阴湿土', short: '太阴', wuXing: '土' },
  { name: '少阳相火', short: '少阳', wuXing: '火' },
  { name: '阳明燥金', short: '阳明', wuXing: '金' },
  { name: '太阳寒水', short: '太阳', wuXing: '水' },
];
/** 主气六步（次序与客气不同：少阳在太阴之前） */
export const ZHU_QI: Qi[] = [0, 1, 3, 2, 4, 5].map(i => SIX_QI[i]);
/** 年支 → 司天（SIX_QI 序号）：子午少阴、丑未太阴、寅申少阳、卯酉阳明、辰戌太阳、巳亥厥阴 */
export const siTianIndex = (b: Branch) => (BRANCHES.indexOf(b) % 6 + 1) % 6;

/** 岁会：运与年支同气且年支居本位（木卯、火午、金酉、水子、土辰戌丑未） */
const SUIHUI_BRANCH: Record<WuXing, Branch[]> = { 木: ['卯'], 火: ['午'], 土: ['辰', '戌', '丑', '未'], 金: ['酉'], 水: ['子'] };

/** 六步交司节气；五运传统口径（与五等分推算相近） */
export const QI_STEP_JIEQI = ['大寒', '春分', '小满', '大暑', '秋分', '小雪'];
export const YUN_STEP_TRADITION = ['大寒日', '春分后十三日', '芒种后十日', '处暑后七日', '立冬后四日'];
const STEP_NAMES = ['初之气', '二之气', '三之气', '四之气', '五之气', '终之气'];
const YUN_STEP_NAMES = ['初运', '二运', '三运', '四运', '五运'];

export type YunQiRelation = '天符' | '顺化' | '天刑' | '小逆' | '不和';
/** 司天之气与岁运的五行关系（《素问·六元正纪大论》、张景岳《类经》口径） */
export function yunQiRelation(yun: WuXing, qi: WuXing): YunQiRelation {
  if (yun === qi) return '天符';
  if (generates(qi, yun)) return '顺化';
  if (controls(qi, yun)) return '天刑';
  if (generates(yun, qi)) return '小逆';
  return '不和';
}
export const RELATION_NOTE: Record<YunQiRelation, string> = {
  天符: '司天之气与岁运五行相同',
  顺化: '气生运',
  天刑: '气克运',
  小逆: '运生气',
  不和: '运克气',
};

/** 客主加临：客气加于主气之上 */
export function keZhuRelation(ke: Qi, zhu: Qi): string {
  if (ke.name === zhu.name) return '客主同气';
  if (ke.short === '少阴' && zhu.short === '少阳') return '君位臣：顺（《素问·六微旨大论》「君位臣则顺」）';
  if (ke.short === '少阳' && zhu.short === '少阴') return '臣位君：逆（「臣位君则逆」）';
  if (controls(ke.wuXing, zhu.wuXing)) return '客胜主：从（《素问·至真要大论》「客胜从」）';
  if (controls(zhu.wuXing, ke.wuXing)) return '主胜客：逆（「主胜逆」）';
  if (generates(ke.wuXing, zhu.wuXing)) return '客生主：相得';
  if (generates(zhu.wuXing, ke.wuXing)) return '主生客：相得';
  return '同气（君相二火）：相得';
}

export interface YunStep { name: string; wuXing: WuXing; yin: string; tai: boolean; label: string }
export interface Span { start: string; end: string }

export interface WuyunYear {
  year: number;
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  /** 岁运（中运） */
  suiYun: { wuXing: WuXing; excess: boolean; label: string };
  zhuYun: (YunStep & Span & { tradition: string })[];
  keYun: (YunStep & Span)[];
  siTian: Qi;
  zaiQuan: Qi;
  steps: { name: string; zhu: Qi; ke: Qi; relation: string; jieQi: string; start: string; end: string }[];
  tongHua: string[];
  relation: { kind: YunQiRelation; note: string };
  /** 运气年起止（大寒交司，北京时间） */
  span: Span;
  assumptions: string[];
}

function jieQiTime(year: number, name: '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪'): Solar {
  const t = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
  return t[name];
}
const fmt = (s: Solar) => s.toYmdHms().slice(0, 16);
const addDays = (s: Solar, days: number): Solar => {
  const ms = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute()) + days * 86400_000;
  const d = new Date(ms);
  return Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0);
};
const minutesBetween = (a: Solar, b: Solar) => b.subtractMinute(a);

/** 太少相生：从岁运那一步出发，相邻各步太少交替 */
const taiAt = (excess: boolean, offset: number) => (Math.abs(offset) % 2 === 0 ? excess : !excess);
const stepLabel = (wx: WuXing, tai: boolean) => `${tai ? '太' : '少'}${YIN_OF[wx]}`;

/** 运气年 Y：自 Y 年大寒起，至 Y+1 年大寒止；干支取 Y 年（立春后）的年干支 */
export function computeWuyun(year: number): WuyunYear {
  if (!Number.isInteger(year) || year < 1901 || year > 2098) throw new Error('年份应在 1901–2098 之间');
  const ganZhi = ganZhiOf(year - 4);
  const stem = ganZhi[0] as Stem;
  const branch = ganZhi[1] as Branch;
  const yunWx = STEM_YUN[stem];
  const excess = STEMS.indexOf(stem) % 2 === 0;
  const yunIdx = WUXING.indexOf(yunWx);

  const start = jieQiTime(year, '大寒');
  const end = jieQiTime(year + 1, '大寒');
  const yunLen = minutesBetween(start, end) / 5 / 1440;
  const yunSpan = (k: number): Span => ({ start: fmt(addDays(start, yunLen * k)), end: fmt(k === 4 ? end : addDays(start, yunLen * (k + 1))) });

  const zhuYun = WUXING.map((wx, j) => {
    const tai = taiAt(excess, j - yunIdx);
    return { name: YUN_STEP_NAMES[j], wuXing: wx, yin: YIN_OF[wx], tai, label: stepLabel(wx, tai), ...yunSpan(j), tradition: YUN_STEP_TRADITION[j] };
  });
  const keYun = [0, 1, 2, 3, 4].map(k => {
    const wx = WUXING[(yunIdx + k) % 5];
    const tai = taiAt(excess, k);
    return { name: YUN_STEP_NAMES[k], wuXing: wx, yin: YIN_OF[wx], tai, label: stepLabel(wx, tai), ...yunSpan(k) };
  });

  const st = siTianIndex(branch);
  const siTian = SIX_QI[st];
  const zaiQuan = SIX_QI[(st + 3) % 6];
  const bounds = [...QI_STEP_JIEQI.map(n => jieQiTime(year, n as '大寒')), end];
  const steps = STEP_NAMES.map((name, k) => {
    const ke = SIX_QI[(st - 2 + k + 6) % 6];
    const zhu = ZHU_QI[k];
    return { name, zhu, ke, relation: keZhuRelation(ke, zhu), jieQi: QI_STEP_JIEQI[k], start: fmt(bounds[k]), end: fmt(bounds[k + 1]) };
  });

  const tianFu = yunWx === siTian.wuXing;
  const suiHui = SUIHUI_BRANCH[yunWx].includes(branch) && BRANCH_WUXING[branch] === yunWx;
  const tongHua: string[] = [];
  if (tianFu && suiHui) tongHua.push('太乙天符（既是天符又是岁会）');
  else if (tianFu) tongHua.push('天符（岁运与司天之气同）');
  else if (suiHui) tongHua.push('岁会（岁运与年支本位之气同）');
  if (zaiQuan.wuXing === yunWx) tongHua.push(excess ? '同天符（太过之运与在泉之气同）' : '同岁会（不及之运与在泉之气同）');

  const kind = yunQiRelation(yunWx, siTian.wuXing);
  return {
    year, ganZhi, stem, branch,
    suiYun: { wuXing: yunWx, excess, label: `${yunWx}运${excess ? '太过' : '不及'}（${stepLabel(yunWx, excess)}）` },
    zhuYun, keYun, siTian, zaiQuan, steps, tongHua,
    relation: { kind, note: RELATION_NOTE[kind] },
    span: { start: fmt(start), end: fmt(end) },
    assumptions: [],
  };
}

/** 某一公历日期（北京时间）落在哪个运气年、哪一运、哪一气 */
export function locateDate(y: number, m: number, d: number, hour = 12, minute = 0): { chart: WuyunYear; yunStep: number; qiStep: number } {
  const at = Solar.fromYmdHms(y, m, d, hour, minute, 0);
  const daHan = jieQiTime(y, '大寒');
  const wyYear = minutesBetween(daHan, at) >= 0 ? y : y - 1;
  const chart = computeWuyun(wyYear);
  const ts = fmt(at);
  const yunStep = chart.zhuYun.findIndex(s => ts >= s.start && ts < s.end);
  const qiStep = chart.steps.findIndex(s => ts >= s.start && ts < s.end);
  const liChun = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable()['立春'];
  if (wyYear === y && minutesBetween(at, liChun) > 0) {
    chart.assumptions.push(`${ASSUMPTION_MARK}${ts} 在大寒之后、立春之前：运气年按通行口径以大寒交司，已算作 ${chart.ganZhi} 年；此时年干支（以立春为界）仍是上一年，也有人主张运气以立春为始，结论会不同。`);
  }
  return { chart, yunStep, qiStep };
}
