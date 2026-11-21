/**
 * lib/systems/zeri/engine.ts —— 择日（通书口径）
 *
 * 宜忌、吉神凶煞、建除十二值星、黄道黑道（十二天神）、二十八宿、九星、冲煞、彭祖百忌、时辰宜忌
 * 全部取自 lunar-javascript（其宜忌与神煞表依《协纪辨方书》体系的通书编排）。
 * 本模块只做三件事：
 *   1) 把一天的资料整理成固定结构；
 *   2) 交节当日（建除重复的那天）另算「若按交节时刻、节前仍用旧月建」的建除与宜忌，作为假设提示；
 *   3) 在一段日期里筛出「宜某事且不忌某事」的日子，并标出与当事人生肖相冲的日子。
 * 不做排序或挑「最好的一天」—— 多个可用日之间的取舍规则本身没有给出，属于溯因。
 */
import { LunarUtil, Solar } from 'lunar-javascript';
import { BRANCHES, type Branch } from '../bazi/constants';
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';

export const ZHI_XING = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'] as const;
export const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const;
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
  /** 交节当日：节气名、交节时刻，以及节前（旧月建）的建除与宜忌 */
  jie?: { name: string; time: string; prevMonthGanZhi: string; prevZhiXing: string; prevYi: string[]; prevJi: string[] };
  times: ZeriTime[];
  assumptions: string[];
}

export function validateDate(y: number, m: number, d: number): void {
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) throw new Error(`日期不存在：${y}-${m}-${d}`);
  if (y < 1901 || y > 2099) throw new Error('年份应在 1901–2099 之间');
}

const zhiXingOf = (monthBranch: string, dayBranch: string) =>
  ZHI_XING[(BRANCHES.indexOf(dayBranch as Branch) - BRANCHES.indexOf(monthBranch as Branch) + 12) % 12];

/** withTimes=false 时不算十二时辰（筛选大段日期时快得多） */
export function dayInfo(y: number, m: number, d: number, withTimes = true): ZeriDay {
  validateDate(y, m, d);
  const solar = Solar.fromYmd(y, m, d);
  const l = solar.getLunar();
  const dayGanZhi = l.getDayInGanZhi();
  const monthGanZhi = l.getMonthInGanZhi();
  const assumptions: string[] = [];

  // 交节当日：通书以当日即用新月建（所以建除与前一日重复）；按交节时刻算，节前时段仍属旧月建
  let jie: ZeriDay['jie'];
  const jieName = l.getJie();
  if (jieName) {
    const at = Object.values(l.getJieQiTable()).find(s => s.getYear() === y && s.getMonth() === m && s.getDay() === d);
    if (!at) throw new Error(`找不到 ${y}-${m}-${d} 的${jieName}交节时刻`);
    const pm = minusMinute(at).getLunar().getMonthInGanZhiExact();
    jie = {
      name: jieName, time: at.toYmdHms().slice(0, 16), prevMonthGanZhi: pm,
      prevZhiXing: zhiXingOf(pm[1], dayGanZhi[1]),
      prevYi: LunarUtil.getDayYi(pm, dayGanZhi), prevJi: LunarUtil.getDayJi(pm, dayGanZhi),
    };
    assumptions.push(`${ASSUMPTION_MARK}本日 ${jie.time}（北京时间）交${jieName}：通书口径当日即用新月建 ${monthGanZhi}（建除与前一日重复）；若以交节时刻为界，节前时段仍属 ${pm} 月，建除为「${jie.prevZhiXing}」，宜忌也不同（见下）。`);
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
    lunar: `农历${l.getMonthInChinese()}月${l.getDayInChinese()}`,
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

/** 生肖 → 地支；接受「马」「午」 */
export function parseShengXiao(s: string): Branch {
  const i = SHENGXIAO.indexOf(s as (typeof SHENGXIAO)[number]);
  if (i >= 0) return BRANCHES[i];
  if ((BRANCHES as readonly string[]).includes(s)) return s as Branch;
  throw new Error(`无法识别生肖「${s}」，请用 鼠牛虎兔龙蛇马羊猴鸡狗猪 或地支`);
}
export const shengXiaoOf = (b: Branch) => SHENGXIAO[BRANCHES.indexOf(b)];
/** 日支（或时支）冲当事人年支 */
export const clashes = (dayBranch: Branch, personBranch: Branch) => (BRANCHES.indexOf(dayBranch) + 6) % 12 === BRANCHES.indexOf(personBranch);

/** 通书用语全表 */
export const YI_JI_TERMS: readonly string[] = LunarUtil.YI_JI.filter(t => !['诸事不宜', '馀事勿取', '无'].includes(t));

/** 常见白话 → 通书用语（只作提示，最终用哪个词由提问者确认） */
export const COMMON_ALIASES: Record<string, string[]> = {
  结婚: ['嫁娶'], 婚礼: ['嫁娶'], 订婚: ['订婚', '纳采'], 领证: ['嫁娶', '订盟'],
  搬家: ['移徙', '入宅'], 入住: ['入宅'], 乔迁: ['移徙', '入宅'],
  开业: ['开市'], 开张: ['开市'], 签约: ['立券', '交易'], 签合同: ['立券', '交易'], 买房: ['置产'],
  装修: ['修造', '动土'], 动工: ['动土', '修造'], 上梁: ['上梁'],
  下葬: ['安葬'], 出殡: ['安葬', '移柩'], 安葬: ['安葬'],
  出门: ['出行'], 旅行: ['出行'], 求医: ['求医', '治病'], 手术: ['求医', '治病'], 理发: ['理发', '剃头'],
  提车: ['买车'], 买车: ['买车'], 入学: ['入学'], 上任: ['赴任'], 求职: ['赴任', '见贵'],
};

export interface FindHit { day: ZeriDay; clash: boolean }

/** 在 [from, to] 中找「宜 term 且不忌 term」的日子；不排序（按日期先后） */
export function findDays(from: [number, number, number], to: [number, number, number], term: string, person?: Branch): FindHit[] {
  validateDate(...from);
  validateDate(...to);
  const start = Date.UTC(from[0], from[1] - 1, from[2]);
  const end = Date.UTC(to[0], to[1] - 1, to[2]);
  if (end < start) throw new Error('结束日期早于开始日期');
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
