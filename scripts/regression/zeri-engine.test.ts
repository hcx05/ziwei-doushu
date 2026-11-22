/**
 * 擇日引擎迴歸（lib/systems/zeri/）—— 以獨立規則交叉驗證 lunar-javascript 的通書資料
 *
 *   1) 建除十二值星：月建以 Meeus 太陽黃經獨立求「節」所在日（交節當日即換月），日支以儒略日推，
 *      值星 = 日支 − 月建；1901–2099 隨機 4000 日比對；交節當日與前一日值星重複；
 *   2) 二十八宿：28 日循環，且與七曜（星期）的傳統配屬一致（日：虛昴星房，月：危畢張心 ……）；
 *   3) 黃道黑道：青龍起法（寅申月起子、卯酉起寅、辰戌起辰、巳亥起午、子午起申、丑未起戌）；
 *   4) 天赦（春戊寅、夏甲午、秋戊申、冬甲子）與月破（破日必有月破，大事不宜）；
 *   5) 沖煞：日沖 = 日支 + 6；
 *   6) 交節日的節前宜忌提示、篩選結果的完備性、參數檢查。
 */
import assert from 'node:assert/strict';
import { BRANCHES } from '../../lib/systems/bazi/constants';
import { ZHI_XING, dayInfo, findDays, parseShengXiao, clashes } from '../../lib/systems/zeri/engine';
import { dayGanZhi, jdToBeijing, jdn, seeded, sunLongitude, termJd } from './_oracles';

const { int } = seeded(20261121);
const bi = (b: string) => BRANCHES.indexOf(b as (typeof BRANCHES)[number]);

/** 獨立月建：該日（北京時間）日終時太陽黃經所在的「節」區間；交節當日即算新月 */
function oracleMonthBranch(y: number, m: number, d: number): { branch: string; jieToday: boolean } {
  const endOfDay = jdn(y, m, d) - 0.5 + (24 - 8) / 24; // 北京時間 24:00 的儒略日（UT）
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
  // 交節時刻離午夜 20 分鐘以內時，Meeus 的精度不足以判斷落在哪一天，跳過
  if (o.jieToday || day.jie) {
    const t = day.jie?.time.slice(11) ?? '12:00';
    const mins = Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    if (mins < 20 || mins > 1420) continue;
  }
  assert.equal(day.monthGanZhi[1], o.branch, `${y}-${m}-${d} 月建`);
  assert.equal(day.dayGanZhi, dayGanZhi(y, m, d), `${y}-${m}-${d} 日干支`);
  assert.equal(day.zhiXing, ZHI_XING[(bi(day.dayGanZhi[1]) - bi(o.branch) + 12) % 12], `${y}-${m}-${d} 建除`);
  assert.equal(Boolean(day.jie), o.jieToday, `${y}-${m}-${d} 是否交節日`);
  jcChecked++;
}
assert.ok(jcChecked > 3900);

// 交節當日：建除與前一日重複；節前月建提示
let jieDays = 0;
for (let y = 2020; y <= 2030; y++) {
  for (let m = 1; m <= 12; m++) {
    for (let d = 3; d <= 9; d++) {
      const day = dayInfo(y, m, d, false);
      if (!day.jie) continue;
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      assert.equal(day.zhiXing, dayInfo(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), false).zhiXing, `${y}-${m}-${d} 交${day.jie.name}，建除應與前一日重複`);
      assert.equal((bi(day.monthGanZhi[1]) - bi(day.jie.prevMonthGanZhi[1]) + 12) % 12, 1, '節前為上一個月建');
      assert.ok(day.assumptions[0].startsWith('⚠ 假設：'));
      jieDays++;
    }
  }
}
assert.equal(jieDays, 11 * 12, '2020–2030 每月一個交節日（都落在 3–9 日）');

// ── 2) 二十八宿與七曜 ──────────────────────────────────────
const QIYAO: Record<number, string> = { 0: '虛昴星房', 1: '危畢張心', 2: '室觜翼尾', 3: '壁參軫箕', 4: '奎井角斗', 5: '婁鬼亢牛', 6: '胃柳氐女' };
for (let i = 0; i < 1500; i++) {
  const y = int(1901, 2099), m = int(1, 12), d = int(1, 28);
  const day = dayInfo(y, m, d, false);
  const weekday = (jdn(y, m, d) + 1) % 7; // 0 = 星期日（獨立推算）
  assert.equal(day.week, `星期${'日一二三四五六'[weekday]}`);
  assert.ok(QIYAO[weekday].includes(day.xiu.name), `${y}-${m}-${d} 星期${weekday} 宿${day.xiu.name}`);
  const later = new Date(Date.UTC(y, m - 1, d + 28));
  if (later.getUTCFullYear() <= 2099) assert.equal(dayInfo(later.getUTCFullYear(), later.getUTCMonth() + 1, later.getUTCDate(), false).xiu.name, day.xiu.name, '二十八宿 28 日一週');
}

// ── 3) 黃道黑道 ────────────────────────────────────────────
const GODS = ['青龍', '明堂', '天刑', '朱雀', '金匱', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陳'];
const HUANGDAO = new Set(['青龍', '明堂', '金匱', '天德', '玉堂', '司命']);
const QINGLONG: Record<string, string> = { 寅: '子', 申: '子', 卯: '寅', 酉: '寅', 辰: '辰', 戌: '辰', 巳: '午', 亥: '午', 子: '申', 午: '申', 丑: '戌', 未: '戌' };
// ── 4) 天赦、月破 ──────────────────────────────────────────
const TIANSHE: Record<string, string> = { 寅: '戊寅', 卯: '戊寅', 辰: '戊寅', 巳: '甲午', 午: '甲午', 未: '甲午', 申: '戊申', 酉: '戊申', 戌: '戊申', 亥: '甲子', 子: '甲子', 丑: '甲子' };
const BIG_EVENTS = ['嫁娶', '開市', '入宅', '移徙', '安葬', '動土'];
let tianShe = 0, po = 0;
for (let t = Date.UTC(2016, 0, 1); t < Date.UTC(2031, 0, 1); t += 86400_000) {
  const dt = new Date(t);
  const day = dayInfo(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), false);
  const mb = day.monthGanZhi[1], db = day.dayGanZhi[1];
  const god = GODS[(bi(db) - bi(QINGLONG[mb]) + 12) % 12];
  assert.equal(day.tianShen.name, god, `${day.date} 天神`);
  assert.equal(day.tianShen.huangDao, HUANGDAO.has(god) ? '黃道' : '黑道');
  const isTianShe = day.dayGanZhi === TIANSHE[mb];
  assert.equal(day.jiShen.includes('天赦'), isTianShe, `${day.date} 天赦`);
  if (isTianShe) tianShe++;
  if (day.zhiXing === '破') {
    po++;
    assert.ok(day.xiongSha.includes('月破'), `${day.date} 破日應有月破`);
    for (const e of BIG_EVENTS) assert.ok(!day.yi.includes(e), `${day.date} 破日不宜${e}`);
  }
  // ── 5) 沖煞 ──
  assert.equal(bi(day.chong.branch), (bi(db) + 6) % 12, `${day.date} 日沖`);
  assert.ok(clashes(db as (typeof BRANCHES)[number], day.chong.branch));
}
assert.ok(tianShe > 80 && po > 400);

// ── 6) 篩選與參數 ──────────────────────────────────────────
const hits = findDays([2026, 12, 1], [2027, 2, 28], '嫁娶', parseShengXiao('馬'));
const hitDates = new Set(hits.map(h => h.day.date));
for (let t = Date.UTC(2026, 11, 1); t <= Date.UTC(2027, 1, 28); t += 86400_000) {
  const dt = new Date(t);
  const day = dayInfo(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), false);
  assert.equal(hitDates.has(day.date), day.yi.includes('嫁娶') && !day.ji.includes('嫁娶'), `${day.date} 篩選`);
}
for (const h of hits) assert.equal(h.clash, h.day.dayGanZhi[1] === '子', '屬馬者逢子日相沖');
assert.ok(hits.some(h => h.clash), '樣本中應有沖馬的子日');
assert.equal(parseShengXiao('午'), '午');
assert.throws(() => parseShengXiao('龍貓'), /無法識別/);
assert.throws(() => findDays([2026, 1, 1], [2027, 3, 1], '嫁娶'), /370/);
assert.throws(() => dayInfo(2026, 2, 30), /日期不存在/);

console.log(`✓ 擇日引擎：建除 ${jcChecked} 日與獨立月建一致、交節日建除重複；二十八宿合七曜；黃道黑道、天赦 ${tianShe} 日、月破 ${po} 日、沖煞合規則；篩選完備`);
