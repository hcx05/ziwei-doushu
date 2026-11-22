/**
 * lib/systems/qimen/engine.ts —— 時家奇門遁甲（轉盤）排盤（確定性）
 *
 * 依據：明程道生《遁甲演義》（四庫全書本）卷一「時家奇門」「八門九星逐時移宮訣」「超神接氣置閏訣」
 * 「又引證」、卷二「冬至陽遁時奇起例」「夏至陰遁時奇起例」「奇遁佈局法」；局數表與
 * 《御定奇門寶鑑》「冬至、驚蟄……三元甲子起於一七四宮」相合。
 *
 *   · 定局（預設拆補法）：節氣按交節時刻（交節所在時辰即算新節氣），上中下元按當日符頭
 *     （甲、己日）之支：子午卯酉為上元，寅申巳亥為中元，辰戌丑未為下元。這是《遁甲演義》
 *     「又引證」萬曆二十四年一例的排法（殘局、補局）。
 *   · 置閏法：另算一份作對照——上元符頭依序配節氣，符頭先到為超神、後到為接氣；
 *     遇芒種、大雪而超神過九日，重排該節氣三元為閏奇。
 *   · 地盤：陽遁自局數宮起戊，順佈六儀、逆佈三奇（戊己庚辛壬癸丁丙乙依宮序 1→9）；陰遁反之。
 *   · 值符值使：時辰所在旬之旬首六儀落宮，其宮之星為值符、門為值使；中五宮為天禽、死門。
 *   · 天盤（轉盤）：值符隨時干（甲時用旬首六儀）所落地盤宮，九星依八宮圓周整體轉動；
 *     中五寄坤二，天禽隨天芮。
 *   · 八門：值使自旬首宮起，按時支距旬首之數陽順陰逆數九宮（入中寄坤），八門依圓周整體轉動。
 *   · 八神：值符所臨之宮起值符，陽遁順時針、陰遁逆時針：值符、螣蛇、太陰、六合、白虎、玄武、九地、九天
 *     （卷一：「直符前三六合位，前二太陰……後一名九天，後二宮神名九地」）。
 */
import { Solar } from '../../calendar/lunar';
import { BRANCHES, STEMS, type Branch, type Stem } from '@/lib/systems/bazi/constants';

export type Dun = '陽' | '陰';
export type Palace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const PALACE_NAME: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兌', 8: '艮', 9: '離' };
/** 八宮圓周（順時針）：坎、艮、震、巽、離、坤、兌、乾 */
export const RING: Palace[] = [1, 8, 3, 4, 9, 2, 7, 6];
export const STAR_HOME: Record<string, Palace> = { 天蓬: 1, 天芮: 2, 天沖: 3, 天輔: 4, 天禽: 5, 天心: 6, 天柱: 7, 天任: 8, 天英: 9 };
export const DOOR_HOME: Record<string, Palace> = { 休門: 1, 死門: 2, 傷門: 3, 杜門: 4, 開門: 6, 驚門: 7, 生門: 8, 景門: 9 };
const STAR_AT: Record<number, string> = Object.fromEntries(Object.entries(STAR_HOME).map(([k, v]) => [v, k]));
const DOOR_AT: Record<number, string> = { ...Object.fromEntries(Object.entries(DOOR_HOME).map(([k, v]) => [v, k])), 5: '死門' };
export const SHEN = ['值符', '螣蛇', '太陰', '六合', '白虎', '玄武', '九地', '九天'] as const;
/** 三奇六儀佈局次序 */
export const QIYI: Stem[] = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
/** 六甲所遁之儀 */
export const XUN_YI: Record<string, Stem> = { 甲子: '戊', 甲戌: '己', 甲申: '庚', 甲午: '辛', 甲辰: '壬', 甲寅: '癸' };

/** 二十四節氣的三元局數（陽遁冬至至芒種，陰遁夏至至大雪）；鍵用 lunar-javascript 的簡體名 */
export const JU_TABLE: Record<string, { dun: Dun; ju: [number, number, number] }> = {
  冬至: { dun: '陽', ju: [1, 7, 4] }, 小寒: { dun: '陽', ju: [2, 8, 5] }, 大寒: { dun: '陽', ju: [3, 9, 6] },
  立春: { dun: '陽', ju: [8, 5, 2] }, 雨水: { dun: '陽', ju: [9, 6, 3] }, 驚蟄: { dun: '陽', ju: [1, 7, 4] },
  春分: { dun: '陽', ju: [3, 9, 6] }, 清明: { dun: '陽', ju: [4, 1, 7] }, 穀雨: { dun: '陽', ju: [5, 2, 8] },
  立夏: { dun: '陽', ju: [4, 1, 7] }, 小滿: { dun: '陽', ju: [5, 2, 8] }, 芒種: { dun: '陽', ju: [6, 3, 9] },
  夏至: { dun: '陰', ju: [9, 3, 6] }, 小暑: { dun: '陰', ju: [8, 2, 5] }, 大暑: { dun: '陰', ju: [7, 1, 4] },
  立秋: { dun: '陰', ju: [2, 5, 8] }, 處暑: { dun: '陰', ju: [1, 4, 7] }, 白露: { dun: '陰', ju: [9, 3, 6] },
  秋分: { dun: '陰', ju: [7, 1, 4] }, 寒露: { dun: '陰', ju: [6, 9, 3] }, 霜降: { dun: '陰', ju: [5, 8, 2] },
  立冬: { dun: '陰', ju: [6, 9, 3] }, 小雪: { dun: '陰', ju: [5, 8, 2] }, 大雪: { dun: '陰', ju: [4, 7, 1] },
};
export const JIEQI_ORDER = Object.keys(JU_TABLE);
/** 繁體顯示名 */
export const JIEQI_TW: Record<string, string> = {
  驚蟄: '驚蟄', 穀雨: '穀雨', 小滿: '小滿', 芒種: '芒種', 處暑: '處暑',
};
export const tw = (q: string) => JIEQI_TW[q] ?? q;

export type Yuan = '上元' | '中元' | '下元';
const YUAN: Yuan[] = ['上元', '中元', '下元'];
const gzIndex = (gz: string) => { for (let i = 0; i < 60; i++) if (STEMS[i % 10] + BRANCHES[i % 12] === gz) return i; throw new RangeError(`干支不合法：${gz}`); };
const gzOf = (i: number) => STEMS[((i % 60) + 60) % 60 % 10] + BRANCHES[((i % 60) + 60) % 60 % 12];

/** 符頭：當日或之前最近的甲、己日 */
export function fuTou(dayGz: string): string { const i = gzIndex(dayGz); return gzOf(i - (i % 5)); }
/** 符頭之支定元：子午卯酉上元、寅申巳亥中元、辰戌丑未下元 */
export function yuanOf(dayGz: string): Yuan {
  const b = BRANCHES.indexOf(fuTou(dayGz)[1] as Branch);
  return YUAN[[0, 2, 1][b % 3]];
}

/** 拆補法定局：節氣（已到者）＋當日符頭定元 */
export function juChaiBu(jieqi: string, dayGz: string): { dun: Dun; ju: number; yuan: Yuan } {
  const row = JU_TABLE[jieqi] ?? (() => { throw new RangeError(`未知節氣：${jieqi}`); })();
  const yuan = yuanOf(dayGz);
  return { dun: row.dun, ju: row.ju[YUAN.indexOf(yuan)], yuan };
}

// ────────────────── 置閏法 ──────────────────

export interface JieqiEvent { name: string; day: number }
export interface ZhiRunSegment {
  /** 該元起始日（儒略日數，含） */
  start: number;
  jieqi: string;
  yuan: Yuan;
  /** 上元符頭較節氣早到的日數（正為超神、負為接氣、0 為正授） */
  lead: number;
  run: boolean;
}

/** 置閏閾值：芒種、大雪超神逾此日數即置閏（《遁甲演義》「超過九日即置閏」，《奇門寶鑑》「如過九日，即當置閏」） */
export const RUN_THRESHOLD = 9;

/**
 * 置閏法排程：自種子（上元符頭與某節氣相差不超過兩日）起，每十五日（上元符頭）依序配下一節氣；
 * 芒種、大雪超神逾 RUN_THRESHOLD 日則重配一次（閏奇）。
 * events 須依時間排序且涵蓋整段；fuTouDays 為上元符頭（甲子、己卯、甲午、己酉日）的日數，遞增。
 */
export function zhiRunSchedule(events: JieqiEvent[], fuTouDays: number[]): ZhiRunSegment[] {
  const nearest = (d: number) => events.reduce((a, e) => (Math.abs(e.day - d) < Math.abs(a.day - d) ? e : a));
  let k = fuTouDays.findIndex(d => Math.abs(nearest(d).day - d) <= 2);
  if (k < 0) throw new Error('找不到置閏法的起算點');
  let qi = JIEQI_ORDER.indexOf(nearest(fuTouDays[k]).name);
  const segs: ZhiRunSegment[] = [];
  let run = false;
  for (; k < fuTouDays.length; k++) {
    const name = JIEQI_ORDER[qi];
    const d0 = fuTouDays[k];
    // 本節氣在符頭附近（±20 日）的交節日
    const ev = events.filter(e => e.name === name).reduce<JieqiEvent | null>((a, e) => (!a || Math.abs(e.day - d0) < Math.abs(a.day - d0) ? e : a), null);
    if (!ev) break;
    const lead = ev.day - d0;
    for (let y = 0; y < 3; y++) segs.push({ start: d0 + 5 * y, jieqi: name, yuan: YUAN[y], lead, run });
    if (!run && (name === '芒種' || name === '大雪') && lead > RUN_THRESHOLD) { run = true; continue; }
    run = false;
    qi = (qi + 1) % 24;
  }
  return segs;
}

// ────────────────── 曆法（以東八區交節時刻） ──────────────────

const jdn = (y: number, m: number, d: number) => Math.floor(Solar.fromYmdHms(y, m, d, 12, 0, 0).getJulianDay());

/** 某段時間內的節氣（東八區） */
export function jieqiEvents(fromYear: number, toYear: number): (JieqiEvent & { time: string })[] {
  const out: (JieqiEvent & { time: string })[] = [];
  const seen = new Set<string>();
  for (let y = fromYear; y <= toYear; y++) {
    const t = Solar.fromYmd(y, 7, 1).getLunar().getJieQiTable();
    for (const [k, s] of Object.entries(t)) {
      const name = JIEQI_ORDER.includes(k) ? k : null;
      if (!name) continue;
      const time = s.toYmdHms();
      if (seen.has(time)) continue;
      seen.add(time);
      out.push({ name, day: jdn(s.getYear(), s.getMonth(), s.getDay()), time });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export interface JuResult {
  dun: Dun;
  ju: number;
  yuan: Yuan;
  jieqi: string;
  /** 置閏法的對照結果 */
  zhiRun: { dun: Dun; ju: number; yuan: Yuan; jieqi: string; lead: number; run: boolean } | null;
}

/**
 * 依起局時刻（東八區）定局。dayGz 為當日干支（23 點後已換次日者由呼叫方處理）。
 * 交節所在的時辰即算新節氣。
 */
export function determineJu(bj: { year: number; month: number; day: number; hour: number }, dayGz: string): JuResult {
  // 下一時辰起點：交節時刻早於此者，即算已交（交節所在時辰即用新節氣）
  const nh = bj.hour % 2 === 1 ? bj.hour + 2 : bj.hour + 1;
  const endKey = nh >= 24 ? nextDayKey(bj, nh - 24) : `${ymd(bj)} ${String(nh).padStart(2, '0')}:00:00`;
  const evs = jieqiEvents(bj.year - 1, bj.year + 1);
  const cur = [...evs].reverse().find(e => e.time < endKey)!;
  const cb = juChaiBu(cur.name, dayGz);

  // 置閏法：自四年前起算
  const evLong = jieqiEvents(bj.year - 5, bj.year + 1);
  const today = jdn(bj.year, bj.month, bj.day);
  const first = evLong[0].day;
  const fuTouDays: number[] = [];
  // 上元符頭：甲子、己卯、甲午、己酉（日干支序號 0、15、30、45）
  for (let d = first; d <= today + 20; d++) if (dayIndexOf(d) % 15 === 0) fuTouDays.push(d);
  let zhiRun: JuResult['zhiRun'] = null;
  try {
    const segs = zhiRunSchedule(evLong, fuTouDays);
    const seg = [...segs].reverse().find(s => s.start <= today);
    if (seg) {
      const row = JU_TABLE[seg.jieqi];
      zhiRun = { dun: row.dun, ju: row.ju[YUAN.indexOf(seg.yuan)], yuan: seg.yuan, jieqi: seg.jieqi, lead: seg.lead, run: seg.run };
    }
  } catch { zhiRun = null; }
  return { ...cb, jieqi: cur.name, zhiRun };
}

const ymd = (bj: { year: number; month: number; day: number }) => `${bj.year}-${String(bj.month).padStart(2, '0')}-${String(bj.day).padStart(2, '0')}`;

function nextDayKey(bj: { year: number; month: number; day: number }, hour: number): string {
  const t = new Date(Date.UTC(bj.year, bj.month - 1, bj.day + 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00:00`;
}

/** 儒略日數 → 日干支序號（甲子為 0）：2000-01-07 為甲子日 */
const JD_JIAZI = 2451551;
export const dayIndexOf = (jd: number) => (((jd - JD_JIAZI) % 60) + 60) % 60;

// ────────────────── 排盤 ──────────────────

const ringIdx = (p: number) => RING.indexOf((p === 5 ? 2 : p) as Palace);
const ringAt = (i: number) => RING[((i % 8) + 8) % 8];
const step9 = (p: number, n: number) => ((((p - 1 + n) % 9) + 9) % 9) + 1;

export interface PalaceInfo {
  palace: Palace;
  /** 地盤干 */
  earth: Stem;
  /** 坤二宮另有中五宮寄來的地盤干 */
  earthJi?: Stem;
  /** 天盤干（天禽隨天芮，可能兩個） */
  heaven: Stem[];
  stars: string[];
  door: string | null;
  shen: string | null;
}

export interface QimenChart {
  dun: Dun;
  ju: number;
  dayGz: string;
  hourGz: string;
  xunShou: string;
  xunYi: Stem;
  zhiFu: { star: string; from: Palace; to: Palace };
  zhiShi: { door: string; from: Palace; to: Palace };
  palaces: PalaceInfo[];
  xunKong: [Branch, Branch];
  yiMa: Branch;
  patterns: string[];
}

export function earthPlate(dun: Dun, ju: number): Record<number, Stem> {
  if (!(Number.isInteger(ju) && ju >= 1 && ju <= 9)) throw new RangeError('局數應為 1–9');
  const m: Record<number, Stem> = {};
  QIYI.forEach((s, i) => { m[step9(ju, dun === '陽' ? i : -i)] = s; });
  return m;
}

const palaceOfStem = (earth: Record<number, Stem>, s: Stem) => Number(Object.keys(earth).find(k => earth[Number(k)] === s)) as Palace;

export function buildQimen(dun: Dun, ju: number, dayGz: string, hourGz: string): QimenChart {
  const earth = earthPlate(dun, ju);
  const hi = gzIndex(hourGz);
  gzIndex(dayGz);
  const xunShou = gzOf(hi - (hi % 10));
  const xunYi = XUN_YI[xunShou];
  const fuP = palaceOfStem(earth, xunYi);
  const star = STAR_AT[fuP];
  const door = DOOR_AT[fuP];
  const hourStem = hourGz[0] as Stem;
  let target = hourStem === '甲' ? fuP : palaceOfStem(earth, hourStem);
  if (target === 5) target = 2;

  // 九星轉盤
  const shift = ringIdx(target) - ringIdx(fuP);
  const starPos: Record<string, Palace> = {};
  for (const [s, h] of Object.entries(STAR_HOME)) starPos[s] = ringAt(ringIdx(h) + shift);

  // 八門
  const steps = (BRANCHES.indexOf(hourGz[1] as Branch) - BRANCHES.indexOf(xunShou[1] as Branch) + 12) % 12;
  let doorTo = step9(fuP, dun === '陽' ? steps : -steps);
  if (doorTo === 5) doorTo = 2;
  const dShift = ringIdx(doorTo) - ringIdx(DOOR_HOME[door]);
  const doorPos: Record<string, Palace> = {};
  for (const [d, h] of Object.entries(DOOR_HOME)) doorPos[d] = ringAt(ringIdx(h) + dShift);

  // 八神
  const shenPos: Record<string, Palace> = {};
  SHEN.forEach((s, i) => { shenPos[s] = ringAt(ringIdx(target) + (dun === '陽' ? i : -i)); });

  const palaces: PalaceInfo[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as Palace[]).map(p => {
    const stars = p === 5 ? [] : Object.keys(starPos).filter(s => starPos[s] === p).sort((a, b) => (a === '天禽' ? 1 : b === '天禽' ? -1 : 0));
    return {
      palace: p,
      earth: earth[p],
      ...(p === 2 ? { earthJi: earth[5] } : {}),
      heaven: stars.map(s => earth[STAR_HOME[s]]),
      stars,
      door: p === 5 ? null : Object.keys(doorPos).find(d => doorPos[d] === p) ?? null,
      shen: p === 5 ? null : Object.keys(shenPos).find(s => shenPos[s] === p) ?? null,
    };
  });

  const hb = BRANCHES.indexOf(hourGz[1] as Branch);
  const xb = BRANCHES.indexOf(xunShou[1] as Branch);
  const chart: QimenChart = {
    dun, ju, dayGz, hourGz, xunShou, xunYi,
    zhiFu: { star, from: fuP, to: target },
    zhiShi: { door, from: fuP, to: doorTo as Palace },
    palaces,
    xunKong: [BRANCHES[(xb + 10) % 12], BRANCHES[(xb + 11) % 12]],
    yiMa: BRANCHES[[2, 11, 8, 5][hb % 4]],
    patterns: [],
  };
  chart.patterns = findPatterns(chart);
  return chart;
}

// ────────────────── 格局（只判書中定義明確者） ──────────────────

/** 十干克應（《遁甲演義》卷二）：天盤某干加地盤某干 */
const STEM_PAIRS: [Stem, Stem, string][] = [
  ['乙', '辛', '青龍逃走'], ['辛', '乙', '白虎猖狂'], ['丁', '癸', '朱雀投江'], ['癸', '丁', '螣蛇夭矯'],
  ['庚', '癸', '大格'], ['庚', '壬', '小格'], ['庚', '己', '刑格'], ['丙', '庚', '熒入白'], ['庚', '丙', '白入熒'],
];
/** 六儀擊刑：甲子戊臨震、甲戌己臨坤、甲申庚臨艮、甲午辛臨離、甲辰壬臨巽、甲寅癸臨巽 */
const JI_XING: Record<string, Palace> = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 };
/** 三奇入墓：乙臨坤、丙臨乾、丁臨艮（王璋說） */
const RU_MU: Record<string, Palace> = { 乙: 2, 丙: 6, 丁: 8 };
/** 門克宮為門迫 */
const WX: Record<number, string> = { 1: '水', 2: '土', 3: '木', 4: '木', 6: '金', 7: '金', 8: '土', 9: '火' };
const DOOR_WX: Record<string, string> = { 休門: '水', 死門: '土', 傷門: '木', 杜門: '木', 開門: '金', 驚門: '金', 生門: '土', 景門: '火' };
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export function findPatterns(c: QimenChart): string[] {
  const out: string[] = [];
  const dayYi = (g: string): Stem => (g[0] === '甲' ? XUN_YI[gzOf(gzIndex(g) - (gzIndex(g) % 10))] : g[0] as Stem);
  const dStem = dayYi(c.dayGz);
  const at = (p: number) => `${p}宮${PALACE_NAME[p]}`;
  if (c.zhiFu.from === c.zhiFu.to || (c.zhiFu.from === 5 && c.zhiFu.to === 2)) out.push('伏吟：九星不動（值符加本宮）');
  else if (ringIdx(c.zhiFu.to) === (ringIdx(c.zhiFu.from) + 4) % 8) out.push('反吟：九星各到對宮');
  for (const p of c.palaces) {
    if (p.palace === 5) continue;
    const earths = p.earthJi ? [p.earth, p.earthJi] : [p.earth];
    for (const h of p.heaven) for (const e of earths) {
      for (const [a, b, name] of STEM_PAIRS) if (h === a && e === b) out.push(`${name}：天盤${a}加地盤${b}，在${at(p.palace)}`);
      if (h === '丙' && e === c.xunYi) out.push(`飛鳥跌穴：天盤丙加地盤旬首${c.xunYi}，在${at(p.palace)}`);
      if (h === c.xunYi && e === '丙') out.push(`青龍返首：天盤旬首${c.xunYi}加地盤丙，在${at(p.palace)}`);
      if (h === '庚' && e === dStem) out.push(`伏干格：天盤庚加日干${dStem}，在${at(p.palace)}`);
      if (h === dStem && e === '庚') out.push(`飛干格：日干${dStem}加地盤庚，在${at(p.palace)}`);
      if (h === '庚' && e === c.xunYi) out.push(`伏宮格：天盤庚加值符（地盤${c.xunYi}），在${at(p.palace)}`);
      if (h === c.xunYi && e === '庚' && p.stars[0] === c.zhiFu.star) out.push(`飛宮格：值符加地盤庚，在${at(p.palace)}`);
      if (JI_XING[h] === p.palace) out.push(`六儀擊刑：天盤${h}臨${at(p.palace)}`);
      if (RU_MU[h] === p.palace) out.push(`三奇入墓：天盤${h}臨${at(p.palace)}`);
    }
    if (p.door && p.heaven.includes('丙') && p.door === '生門' && earths.includes('丁')) out.push(`天遁：生門、天盤丙、地盤丁同在${at(p.palace)}`);
    if (p.door && p.heaven.includes('乙') && p.door === '開門' && earths.includes('己')) out.push(`地遁：開門、天盤乙、地盤己同在${at(p.palace)}`);
    if (p.door === '休門' && p.heaven.includes('丁') && p.shen === '太陰') out.push(`人遁：休門、天盤丁、太陰同在${at(p.palace)}`);
    if (p.door && KE[DOOR_WX[p.door]] === WX[p.palace]) out.push(`門迫：${p.door}（${DOOR_WX[p.door]}）克${at(p.palace)}（${WX[p.palace]}）`);
  }
  const di = STEMS.indexOf(c.dayGz[0] as Stem), hi = STEMS.indexOf(c.hourGz[0] as Stem);
  if (di % 2 === hi % 2 && KE[STEM_WX[hi]] === STEM_WX[di]) out.push(`五不遇時：時干${c.hourGz[0]}克日干${c.dayGz[0]}`);
  return [...new Set(out)];
}
const STEM_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
