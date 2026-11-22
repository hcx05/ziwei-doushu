/**
 * lib/systems/wuyun/engine.ts —— 五運六氣（《素問》運氣七篇的查表部分）
 *
 * 全部是按定義查表與推算，不含任何判斷：
 *   · 歲運（中運）：甲己土、乙庚金、丙辛水、丁壬木、戊癸火；陽干太過、陰干不及；
 *   · 主運五步：恆為木火土金水（角徵宮商羽），太少按「太少相生」由歲運那一步推出；
 *   · 客運五步：初運即歲運，按五行相生順推，太少相生；
 *   · 司天：子午少陰君火、丑未太陰溼土、寅申少陽相火、卯酉陽明燥金、辰戌太陽寒水、巳亥厥陰風木；
 *     客氣六步依三陰三陽次序（厥陰→少陰→太陰→少陽→陽明→太陽），三之氣為司天，終之氣為在泉；
 *   · 主氣六步恆為：厥陰風木、少陰君火、少陽相火、太陰溼土、陽明燥金、太陽寒水；
 *   · 運氣同化：天符、歲會、太乙天符、同天符、同歲會；運氣關係：順化、天刑、小逆、不和、天符；
 *   · 客主加臨：主勝逆、客勝從；君位臣則順、臣位君則逆。
 * 日期：運氣年以大寒交司（通行口徑），六步以大寒、春分、小滿、大暑、秋分、小雪為界，
 *       五運每步按全年五等分（約七十三日五刻）。節氣時刻取自 lunar-javascript（北京時間）。
 */
import { Solar } from '../../calendar/lunar';
import { BRANCHES, BRANCH_WUXING, STEMS, WUXING, controls, generates, ganZhiOf, type Branch, type Stem, type WuXing } from '../bazi/constants';
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';

export const YIN_OF: Record<WuXing, string> = { 木: '角', 火: '徵', 土: '宮', 金: '商', 水: '羽' };

/** 十干化運 */
export const STEM_YUN: Record<Stem, WuXing> = {
  甲: '土', 己: '土', 乙: '金', 庚: '金', 丙: '水', 辛: '水', 丁: '木', 壬: '木', 戊: '火', 癸: '火',
};

export interface Qi { name: string; short: string; wuXing: WuXing }
/** 三陰三陽次序（客氣按此順推） */
export const SIX_QI: Qi[] = [
  { name: '厥陰風木', short: '厥陰', wuXing: '木' },
  { name: '少陰君火', short: '少陰', wuXing: '火' },
  { name: '太陰溼土', short: '太陰', wuXing: '土' },
  { name: '少陽相火', short: '少陽', wuXing: '火' },
  { name: '陽明燥金', short: '陽明', wuXing: '金' },
  { name: '太陽寒水', short: '太陽', wuXing: '水' },
];
/** 主氣六步（次序與客氣不同：少陽在太陰之前） */
export const ZHU_QI: Qi[] = [0, 1, 3, 2, 4, 5].map(i => SIX_QI[i]);
/** 年支 → 司天（SIX_QI 序號）：子午少陰、丑未太陰、寅申少陽、卯酉陽明、辰戌太陽、巳亥厥陰 */
export const siTianIndex = (b: Branch) => (BRANCHES.indexOf(b) % 6 + 1) % 6;

/** 歲會：運與年支同氣且年支居本位（木卯、火午、金酉、水子、土辰戌丑未） */
const SUIHUI_BRANCH: Record<WuXing, Branch[]> = { 木: ['卯'], 火: ['午'], 土: ['辰', '戌', '丑', '未'], 金: ['酉'], 水: ['子'] };

/** 六步交司節氣；五運傳統口徑（與五等分推算相近） */
export const QI_STEP_JIEQI = ['大寒', '春分', '小滿', '大暑', '秋分', '小雪'];
export const YUN_STEP_TRADITION = ['大寒日', '春分後十三日', '芒種後十日', '處暑後七日', '立冬後四日'];
const STEP_NAMES = ['初之氣', '二之氣', '三之氣', '四之氣', '五之氣', '終之氣'];
const YUN_STEP_NAMES = ['初運', '二運', '三運', '四運', '五運'];

export type YunQiRelation = '天符' | '順化' | '天刑' | '小逆' | '不和';
/** 司天之氣與歲運的五行關係（《素問·六元正紀大論》、張景岳《類經》口徑） */
export function yunQiRelation(yun: WuXing, qi: WuXing): YunQiRelation {
  if (yun === qi) return '天符';
  if (generates(qi, yun)) return '順化';
  if (controls(qi, yun)) return '天刑';
  if (generates(yun, qi)) return '小逆';
  return '不和';
}
export const RELATION_NOTE: Record<YunQiRelation, string> = {
  天符: '司天之氣與歲運五行相同',
  順化: '氣生運',
  天刑: '氣克運',
  小逆: '運生氣',
  不和: '運克氣',
};

/** 客主加臨：客氣加於主氣之上 */
export function keZhuRelation(ke: Qi, zhu: Qi): string {
  if (ke.name === zhu.name) return '客主同氣';
  if (ke.short === '少陰' && zhu.short === '少陽') return '君位臣：順（《素問·六微旨大論》「君位臣則順」）';
  if (ke.short === '少陽' && zhu.short === '少陰') return '臣位君：逆（「臣位君則逆」）';
  if (controls(ke.wuXing, zhu.wuXing)) return '客勝主：從（《素問·至真要大論》「客勝從」）';
  if (controls(zhu.wuXing, ke.wuXing)) return '主勝客：逆（「主勝逆」）';
  if (generates(ke.wuXing, zhu.wuXing)) return '客生主：相得';
  if (generates(zhu.wuXing, ke.wuXing)) return '主生客：相得';
  return '同氣（君相二火）：相得';
}

export interface YunStep { name: string; wuXing: WuXing; yin: string; tai: boolean; label: string }
export interface Span { start: string; end: string }

export interface WuyunYear {
  year: number;
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  /** 歲運（中運） */
  suiYun: { wuXing: WuXing; excess: boolean; label: string };
  zhuYun: (YunStep & Span & { tradition: string })[];
  keYun: (YunStep & Span)[];
  siTian: Qi;
  zaiQuan: Qi;
  steps: { name: string; zhu: Qi; ke: Qi; relation: string; jieQi: string; start: string; end: string }[];
  tongHua: string[];
  relation: { kind: YunQiRelation; note: string };
  /** 運氣年起止（大寒交司，北京時間） */
  span: Span;
  assumptions: string[];
}

function jieQiTime(year: number, name: '大寒' | '春分' | '小滿' | '大暑' | '秋分' | '小雪'): Solar {
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

/** 太少相生：從歲運那一步出發，相鄰各步太少交替 */
const taiAt = (excess: boolean, offset: number) => (Math.abs(offset) % 2 === 0 ? excess : !excess);
const stepLabel = (wx: WuXing, tai: boolean) => `${tai ? '太' : '少'}${YIN_OF[wx]}`;

/** 運氣年 Y：自 Y 年大寒起，至 Y+1 年大寒止；干支取 Y 年（立春後）的年干支 */
export function computeWuyun(year: number): WuyunYear {
  if (!Number.isInteger(year) || year < 1901 || year > 2098) throw new Error('年份應在 1901–2098 之間');
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
  if (tianFu && suiHui) tongHua.push('太乙天符（既是天符又是歲會）');
  else if (tianFu) tongHua.push('天符（歲運與司天之氣同）');
  else if (suiHui) tongHua.push('歲會（歲運與年支本位之氣同）');
  if (zaiQuan.wuXing === yunWx) tongHua.push(excess ? '同天符（太過之運與在泉之氣同）' : '同歲會（不及之運與在泉之氣同）');

  const kind = yunQiRelation(yunWx, siTian.wuXing);
  return {
    year, ganZhi, stem, branch,
    suiYun: { wuXing: yunWx, excess, label: `${yunWx}運${excess ? '太過' : '不及'}（${stepLabel(yunWx, excess)}）` },
    zhuYun, keYun, siTian, zaiQuan, steps, tongHua,
    relation: { kind, note: RELATION_NOTE[kind] },
    span: { start: fmt(start), end: fmt(end) },
    assumptions: [],
  };
}

/** 某一公曆日期（北京時間）落在哪個運氣年、哪一運、哪一氣 */
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
    chart.assumptions.push(`${ASSUMPTION_MARK}${ts} 在大寒之後、立春之前：運氣年按通行口徑以大寒交司，已算作 ${chart.ganZhi} 年；此時年干支（以立春為界）仍是上一年，也有人主張運氣以立春為始，結論會不同。`);
  }
  return { chart, yunStep, qiStep };
}
