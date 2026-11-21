/**
 * 择日引擎回归（lib/systems/zeri/）—— 以独立规则交叉验证 lunar-javascript 的通书资料
 *
 *   1) 建除十二值星：月建以 Meeus 太阳黄经独立求「节」所在日（交节当日即换月），日支以儒略日推，
 *      值星 = 日支 − 月建；1901–2099 随机 4000 日比对；交节当日与前一日值星重复；
 *   2) 二十八宿：28 日循环，且与七曜（星期）的传统配属一致（日：虚昴星房，月：危毕张心 ……）；
 *   3) 黄道黑道：青龙起法（寅申月起子、卯酉起寅、辰戌起辰、巳亥起午、子午起申、丑未起戌）；
 *   4) 天赦（春戊寅、夏甲午、秋戊申、冬甲子）与月破（破日必有月破，大事不宜）；
 *   5) 冲煞：日冲 = 日支 + 6；
 *   6) 交节日的节前宜忌提示、筛选结果的完备性、参数检查。
 */
import assert from 'node:assert/strict';
import { BRANCHES } from '../../lib/systems/bazi/constants';
import { ZHI_XING, dayInfo, findDays, parseShengXiao, clashes } from '../../lib/systems/zeri/engine';
import { dayGanZhi, jdToBeijing, jdn, seeded, sunLongitude, termJd } from './_oracles';

const { int } = seeded(20261121);
const bi = (b: string) => BRANCHES.indexOf(b as (typeof BRANCHES)[number]);

/** 独立月建：该日（北京时间）日终时太阳黄经所在的「节」区间；交节当日即算新月 */
function oracleMonthBranch(y: number, m: number, d: number): { branch: string; jieToday: boolean } {
  const endOfDay = jdn(y, m, d) - 0.5 + (24 - 8) / 24; // 北京时间 24:00 的儒略日（UT）
  const lam = sunLongitude(endOfDay);
  const k = Math.floor(((lam - 315 + 360) % 360) / 30); // 0 = 寅月（立春 315° 起）
  const jieLon = (315 + 30 * k) % 360;
  const jd = termJd(jieLon, endOfDay - 15);
  const b = jdToBeijing(jd);
  return { branch: BRANCHES[(2 + k) % 12], jieToday: b.y === y && b.m === m && b.d === d };
}

// ── 1) 建除 ────────────────────────────────────────────────
let jcChecked = 0;
for (let i = 0; i < 4000; i++) {
  const y = int(1901, 2099), m = int(1, 12), d = int(1, 28);
  const o = oracleMonthBranch(y, m, d);
  const day = dayInfo(y, m, d, false);
  // 交节时刻离午夜 20 分钟以内时，Meeus 的精度不足以判断落在哪一天，跳过
  if (o.jieToday || day.jie) {
    const t = day.jie?.time.slice(11) ?? '12:00';
    const mins = Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    if (mins < 20 || mins > 1420) continue;
  }
  assert.equal(day.monthGanZhi[1], o.branch, `${y}-${m}-${d} 月建`);
  assert.equal(day.dayGanZhi, dayGanZhi(y, m, d), `${y}-${m}-${d} 日干支`);
  assert.equal(day.zhiXing, ZHI_XING[(bi(day.dayGanZhi[1]) - bi(o.branch) + 12) % 12], `${y}-${m}-${d} 建除`);
  assert.equal(Boolean(day.jie), o.jieToday, `${y}-${m}-${d} 是否交节日`);
  jcChecked++;
}
assert.ok(jcChecked > 3900);

// 交节当日：建除与前一日重复；节前月建提示
let jieDays = 0;
for (let y = 2020; y <= 2030; y++) {
  for (let m = 1; m <= 12; m++) {
    for (let d = 3; d <= 9; d++) {
      const day = dayInfo(y, m, d, false);
      if (!day.jie) continue;
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      assert.equal(day.zhiXing, dayInfo(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), false).zhiXing, `${y}-${m}-${d} 交${day.jie.name}，建除应与前一日重复`);
      assert.equal((bi(day.monthGanZhi[1]) - bi(day.jie.prevMonthGanZhi[1]) + 12) % 12, 1, '节前为上一个月建');
      assert.ok(day.assumptions[0].startsWith('⚠ 假设：'));
      jieDays++;
    }
  }
}
assert.equal(jieDays, 11 * 12, '2020–2030 每月一个交节日（都落在 3–9 日）');

// ── 2) 二十八宿与七曜 ──────────────────────────────────────
const QIYAO: Record<number, string> = { 0: '虚昴星房', 1: '危毕张心', 2: '室觜翼尾', 3: '壁参轸箕', 4: '奎井角斗', 5: '娄鬼亢牛', 6: '胃柳氐女' };
for (let i = 0; i < 1500; i++) {
  const y = int(1901, 2099), m = int(1, 12), d = int(1, 28);
  const day = dayInfo(y, m, d, false);
  const weekday = (jdn(y, m, d) + 1) % 7; // 0 = 星期日（独立推算）
  assert.equal(day.week, `星期${'日一二三四五六'[weekday]}`);
  assert.ok(QIYAO[weekday].includes(day.xiu.name), `${y}-${m}-${d} 星期${weekday} 宿${day.xiu.name}`);
  const later = new Date(Date.UTC(y, m - 1, d + 28));
  if (later.getUTCFullYear() <= 2099) assert.equal(dayInfo(later.getUTCFullYear(), later.getUTCMonth() + 1, later.getUTCDate(), false).xiu.name, day.xiu.name, '二十八宿 28 日一周');
}

// ── 3) 黄道黑道 ────────────────────────────────────────────
const GODS = ['青龙', '明堂', '天刑', '朱雀', '金匮', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈'];
const HUANGDAO = new Set(['青龙', '明堂', '金匮', '天德', '玉堂', '司命']);
const QINGLONG: Record<string, string> = { 寅: '子', 申: '子', 卯: '寅', 酉: '寅', 辰: '辰', 戌: '辰', 巳: '午', 亥: '午', 子: '申', 午: '申', 丑: '戌', 未: '戌' };
// ── 4) 天赦、月破 ──────────────────────────────────────────
const TIANSHE: Record<string, string> = { 寅: '戊寅', 卯: '戊寅', 辰: '戊寅', 巳: '甲午', 午: '甲午', 未: '甲午', 申: '戊申', 酉: '戊申', 戌: '戊申', 亥: '甲子', 子: '甲子', 丑: '甲子' };
const BIG_EVENTS = ['嫁娶', '开市', '入宅', '移徙', '安葬', '动土'];
let tianShe = 0, po = 0;
for (let t = Date.UTC(2016, 0, 1); t < Date.UTC(2031, 0, 1); t += 86400_000) {
  const dt = new Date(t);
  const day = dayInfo(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), false);
  const mb = day.monthGanZhi[1], db = day.dayGanZhi[1];
  const god = GODS[(bi(db) - bi(QINGLONG[mb]) + 12) % 12];
  assert.equal(day.tianShen.name, god, `${day.date} 天神`);
  assert.equal(day.tianShen.huangDao, HUANGDAO.has(god) ? '黄道' : '黑道');
  const isTianShe = day.dayGanZhi === TIANSHE[mb];
  assert.equal(day.jiShen.includes('天赦'), isTianShe, `${day.date} 天赦`);
  if (isTianShe) tianShe++;
  if (day.zhiXing === '破') {
    po++;
    assert.ok(day.xiongSha.includes('月破'), `${day.date} 破日应有月破`);
    for (const e of BIG_EVENTS) assert.ok(!day.yi.includes(e), `${day.date} 破日不宜${e}`);
  }
  // ── 5) 冲煞 ──
  assert.equal(bi(day.chong.branch), (bi(db) + 6) % 12, `${day.date} 日冲`);
  assert.ok(clashes(db as (typeof BRANCHES)[number], day.chong.branch));
}
assert.ok(tianShe > 80 && po > 400);

// ── 6) 筛选与参数 ──────────────────────────────────────────
const hits = findDays([2026, 12, 1], [2027, 2, 28], '嫁娶', parseShengXiao('马'));
const hitDates = new Set(hits.map(h => h.day.date));
for (let t = Date.UTC(2026, 11, 1); t <= Date.UTC(2027, 1, 28); t += 86400_000) {
  const dt = new Date(t);
  const day = dayInfo(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), false);
  assert.equal(hitDates.has(day.date), day.yi.includes('嫁娶') && !day.ji.includes('嫁娶'), `${day.date} 筛选`);
}
for (const h of hits) assert.equal(h.clash, h.day.dayGanZhi[1] === '子', '属马者逢子日相冲');
assert.ok(hits.some(h => h.clash), '样本中应有冲马的子日');
assert.equal(parseShengXiao('午'), '午');
assert.throws(() => parseShengXiao('龙猫'), /无法识别/);
assert.throws(() => findDays([2026, 1, 1], [2027, 3, 1], '嫁娶'), /370/);
assert.throws(() => dayInfo(2026, 2, 30), /日期不存在/);

console.log(`✓ 择日引擎：建除 ${jcChecked} 日与独立月建一致、交节日建除重复；二十八宿合七曜；黄道黑道、天赦 ${tianShe} 日、月破 ${po} 日、冲煞合规则；筛选完备`);
