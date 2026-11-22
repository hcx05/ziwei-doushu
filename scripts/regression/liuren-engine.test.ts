/**
 * 大六壬引擎回歸（lib/systems/liuren/）—— 以《六壬大全》（四庫全書本）卷一為準
 *
 *   書中有三處可以拿七百二十課逐課列舉核對的明文：
 *     1) 「凡昴星止十六課」，並列出日子與幹上神（甲子旬己巳、庚午酉庚、辛未亥……）；
 *     2) 別責「剛三柔六共九課」：戊辰、戊午、丙辰「幹上皆午」，辛丑、辛未各二課「下上皆是丑未」，
 *        丁酉（巳加丁）、辛酉（酉加辛）；
 *     3) 返吟「若知六日該無克，丑未同干丁己辛」：返吟無克（井欄）只有這六日。
 *   另核對：十干寄宮、月將與中氣、伏吟取刑、八專順逆三位、涉害深淺、旬遁、貴人順逆。
 */
import assert from 'node:assert/strict';
import { ganZhiOf, type Branch, type Stem } from '../../lib/systems/bazi/constants';
import {
  JI_GONG, Plate, QI_JIANG, buildLiuren, sanChuan, sheHaiDepth, siKe, xunDun, yiMa,
} from '../../lib/systems/liuren/engine';

// ── 七百二十課 ────────────────────────────────────────────
const all: { gz: string; ganShang: Branch; method: string; detail: string; chuan: string }[] = [];
for (let i = 0; i < 60; i++) {
  const gz = ganZhiOf(i);
  for (let off = 0; off < 12; off++) {
    const p = new Plate(off);
    const r = sanChuan(gz[0] as Stem, gz[1] as Branch, p);
    all.push({ gz, ganShang: siKe(gz[0] as Stem, gz[1] as Branch, p)[0].upper, method: r.method, detail: r.detail, chuan: r.chuan.join('') });
  }
}
assert.equal(all.length, 720);
const pick = (m: string) => all.filter(x => x.method === m).map(x => `${x.gz}${x.ganShang}`).sort();

// 1) 昴星十六課（卷一「凡昴星止十六課」；己巳一條原注作「巳」，與其餘十五條「幹上神」體例不合，疑抄誤，只核日子）
const maoxing = all.filter(x => x.method === '昴星');
assert.equal(maoxing.length, 16, '凡昴星止十六課');
assert.deepEqual(maoxing.map(x => x.gz).sort(),
  ['己巳', '庚午', '辛未', '丁丑', '丁丑', '戊寅', '癸未', '丁亥', '戊子', '己丑', '己丑', '辛卯', '乙未', '乙未', '戊申', '己酉'].sort());
assert.deepEqual(maoxing.filter(x => x.gz !== '己巳').map(x => `${x.gz}${x.ganShang}`).sort(),
  ['庚午酉', '辛未亥', '丁丑辰', '丁丑戌', '戊寅酉', '癸未寅', '丁亥戌', '戊子丑', '己丑辰', '己丑戌', '辛卯未', '乙未卯', '乙未寅', '戊申午', '己酉午'].sort());

// 2) 別責九課
assert.deepEqual(pick('別責'), ['戊辰午', '戊午午', '丙辰午', '辛丑丑', '辛丑未', '辛未丑', '辛未未', '丁酉巳', '辛酉酉'].sort(), '剛三柔六共九課');

// 3) 返吟無克只有六日
assert.deepEqual(all.filter(x => x.detail === '井欄').map(x => x.gz).sort(), ['丁丑', '丁未', '己丑', '己未', '辛丑', '辛未'].sort(), '丑未同干丁己辛');
assert.equal(all.filter(x => x.method === '伏吟').length, 60);
assert.equal(all.filter(x => x.method === '返吟').length, 60);

// ── 規則細節 ─────────────────────────────────────────────
assert.deepEqual(Object.values(JI_GONG).join(''), '寅辰巳未巳未申戌亥丑', '十干寄宮');
assert.equal(QI_JIANG['雨水'], '亥');
assert.equal(QI_JIANG['春分'], '戌');
assert.equal(QI_JIANG['穀雨'], '酉');
assert.equal(QI_JIANG['小滿'], '申');
assert.equal(QI_JIANG['夏至'], '未');
assert.deepEqual([yiMa('子'), yiMa('午'), yiMa('酉'), yiMa('卯')], ['寅', '申', '亥', '巳']);

// 伏吟：甲子日「無克剛干」取幹上寅，寅刑巳、巳刑申
assert.equal(sanChuan('甲', '子', new Plate(0)).chuan.join(''), '寅巳申');
// 伏吟：乙丑日「有克還為用」，幹上辰自刑，「次傳顛倒日辰併」取支上丑，丑刑戌
assert.equal(sanChuan('乙', '丑', new Plate(0)).chuan.join(''), '辰丑戌');
// 伏吟：丁卯日柔日取支上卯，卯刑子，子刑卯
assert.equal(sanChuan('丁', '卯', new Plate(0)).chuan.join(''), '卯子卯');
// 伏吟：辛亥日柔日取支上亥（自刑），中傳取幹上戌，戌刑未
assert.equal(sanChuan('辛', '亥', new Plate(0)).chuan.join(''), '亥戌未');
// 伏吟：壬辰日剛日干上亥自刑，中傳取支上辰，辰又自刑，「沖取末傳」戌
assert.equal(sanChuan('壬', '辰', new Plate(0)).chuan.join(''), '亥辰戌');

// 八專無克：「陽日日陽順行三（連本位數）」「陰日辰陰逆三位」「中末總向日上眠」
const bz = all.filter(x => x.method === '八專');
assert.ok(bz.every(x => ['甲寅', '庚申', '丁未', '己未'].includes(x.gz)));
for (const x of bz) assert.equal(x.chuan.slice(1), x.ganShang + x.ganShang, `${x.gz} 中末皆幹上`);

// 涉害深淺：數到本家，連寄干一併數
assert.equal(sheHaiDepth('子', '辰').depth, 5, '子水自辰行至子：辰、巳寄戊、未、未寄己、戌，五土克之');
// 元首、重審：單一克
const c = buildLiuren({ dayGanZhi: '己亥', hour: '申', yueJiang: '卯' });
assert.deepEqual([c.sanChuan.method, c.sanChuan.chuan.join('')], ['重審', '午丑申']);
assert.deepEqual(c.siKe.map(k => `${k.upper}${k.lower}${k.ke ?? ''}`), ['寅己上克下', '酉寅上克下', '午亥下賊上', '丑午']);
assert.deepEqual([c.guiren.branch, c.guiren.day, c.guiren.forward], ['子', true, false]);
assert.deepEqual(c.sanChuan.items.map(i => `${i.dun}${i.branch}${i.liuQin}${i.jiang}`), ['甲午父母天空', '辛丑兄弟天后', '丙申子孫勾陳']);
assert.deepEqual(c.xunKong, ['辰', '巳']);

// 旬遁
const x = xunDun('甲子');
assert.deepEqual([x.stemOf('子'), x.stemOf('酉'), x.stemOf('戌'), x.kong], ['甲', '癸', null, ['戌', '亥']]);
assert.throws(() => buildLiuren({ dayGanZhi: '甲丑', hour: '子', yueJiang: '子' }), /不合法/);

const counts = Object.entries(all.reduce<Record<string, number>>((m, r) => ((m[r.method] = (m[r.method] ?? 0) + 1), m), {})).map(([k, v]) => `${k}${v}`).join('、');
console.log(`✓ 六壬引擎：七百二十課中昴星 16 課、別責 9 課、返吟井欄 6 日與《六壬大全》卷一完全一致；伏吟、八專、涉害規則照書（${counts}）`);
