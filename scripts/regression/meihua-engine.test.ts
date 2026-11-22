/**
 * 梅花易數引擎回歸（lib/systems/meihua/）—— 以《梅花易數》卷一占例為準
 *
 *   書中每個占例都寫明瞭數、本卦、動爻、變卦、互卦，逐例核對：
 *     年月日時：觀梅、牡丹、起卦加數例（王、田、韓三家）；
 *     數：鄰夜扣門（一聲、五聲，加酉時）、今日動靜如何（平仄 8、5）、西林寺牌額（7、8 畫，添勾後 7、10 畫）；
 *     後天端法：老人有憂色、少年有喜色、牛哀鳴、雞悲鳴、枯枝墜地。
 *   體用：書中斷語寫明的體卦與生克（觀梅「兌金為體，離火克之」、牡丹「巽木為體，乾金克之」等）。
 *   卦氣：卷一「卦氣旺」「卦氣衰」兩表逐項核對；「卦以八除」「爻以六除」整除的口徑。
 */
import assert from 'node:assert/strict';
import {
  buildMeihua, castByNumber, castByTime, castByTrigrams, castByTwoNumbers, mod6, mod8, relationToTi, trigramQi, type MeihuaCast,
} from '../../lib/systems/meihua/engine';
import { tw } from '../../lib/systems/meihua/digest';
import { MEIHUA_TOPICS, WANWU } from '../../lib/systems/meihua/text.data';
import type { Branch } from '../../lib/systems/bazi/constants';

const B = '子丑寅卯辰巳午未申酉戌亥';
const no = (b: string) => B.indexOf(b) + 1;
type Want = { main: string; moving: number; changed: string; hu: string; ti?: string; rel?: Record<string, string> };
function check(label: string, cast: MeihuaCast, w: Want, month: Branch = '子') {
  const c = buildMeihua(cast, month);
  assert.equal(tw(c.main.fullName), w.main, `${label}：本卦`);
  assert.equal(c.moving, w.moving, `${label}：動爻`);
  assert.equal(tw(c.changed.name), w.changed, `${label}：變卦`);
  assert.equal(tw(c.hu.upper.name + c.hu.lower.name), w.hu, `${label}：互卦（上下）`);
  if (w.ti) assert.equal(tw(c.ti.trigram.name), w.ti, `${label}：體卦`);
  for (const [role, rel] of Object.entries(w.rel ?? {})) {
    assert.equal(c.pieces.find(p => p.role === role)?.relation, rel, `${label}：${role}對體`);
  }
  return c;
}

// ── 年月日時 ─────────────────────────────────────────────
// 觀梅：「辰年五數，十二月十二數，十七日十七數……餘二屬兌為上卦，加申時九數……為離作下卦……餘一為動爻，是為澤火革。初爻變咸，互見乾巽」
check('觀梅', castByTime(no('辰'), 12, 17, no('申')), { main: '澤火革', moving: 1, changed: '咸', hu: '乾巽', ti: '兌', rel: { 用: '克體' } });
// 牡丹：「巳年六數，三月三數，十六日……得天風姤……五爻動，變鼎卦，互見重乾」「巽木為體，乾金克之」
check('牡丹', castByTime(no('巳'), 3, 16, no('卯')), { main: '天風姤', moving: 5, changed: '鼎', hu: '乾乾', ti: '巽', rel: { 用: '克體', '互（上）': '克體' } });
// 起卦加數例：寅年十二月初一午時，王（四畫）「得豐變震，互見兌、巽」；田（六畫）「得水風井，變升，互見離、兌」；韓（二十一畫）「得益變中孚，互見艮、坤」
check('加數·王', castByTime(no('寅'), 12, 1, no('午'), 4), { main: '雷火豐', moving: 3, changed: '震', hu: '兌巽' });
check('加數·田', castByTime(no('寅'), 12, 1, no('午'), 6), { main: '水風井', moving: 5, changed: '升', hu: '離兌' });
check('加數·韓', castByTime(no('寅'), 12, 1, no('午'), 21), { main: '風雷益', moving: 2, changed: '中孚', hu: '艮坤' });

// ── 數 ──────────────────────────────────────────────────
// 鄰夜扣門：一聲乾、五聲巽，加酉時「共得十六數……天風姤。第四爻變巽卦，互見重乾」
check('扣門', castByTwoNumbers(1, 5, no('酉')), { main: '天風姤', moving: 4, changed: '巽', hu: '乾乾' });
// 今日動靜如何：平仄 8、5「為地風升。初爻動，變泰卦，互見震、兌」
check('今日動靜', castByTwoNumbers(8, 5), { main: '地風升', moving: 1, changed: '泰', hu: '震兌' });
// 西林寺：西七畫、林八畫「是山地剝卦。第三爻動，變艮，互見重坤」；添勾十畫「是為山澤損。第五爻變……中孚……互卦見坤、震」「用互俱生體」
check('西林寺', castByTwoNumbers(7, 8), { main: '山地剝', moving: 3, changed: '艮', hu: '坤坤' });
check('西林寺添勾', castByTwoNumbers(7, 10), { main: '山澤損', moving: 5, changed: '中孚', hu: '坤震', ti: '兌', rel: { 用: '生體', '互（上）': '生體' } });
// 物數：數為上卦，加時為下卦
const wu = castByNumber(5, no('午'));
assert.deepEqual([wu.upperSum, wu.lowerSum, wu.movingSum], [5, 12, 12]);

// ── 後天端法 ─────────────────────────────────────────────
// 老人有憂色：乾、巽方，卯時「總十數，除六得四為動爻，是為天風姤之九四」「巽木為體，乾金克之，互卦又見重乾」
check('老人', castByTrigrams('乾', '巽', no('卯')), { main: '天風姤', moving: 4, changed: '巽', hu: '乾乾', ti: '巽', rel: { 用: '克體', '互（上）': '克體', '互（下）': '克體' } });
// 少年有喜色：艮、離方，午時「總十七數，除十二，餘五為動爻……賁之家人，互見震、坎，離為體，互變俱生之」
check('少年', castByTrigrams('艮', '離', no('午')), { main: '山火賁', moving: 5, changed: '家人', hu: '震坎', ti: '離', rel: { '互（上）': '生體', 變: '生體' } });
// 牛哀鳴：坤、坎方，午時「共二十一數……三爻動得地水師……師變升，互坤、震，乃坤為體，互變俱克之」
check('牛', castByTrigrams('坤', '坎', no('午')), { main: '地水師', moving: 3, changed: '升', hu: '坤震', ti: '坤', rel: { '互（下）': '克體', 變: '克體' } });
// 雞悲鳴：巽、乾方，卯時「總十數，除六得四，爻動變乾，是為小畜之六四……互見離、兌。乾金為體，離火克之」
check('雞', castByTrigrams('巽', '乾', no('卯')), { main: '風天小畜', moving: 4, changed: '乾', hu: '離兌', ti: '乾', rel: { '互（上）': '克體' } });
// 枯枝墜地：離、兌方，辰時「總十數，去六餘四，變山澤損，是睽之九四……互見坎、離，兌金為體，離火克之」
check('枯枝', castByTrigrams('離', '兌', no('辰')), { main: '火澤睽', moving: 4, changed: '損', hu: '坎離', ti: '兌', rel: { 用: '克體' } });

// ── 乾坤無互，互其變卦 ───────────────────────────────────
const qian = buildMeihua(castByTwoNumbers(1, 1, 1), '子'); // 乾為天，三爻動 → 履
assert.equal(qian.hu.from, '變卦');
assert.equal(tw(qian.hu.upper.name + qian.hu.lower.name), '巽離', '履卦互卦：上巽下離');

// ── 卦以八除、爻以六除 ───────────────────────────────────
assert.deepEqual([mod8(8), mod8(16), mod8(9), mod6(6), mod6(12), mod6(13)], [8, 8, 1, 6, 6, 1]);

// ── 卦氣旺衰（卷一） ─────────────────────────────────────
const wang = { 春: '震巽', 夏: '離', 秋: '乾兌', 冬: '坎', 四季: '坤艮' } as const;
const shuai = { 春: '坤艮', 夏: '乾兌', 秋: '震巽', 冬: '離', 四季: '坎' } as const;
for (const s of ['春', '夏', '秋', '冬', '四季'] as const) {
  for (const t of ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤'] as const) {
    const want = wang[s].includes(t) ? '旺' : shuai[s].includes(t) ? '衰' : '平';
    assert.equal(trigramQi(t, s), want, `${s}${t}`);
  }
}
assert.equal(buildMeihua(castByTime(no('辰'), 12, 17, no('申')), '丑').season.season, '四季');
assert.equal(relationToTi('金', '土'), '生體');
assert.equal(relationToTi('金', '火'), '克體');
assert.equal(relationToTi('金', '木'), '體克');
assert.equal(relationToTi('金', '水'), '體生');

// ── 原文資料 ─────────────────────────────────────────────
assert.equal(MEIHUA_TOPICS.length, 18);
assert.ok(MEIHUA_TOPICS.find(t => t.topic === '求財')?.text.startsWith('占求財，以體為主，以用為財。'));
assert.ok(WANWU['乾'].startsWith('天、父、老人'));
assert.throws(() => castByTime(13, 1, 1, 1), /1–12/);
assert.throws(() => castByTwoNumbers(0, 3), /正整數/);

console.log('✓ 梅花引擎：卷一 13 個占例的本卦、動爻、變卦、互卦與體用生克全部吻合；卦氣旺衰表、乾坤互卦口徑正確');
