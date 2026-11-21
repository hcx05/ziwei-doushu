/**
 * 六爻引擎回归（lib/systems/liuyao/）
 *
 *   1) 《周易》数据：64 卦、卦象互不重复；每条爻辞的爻题（初九、六二……上六）与该爻阴阳一致；只有乾坤有用九用六；
 *   2) 八宫：程序按「本宫→一世…五世→游魂→归魂」推出的表，与手写的京房八宫六十四卦表逐卦一致，世爻位置正确；
 *   3) 纳甲装卦：天风姤、水火既济两个教科书例逐爻比对（干支、六亲、世应、伏神）；
 *   4) 六神起法、朱熹占法（0–6 爻变）、时间起卦算式、月建日辰（日辰另以儒略日独立推算）、海外时区。
 */
import assert from 'node:assert/strict';
import { ZHOUYI } from '../../lib/systems/liuyao/zhouyi.data';
import { PALACE_TABLE, buildLiuyao, hexagramInfo, parseYaoDigits, timeCast, zhuXiReading } from '../../lib/systems/liuyao/engine';
import { ganZhiOf } from '../../lib/systems/bazi/constants';

// ── 1) 经文数据 ─────────────────────────────────────────────
assert.equal(ZHOUYI.length, 64);
assert.equal(new Set(ZHOUYI.map(h => h.lines)).size, 64);
assert.deepEqual(ZHOUYI.map(h => h.no), Array.from({ length: 64 }, (_, i) => i + 1));
const POS = ['初', '二', '三', '四', '五', '上'];
for (const h of ZHOUYI) {
  h.yaoCi.forEach((y, i) => {
    const num = h.lines[i] === '1' ? '九' : '六';
    const title = i === 0 || i === 5 ? POS[i] + num : num + POS[i];
    assert.ok(y.startsWith(title + '：'), `${h.name}第${i + 1}爻爻题应为「${title}」：${y}`);
  });
  assert.equal(Boolean(h.yong), h.name === '乾' || h.name === '坤', `${h.name} 用九 / 用六`);
}
assert.equal(ZHOUYI[0].yong, '用九：见群龙无首，吉。');
assert.equal(ZHOUYI.find(h => h.name === '屯')!.lines, '100010', '屯：震下坎上（自下而上）');

// ── 2) 八宫 ─────────────────────────────────────────────────
const EIGHT_PALACES: Record<string, string[]> = {
  乾: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  坎: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  艮: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  震: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  巽: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  离: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  坤: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  兑: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
};
const SHI = [6, 1, 2, 3, 4, 5, 4, 3];
let palaceChecked = 0;
for (const [palace, list] of Object.entries(EIGHT_PALACES)) {
  list.forEach((full, order) => {
    const h = ZHOUYI.find(x => x.fullName === full);
    assert.ok(h, `经文数据里找不到 ${full}`);
    const p = PALACE_TABLE.get(h.lines)!;
    assert.equal(p.palace.name, palace, `${full} 应属${palace}宫`);
    assert.equal(p.order, order, `${full} 在${palace}宫的次序`);
    assert.equal(hexagramInfo(h.lines).shi, SHI[order], `${full} 世爻`);
    palaceChecked++;
  });
}
assert.equal(palaceChecked, 64);

// ── 3) 纳甲装卦 ─────────────────────────────────────────────
const at = { year: 2026, month: 11, day: 21, hour: 15, minute: 20 };
const gou = buildLiuyao(parseYaoDigits('877777'), at, '手动');
assert.equal(gou.main.text.fullName, '天风姤');
assert.deepEqual(gou.lines.map(l => l.stem + l.branch + l.liuQin), ['辛丑父母', '辛亥子孙', '辛酉兄弟', '壬午官鬼', '壬申兄弟', '壬戌父母']);
assert.deepEqual([gou.main.shi, gou.main.ying], [1, 4]);
assert.deepEqual(gou.missingLiuQin, ['妻财']);
assert.deepEqual(gou.lines[1].hidden && [gou.lines[1].hidden.stem + gou.lines[1].hidden.branch, gou.lines[1].hidden.liuQin], ['甲寅', '妻财'], '姤卦二爻下伏甲寅妻财');
assert.equal(gou.changed, null);

const jj = buildLiuyao(parseYaoDigits('987678'), at, '手动');
assert.equal(jj.main.text.fullName, '水火既济');
assert.equal(jj.changed?.text.fullName, '泽山咸');
assert.deepEqual(jj.lines.map(l => l.stem + l.branch + l.liuQin), ['己卯子孙', '己丑官鬼', '己亥兄弟', '戊申父母', '戊戌官鬼', '戊子兄弟']);
assert.equal(jj.lines[2].hidden?.stem + '' + jj.lines[2].hidden?.branch, '戊午', '既济三爻下伏戊午妻财');
assert.equal(jj.lines[0].changed?.stem + '' + jj.lines[0].changed?.branch, '丙辰', '初爻己卯化丙辰');
assert.equal(jj.lines[3].changed?.stem + '' + jj.lines[3].changed?.branch, '丁亥', '四爻戊申化丁亥');
assert.equal(jj.lines[0].changed?.liuQin, '官鬼', '变爻六亲仍以本卦坎宫水论');

// ── 4) 月建日辰（日辰以儒略日独立推算） ──────────────────────
const jdn = (y: number, m: number, d: number) => {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
};
assert.equal(gou.calendar.dayGanZhi, ganZhiOf(jdn(2026, 11, 21) - 11));
assert.equal(gou.calendar.monthGanZhi, '己亥', '2026 立冬后为亥月，丙年亥月起己亥');
assert.deepEqual(gou.calendar.xunKong, ['辰', '巳']);
const late = buildLiuyao(parseYaoDigits('877777'), { ...at, hour: 23 }, '手动');
assert.equal(late.calendar.dayGanZhi, ganZhiOf(jdn(2026, 11, 22) - 11), '23 点起卦日辰按次日');
assert.ok(late.assumptions[0].startsWith('⚠ 假设：'));
// 2026 立冬 = 北京 11/7 17:52。纽约 11/7 06:00（UTC−5）= 北京 19:00，已过立冬；若误把 06:00 当北京时间就会落在戌月
const ny = buildLiuyao(parseYaoDigits('877777'), { year: 2026, month: 11, day: 7, hour: 6, minute: 0, utcOffset: -5 }, '手动');
assert.equal(ny.calendar.monthBranch, '亥', '月建应按换算后的北京时刻对节气');
assert.equal(buildLiuyao(parseYaoDigits('877777'), { year: 2026, month: 11, day: 7, hour: 6, minute: 0 }, '手动').calendar.monthBranch, '戌');
assert.equal(ny.calendar.dayGanZhi, ganZhiOf(jdn(2026, 11, 7) - 11), '日辰按当地日期');

// ── 5) 六神 ─────────────────────────────────────────────────
// 2026-11-21 己亥日：己日起螣蛇
assert.deepEqual(gou.lines.map(l => l.liuShen), ['螣蛇', '白虎', '玄武', '青龙', '朱雀', '勾陈']);

// ── 6) 朱熹占法 ─────────────────────────────────────────────
const qian = ZHOUYI[0], kun = ZHOUYI[1];
const rule = (n: number[]) => zhuXiReading(jj.main.text, jj.changed!.text, n).rule.slice(0, 4);
assert.equal(zhuXiReading(qian, null, []).texts[0].text, qian.guaCi);
assert.equal(zhuXiReading(qian, kun, [3]).texts[0].text, qian.yaoCi[2]);
assert.deepEqual(zhuXiReading(qian, kun, [2, 5]).texts.map(t => t.text), [qian.yaoCi[4], qian.yaoCi[1]], '二爻变以上爻为主');
assert.equal(rule([1, 2, 3]), '三爻变：');
const four = zhuXiReading(qian, kun, [1, 2, 3, 4]);
assert.deepEqual(four.texts.map(t => t.text), [kun.yaoCi[4], kun.yaoCi[5]], '四爻变看之卦二不变爻，以下爻为主');
assert.deepEqual(zhuXiReading(qian, kun, [1, 2, 3, 4, 5]).texts.map(t => t.text), [kun.yaoCi[5]]);
assert.equal(zhuXiReading(qian, kun, [1, 2, 3, 4, 5, 6]).texts[0].text, '用九：见群龙无首，吉。');
assert.equal(zhuXiReading(jj.main.text, jj.changed!.text, [1, 2, 3, 4, 5, 6]).texts[0].text, jj.changed!.text.guaCi);

// ── 7) 时间起卦 ─────────────────────────────────────────────
// 午年（7）十月十三日申时（9）：30 % 8 = 6 坎上；39 % 8 = 7 艮下；39 % 6 = 3 三爻动 → 水山蹇
const tc = timeCast(6, 10, 13, 8);
const tcChart = buildLiuyao(tc.values, at, '时间');
assert.equal(tcChart.main.text.fullName, '水山蹇');
assert.deepEqual(tcChart.lines.filter(l => l.moving).map(l => l.position), [3]);
const tc0 = timeCast(0, 1, 7, 0); // 1+1+7=9 → 1 乾；+1=10 → 2 兑，10%6=4
assert.equal(buildLiuyao(tc0.values, at, '时间').main.text.fullName, '天泽履');
assert.throws(() => parseYaoDigits('78967'), /6 位/);
assert.throws(() => parseYaoDigits('789675'), /6 位/);

console.log(`✓ 六爻引擎：周易 64 卦经文与爻题一致；八宫 ${palaceChecked} 卦与京房表一致；纳甲、伏神、变爻、六神、月建日辰、朱熹占法、时间起卦正确`);
