/**
 * 六爻引擎迴歸（lib/systems/liuyao/）
 *
 *   1) 《周易》數據：64 卦、卦象互不重複；每條爻辭的爻題（初九、六二……上六）與該爻陰陽一致；只有乾坤有用九用六；
 *   2) 八宮：程序按「本宮→一世…五世→遊魂→歸魂」推出的表，與手寫的京房八宮六十四卦表逐卦一致，世爻位置正確；
 *   3) 納甲裝卦：天風姤、水火既濟兩個教科書例逐爻比對（干支、六親、世應、伏神）；
 *   4) 六神起法、朱熹占法（0–6 爻變）、時間起卦算式、月建日辰（日辰另以儒略日獨立推算）、海外時區。
 */
import assert from 'node:assert/strict';
import { ZHOUYI } from '../../lib/systems/liuyao/zhouyi.data';
import { PALACE_TABLE, buildLiuyao, hexagramInfo, parseYaoDigits, timeCast, zhuXiReading } from '../../lib/systems/liuyao/engine';
import { ganZhiOf } from '../../lib/systems/bazi/constants';

// ── 1) 經文數據 ─────────────────────────────────────────────
assert.equal(ZHOUYI.length, 64);
assert.equal(new Set(ZHOUYI.map(h => h.lines)).size, 64);
assert.deepEqual(ZHOUYI.map(h => h.no), Array.from({ length: 64 }, (_, i) => i + 1));
const POS = ['初', '二', '三', '四', '五', '上'];
for (const h of ZHOUYI) {
  h.yaoCi.forEach((y, i) => {
    const num = h.lines[i] === '1' ? '九' : '六';
    const title = i === 0 || i === 5 ? POS[i] + num : num + POS[i];
    assert.ok(y.startsWith(title + '：'), `${h.name}第${i + 1}爻爻題應為「${title}」：${y}`);
  });
  assert.equal(Boolean(h.yong), h.name === '乾' || h.name === '坤', `${h.name} 用九 / 用六`);
}
assert.equal(ZHOUYI[0].yong, '用九：見群龍無首，吉。');
assert.equal(ZHOUYI.find(h => h.name === '屯')!.lines, '100010', '屯：震下坎上（自下而上）');

// ── 2) 八宮 ─────────────────────────────────────────────────
const EIGHT_PALACES: Record<string, string[]> = {
  乾: ['乾為天', '天風姤', '天山遁', '天地否', '風地觀', '山地剝', '火地晉', '火天大有'],
  坎: ['坎為水', '水澤節', '水雷屯', '水火既濟', '澤火革', '雷火豐', '地火明夷', '地水師'],
  艮: ['艮為山', '山火賁', '山天大畜', '山澤損', '火澤睽', '天澤履', '風澤中孚', '風山漸'],
  震: ['震為雷', '雷地豫', '雷水解', '雷風恆', '地風升', '水風井', '澤風大過', '澤雷隨'],
  巽: ['巽為風', '風天小畜', '風火家人', '風雷益', '天雷無妄', '火雷噬嗑', '山雷頤', '山風蠱'],
  離: ['離為火', '火山旅', '火風鼎', '火水未濟', '山水蒙', '風水渙', '天水訟', '天火同人'],
  坤: ['坤為地', '地雷復', '地澤臨', '地天泰', '雷天大壯', '澤天夬', '水天需', '水地比'],
  兌: ['兌為澤', '澤水困', '澤地萃', '澤山咸', '水山蹇', '地山謙', '雷山小過', '雷澤歸妹'],
};
const SHI = [6, 1, 2, 3, 4, 5, 4, 3];
let palaceChecked = 0;
for (const [palace, list] of Object.entries(EIGHT_PALACES)) {
  list.forEach((full, order) => {
    const h = ZHOUYI.find(x => x.fullName === full);
    assert.ok(h, `經文數據裡找不到 ${full}`);
    const p = PALACE_TABLE.get(h.lines)!;
    assert.equal(p.palace.name, palace, `${full} 應屬${palace}宮`);
    assert.equal(p.order, order, `${full} 在${palace}宮的次序`);
    assert.equal(hexagramInfo(h.lines).shi, SHI[order], `${full} 世爻`);
    palaceChecked++;
  });
}
assert.equal(palaceChecked, 64);

// ── 3) 納甲裝卦 ─────────────────────────────────────────────
const at = { year: 2026, month: 11, day: 21, hour: 15, minute: 20 };
const gou = buildLiuyao(parseYaoDigits('877777'), at, '手動');
assert.equal(gou.main.text.fullName, '天風姤');
assert.deepEqual(gou.lines.map(l => l.stem + l.branch + l.liuQin), ['辛丑父母', '辛亥子孫', '辛酉兄弟', '壬午官鬼', '壬申兄弟', '壬戌父母']);
assert.deepEqual([gou.main.shi, gou.main.ying], [1, 4]);
assert.deepEqual(gou.missingLiuQin, ['妻財']);
assert.deepEqual(gou.lines[1].hidden && [gou.lines[1].hidden.stem + gou.lines[1].hidden.branch, gou.lines[1].hidden.liuQin], ['甲寅', '妻財'], '姤卦二爻下伏甲寅妻財');
assert.equal(gou.changed, null);

const jj = buildLiuyao(parseYaoDigits('987678'), at, '手動');
assert.equal(jj.main.text.fullName, '水火既濟');
assert.equal(jj.changed?.text.fullName, '澤山咸');
assert.deepEqual(jj.lines.map(l => l.stem + l.branch + l.liuQin), ['己卯子孫', '己丑官鬼', '己亥兄弟', '戊申父母', '戊戌官鬼', '戊子兄弟']);
assert.equal(jj.lines[2].hidden?.stem + '' + jj.lines[2].hidden?.branch, '戊午', '既濟三爻下伏戊午妻財');
assert.equal(jj.lines[0].changed?.stem + '' + jj.lines[0].changed?.branch, '丙辰', '初爻己卯化丙辰');
assert.equal(jj.lines[3].changed?.stem + '' + jj.lines[3].changed?.branch, '丁亥', '四爻戊申化丁亥');
assert.equal(jj.lines[0].changed?.liuQin, '官鬼', '變爻六親仍以本卦坎宮水論');

// ── 4) 月建日辰（日辰以儒略日獨立推算） ──────────────────────
const jdn = (y: number, m: number, d: number) => {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
};
assert.equal(gou.calendar.dayGanZhi, ganZhiOf(jdn(2026, 11, 21) - 11));
assert.equal(gou.calendar.monthGanZhi, '己亥', '2026 立冬後為亥月，丙年亥月起己亥');
assert.deepEqual(gou.calendar.xunKong, ['辰', '巳']);
const late = buildLiuyao(parseYaoDigits('877777'), { ...at, hour: 23 }, '手動');
assert.equal(late.calendar.dayGanZhi, ganZhiOf(jdn(2026, 11, 22) - 11), '23 點起卦日辰按次日');
assert.ok(late.assumptions[0].startsWith('⚠ 假設：'));
// 2026 立冬 = 北京 11/7 17:52。紐約 11/7 06:00（UTC−5）= 北京 19:00，已過立冬；若誤把 06:00 當北京時間就會落在戌月
const ny = buildLiuyao(parseYaoDigits('877777'), { year: 2026, month: 11, day: 7, hour: 6, minute: 0, utcOffset: -5 }, '手動');
assert.equal(ny.calendar.monthBranch, '亥', '月建應按換算後的北京時刻對節氣');
assert.equal(buildLiuyao(parseYaoDigits('877777'), { year: 2026, month: 11, day: 7, hour: 6, minute: 0 }, '手動').calendar.monthBranch, '戌');
assert.equal(ny.calendar.dayGanZhi, ganZhiOf(jdn(2026, 11, 7) - 11), '日辰按當地日期');

// ── 5) 六神 ─────────────────────────────────────────────────
// 2026-11-21 己亥日：己日起螣蛇
assert.deepEqual(gou.lines.map(l => l.liuShen), ['螣蛇', '白虎', '玄武', '青龍', '朱雀', '勾陳']);

// ── 6) 朱熹占法 ─────────────────────────────────────────────
const qian = ZHOUYI[0], kun = ZHOUYI[1];
const rule = (n: number[]) => zhuXiReading(jj.main.text, jj.changed!.text, n).rule.slice(0, 4);
assert.equal(zhuXiReading(qian, null, []).texts[0].text, qian.guaCi);
assert.equal(zhuXiReading(qian, kun, [3]).texts[0].text, qian.yaoCi[2]);
assert.deepEqual(zhuXiReading(qian, kun, [2, 5]).texts.map(t => t.text), [qian.yaoCi[4], qian.yaoCi[1]], '二爻變以上爻為主');
assert.equal(rule([1, 2, 3]), '三爻變：');
const four = zhuXiReading(qian, kun, [1, 2, 3, 4]);
assert.deepEqual(four.texts.map(t => t.text), [kun.yaoCi[4], kun.yaoCi[5]], '四爻變看之卦二不變爻，以下爻為主');
assert.deepEqual(zhuXiReading(qian, kun, [1, 2, 3, 4, 5]).texts.map(t => t.text), [kun.yaoCi[5]]);
assert.equal(zhuXiReading(qian, kun, [1, 2, 3, 4, 5, 6]).texts[0].text, '用九：見群龍無首，吉。');
assert.equal(zhuXiReading(jj.main.text, jj.changed!.text, [1, 2, 3, 4, 5, 6]).texts[0].text, jj.changed!.text.guaCi);

// ── 7) 時間起卦 ─────────────────────────────────────────────
// 午年（7）十月十三日申時（9）：30 % 8 = 6 坎上；39 % 8 = 7 艮下；39 % 6 = 3 三爻動 → 水山蹇
const tc = timeCast(6, 10, 13, 8);
const tcChart = buildLiuyao(tc.values, at, '時間');
assert.equal(tcChart.main.text.fullName, '水山蹇');
assert.deepEqual(tcChart.lines.filter(l => l.moving).map(l => l.position), [3]);
const tc0 = timeCast(0, 1, 7, 0); // 1+1+7=9 → 1 乾；+1=10 → 2 兌，10%6=4
assert.equal(buildLiuyao(tc0.values, at, '時間').main.text.fullName, '天澤履');
assert.throws(() => parseYaoDigits('78967'), /6 位/);
assert.throws(() => parseYaoDigits('789675'), /6 位/);

console.log(`✓ 六爻引擎：周易 64 卦經文與爻題一致；八宮 ${palaceChecked} 卦與京房表一致；納甲、伏神、變爻、六神、月建日辰、朱熹占法、時間起卦正確`);
