/**
 * lib/systems/zeri/engine.ts —— 擇日（通書口徑）
 *
 * 宜忌、吉神凶煞、建除十二值星、黃道黑道（十二天神）、二十八宿、九星、沖煞、彭祖百忌、時辰宜忌
 * 全部取自 lunar-javascript（其宜忌與神煞表依《協紀辨方書》體系的通書編排）。
 * 本模塊只做三件事：
 *   1) 把一天的資料整理成固定結構；
 *   2) 交節當日（建除重複的那天）另算「若按交節時刻、節前仍用舊月建」的建除與宜忌，作為假設提示；
 *   3) 在一段日期裡篩出「宜某事且不忌某事」的日子，並標出與當事人生肖相沖的日子。
 * 不做排序或挑「最好的一天」—— 多個可用日之間的取捨規則本身沒有給出，屬於溯因。
 */
import { LunarUtil, Solar } from '../../calendar/lunar';
import { BRANCHES, type Branch } from '../bazi/constants';
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';

export const ZHI_XING = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉'] as const;
export const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'] as const;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export interface ZeriTime {
  zhi: string; range: string; ganZhi: string;
  tianShen: string; huangDao: string; luck: string;
  chong: string; sha: string; yi: string[]; ji: string[];
}

export interface ZeriDay {
  date: string;
  week: string;
  lunar: string;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  dayNaYin: string;
  zhiXing: string;
  tianShen: { name: string; huangDao: string; luck: string };
  xiu: { name: string; luck: string };
  nineStar: string;
  yi: string[];
  ji: string[];
  jiShen: string[];
  xiongSha: string[];
  chong: { ganZhi: string; shengXiao: string; branch: Branch };
  sha: string;
  pengZu: string[];
  /** 交節當日：節氣名、交節時刻，以及節前（舊月建）的建除與宜忌 */
  jie?: { name: string; time: string; prevMonthGanZhi: string; prevZhiXing: string; prevYi: string[]; prevJi: string[] };
  times: ZeriTime[];
  assumptions: string[];
}

export function validateDate(y: number, m: number, d: number): void {
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) throw new Error(`日期不存在：${y}-${m}-${d}`);
  if (y < 1901 || y > 2099) throw new Error('年份應在 1901–2099 之間');
}

const zhiXingOf = (monthBranch: string, dayBranch: string) =>
  ZHI_XING[(BRANCHES.indexOf(dayBranch as Branch) - BRANCHES.indexOf(monthBranch as Branch) + 12) % 12];

/** withTimes=false 時不算十二時辰（篩選大段日期時快得多） */
export function dayInfo(y: number, m: number, d: number, withTimes = true): ZeriDay {
  validateDate(y, m, d);
  const solar = Solar.fromYmd(y, m, d);
  const l = solar.getLunar();
  const dayGanZhi = l.getDayInGanZhi();
  const monthGanZhi = l.getMonthInGanZhi();
  const assumptions: string[] = [];

  // 交節當日：通書以當日即用新月建（所以建除與前一日重複）；按交節時刻算，節前時段仍屬舊月建
  let jie: ZeriDay['jie'];
  const jieName = l.getJie();
  if (jieName) {
    const at = Object.values(l.getJieQiTable()).find(s => s.getYear() === y && s.getMonth() === m && s.getDay() === d);
    if (!at) throw new Error(`找不到 ${y}-${m}-${d} 的${jieName}交節時刻`);
    const pm = minusMinute(at).getLunar().getMonthInGanZhiExact();
    jie = {
      name: jieName, time: at.toYmdHms().slice(0, 16), prevMonthGanZhi: pm,
      prevZhiXing: zhiXingOf(pm[1], dayGanZhi[1]),
      prevYi: LunarUtil.getDayYi(pm, dayGanZhi), prevJi: LunarUtil.getDayJi(pm, dayGanZhi),
    };
    assumptions.push(`${ASSUMPTION_MARK}本日 ${jie.time}（北京時間）交${jieName}：通書口徑當日即用新月建 ${monthGanZhi}（建除與前一日重複）；若以交節時刻為界，節前時段仍屬 ${pm} 月，建除為「${jie.prevZhiXing}」，宜忌也不同（見下）。`);
  }

  const times: ZeriTime[] = !withTimes ? [] : l.getTimes().map(t => ({
    zhi: t.getZhi(), range: `${t.getMinHm()}–${t.getMaxHm()}`, ganZhi: t.getGanZhi(),
    tianShen: t.getTianShen(), huangDao: t.getTianShenType(), luck: t.getTianShenLuck(),
    chong: t.getChongShengXiao(), sha: t.getSha(), yi: t.getYi(), ji: t.getJi(),
  }));

  const chongGz = `${l.getDayChongGan()}${l.getDayChong()}`;
  return {
    date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    week: `星期${WEEK[solar.getWeek()]}`,
    lunar: `農曆${l.getMonthInChinese()}月${l.getDayInChinese()}`,
    yearGanZhi: l.getYearInGanZhiByLiChun(),
    monthGanZhi, dayGanZhi,
    dayNaYin: l.getDayNaYin(),
    zhiXing: l.getZhiXing(),
    tianShen: { name: l.getDayTianShen(), huangDao: l.getDayTianShenType(), luck: l.getDayTianShenLuck() },
    xiu: { name: l.getXiu(), luck: l.getXiuLuck() },
    nineStar: l.getDayNineStar().toString(),
    yi: l.getDayYi(), ji: l.getDayJi(),
    jiShen: l.getDayJiShen(), xiongSha: l.getDayXiongSha(),
    chong: { ganZhi: chongGz, shengXiao: l.getDayChongShengXiao(), branch: l.getDayChong() as Branch },
    sha: l.getDaySha(),
    pengZu: [l.getPengZuGan(), l.getPengZuZhi()],
    jie, times, assumptions,
  };
}

function minusMinute(s: Solar): Solar {
  const ms = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute()) - 60_000;
  const t = new Date(ms);
  return Solar.fromYmdHms(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), 0);
}

/** 生肖 → 地支；接受「馬」「午」 */
export function parseShengXiao(s: string): Branch {
  const i = SHENGXIAO.indexOf(s as (typeof SHENGXIAO)[number]);
  if (i >= 0) return BRANCHES[i];
  if ((BRANCHES as readonly string[]).includes(s)) return s as Branch;
  throw new Error(`無法識別生肖「${s}」，請用 鼠牛虎兔龍蛇馬羊猴雞狗豬 或地支`);
}
export const shengXiaoOf = (b: Branch) => SHENGXIAO[BRANCHES.indexOf(b)];
/** 日支（或時支）沖當事人年支 */
export const clashes = (dayBranch: Branch, personBranch: Branch) => (BRANCHES.indexOf(dayBranch) + 6) % 12 === BRANCHES.indexOf(personBranch);

/** 通書用語全表 */
export const YI_JI_TERMS: readonly string[] = LunarUtil.YI_JI.filter(t => !['諸事不宜', '餘事勿取', '無'].includes(t));

/** 常見白話 → 通書用語（只作提示，最終用哪個詞由提問者確認） */
export const COMMON_ALIASES: Record<string, string[]> = {
  結婚: ['嫁娶'], 婚禮: ['嫁娶'], 訂婚: ['訂婚', '納采'], 領證: ['嫁娶', '訂盟'],
  搬家: ['移徙', '入宅'], 入住: ['入宅'], 喬遷: ['移徙', '入宅'],
  開業: ['開市'], 開張: ['開市'], 簽約: ['立券', '交易'], 籤合同: ['立券', '交易'], 買房: ['置產'],
  裝修: ['修造', '動土'], 動工: ['動土', '修造'], 上梁: ['上梁'],
  下葬: ['安葬'], 出殯: ['安葬', '移柩'], 安葬: ['安葬'],
  出門: ['出行'], 旅行: ['出行'], 求醫: ['求醫', '治病'], 手術: ['求醫', '治病'], 理髮: ['理髮', '剃頭'],
  提車: ['買車'], 買車: ['買車'], 入學: ['入學'], 上任: ['赴任'], 求職: ['赴任', '見貴'],
};

export interface FindHit { day: ZeriDay; clash: boolean }

/** 在 [from, to] 中找「宜 term 且不忌 term」的日子；不排序（按日期先後） */
export function findDays(from: [number, number, number], to: [number, number, number], term: string, person?: Branch): FindHit[] {
  validateDate(...from);
  validateDate(...to);
  const start = Date.UTC(from[0], from[1] - 1, from[2]);
  const end = Date.UTC(to[0], to[1] - 1, to[2]);
  if (end < start) throw new Error('結束日期早於開始日期');
  if ((end - start) / 86400_000 > 370) throw new Error('一次最多查 370 天');
  const hits: FindHit[] = [];
  for (let t = start; t <= end; t += 86400_000) {
    const dt = new Date(t);
    const day = dayInfo(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), false);
    if (day.yi.includes(term) && !day.ji.includes(term)) {
      hits.push({ day, clash: person ? clashes(day.dayGanZhi[1] as Branch, person) : false });
    }
  }
  return hits;
}
