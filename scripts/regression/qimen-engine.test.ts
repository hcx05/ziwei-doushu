/**
 * 奇門遁甲引擎回歸（lib/systems/qimen/）—— 以明程道生《遁甲演義》（四庫全書本）為準
 *
 *   1) 局數表：卷二各例所稱「某節某元陰／陽遁幾局」十九條；
 *   2) 拆補定局：卷一「又引證」萬曆二十四年立春至驚蟄的殘局、上中元、補局逐段核對（用書中所記交節時刻）；
 *   3) 值符值使：卷一「時家奇門」陽遁一局、陰遁九局六旬的值符、值使；
 *   4) 轉盤：卷二「冬至陽遁時奇起例」「夏至陰遁時奇起例」兩個完整排盤，卷一「八門九星逐時移宮訣」；
 *   5) 八神：卷二陽一局、陰九局丙寅時九天、九地、太陰、六合的宮位；
 *   6) 卷二格局算例二十餘條：天上某干加地下某干在某宮；
 *   7) 置閏法：卷一超接置閏的規則（芒種、大雪超過九日置閏，小滿、小雪不置閏），以書中萬曆二十六年、二十九年的日數核對。
 */
import assert from 'node:assert/strict';
import {
  JU_TABLE, buildQimen, juChaiBu, yuanOf, zhiRunSchedule, type Dun, type JieqiEvent,
} from '../../lib/systems/qimen/engine';

// ── 1) 局數表 ────────────────────────────────────────────
const JU_CLAIMS: [string, number, Dun, number][] = [
  ['立秋', 0, '陰', 2], ['小暑', 1, '陰', 2], ['夏至', 1, '陰', 3], ['冬至', 2, '陽', 4], ['秋分', 2, '陰', 4],
  ['立春', 0, '陽', 8], ['小暑', 2, '陰', 5], ['小寒', 0, '陽', 2], ['大寒', 0, '陽', 3], ['小满', 0, '陽', 5],
  ['清明', 0, '陽', 4], ['立春', 2, '陽', 2], ['春分', 1, '陽', 9], ['立春', 1, '陽', 5], ['大寒', 1, '陽', 9],
  ['小满', 1, '陽', 2], ['小满', 2, '陽', 8], ['夏至', 0, '陰', 9], ['芒种', 0, '陽', 6],
];
for (const [q, y, dun, ju] of JU_CLAIMS) assert.deepEqual([JU_TABLE[q].dun, JU_TABLE[q].ju[y]], [dun, ju], `${q}${['上', '中', '下'][y]}元`);

// ── 2) 拆補：萬曆二十四年丙申正月 ─────────────────────────
// 「初九丙子日戊子時還是先年大寒下局，自丑時至亥十一時、初十丁丑日、十一戊寅日……俱借立春下局陽二遁」
const cb = (q: string, d: string) => { const r = juChaiBu(q, d); return `${r.dun}${r.ju}`; };
assert.equal(cb('大寒', '丙子'), '陽6', '丙子日子時，立春未交，仍是大寒下局');
for (const d of ['丙子', '丁丑', '戊寅']) assert.equal(cb('立春', d), '陽2', `${d} 立春下局（殘局）`);
for (const d of ['己卯', '壬午', '癸未']) assert.equal(cb('立春', d), '陽8', `${d} 立春上局`);
for (const d of ['甲申', '戊子']) assert.equal(cb('立春', d), '陽5', `${d} 立春中局`);
for (const d of ['己丑', '庚寅']) assert.equal(cb('立春', d), '陽2', `${d} 補足立春下局`);
assert.equal(cb('雨水', '辛卯'), '陽3', '辛卯辰時雨水，借雨水下局陽三');
assert.equal(cb('雨水', '甲午'), '陽9');
assert.equal(cb('雨水', '己亥'), '陽6');
for (const d of ['甲辰', '乙巳', '丙午']) assert.equal(cb('雨水', d), '陽3', `${d} 補足雨水下局`);
assert.equal(cb('惊蛰', '丙午'), '陽4', '丙午午時驚蟄，驚蟄下局陽四（殘局）');
assert.equal(cb('惊蛰', '己酉'), '陽1');
assert.equal(cb('惊蛰', '甲寅'), '陽7');
assert.equal(cb('惊蛰', '己未'), '陽4');
// 萬曆二十五年兩例（壬申日小滿中局陽二、辛丑日夏至中局陰三）
assert.equal(cb('小满', '壬申'), '陽2');
assert.equal(cb('夏至', '辛丑'), '陰3');
assert.deepEqual(['甲子', '己卯', '甲午', '己酉', '甲寅', '己巳', '甲辰', '己丑'].map(yuanOf), ['上元', '上元', '上元', '上元', '中元', '中元', '下元', '下元']);

// ── 3) 值符值使：卷一「時家奇門」 ────────────────────────
const FS_YANG1: [string, string, string][] = [['甲子', '天蓬', '休門'], ['甲戌', '天芮', '死門'], ['甲申', '天沖', '傷門'], ['甲午', '天輔', '杜門'], ['甲辰', '天禽', '死門'], ['甲寅', '天心', '開門']];
for (const [x, s, d] of FS_YANG1) { const c = buildQimen('陽', 1, '甲子', x); assert.deepEqual([c.zhiFu.star, c.zhiShi.door], [s, d], `陽一局${x}`); }
const FS_YIN9: [string, string, string][] = [['甲子', '天英', '景門'], ['甲戌', '天任', '生門'], ['甲申', '天柱', '驚門'], ['甲午', '天心', '開門'], ['甲辰', '天禽', '死門'], ['甲寅', '天輔', '杜門']];
for (const [x, s, d] of FS_YIN9) { const c = buildQimen('陰', 9, '甲子', x); assert.deepEqual([c.zhiFu.star, c.zhiShi.door], [s, d], `陰九局${x}`); }

// ── 4) 轉盤 ─────────────────────────────────────────────
/** 某宮的天盤星與天盤干、門、神 */
const at = (c: ReturnType<typeof buildQimen>, p: number) => c.palaces[p - 1];
const starAt = (c: ReturnType<typeof buildQimen>, star: string) => c.palaces.find(p => p.stars.includes(star))!.palace;
const doorAt = (c: ReturnType<typeof buildQimen>, door: string) => c.palaces.find(p => p.door === door)!.palace;
const shenAt = (c: ReturnType<typeof buildQimen>, s: string) => c.palaces.find(p => p.shen === s)!.palace;
// 冬至陽遁時奇起例：小滿中局陽二，壬申日丙午時
const e1 = buildQimen('陽', 2, '壬申', '丙午');
assert.deepEqual(Object.fromEntries(e1.palaces.map(p => [p.palace, p.earth])), { 1: '乙', 2: '戊', 3: '己', 4: '庚', 5: '辛', 6: '壬', 7: '癸', 8: '丁', 9: '丙' }, '甲子戊在坤……乙坎、丙離、丁艮');
assert.deepEqual([e1.zhiFu.star, e1.zhiFu.to, e1.zhiShi.door, e1.zhiShi.to], ['天心', 9, '開門', 8], '心星直符加離，開門直使加艮');
assert.deepEqual([starAt(e1, '天蓬'), starAt(e1, '天任'), starAt(e1, '天英')], [2, 7, 8], '蓬乙到坤、任丁到兌、英丙到艮');
assert.deepEqual([doorAt(e1, '景門'), doorAt(e1, '杜門')], [7, 2], '景門加兌、杜門加坤（門迫）');
// 夏至陰遁時奇起例：夏至中局陰三，辛丑日丙申時
const e2 = buildQimen('陰', 3, '辛丑', '丙申');
assert.deepEqual(Object.fromEntries(e2.palaces.map(p => [p.palace, p.earth])), { 1: '庚', 2: '己', 3: '戊', 4: '乙', 5: '丙', 6: '丁', 7: '癸', 8: '壬', 9: '辛' }, '甲子戊在震……乙巽、丙中、丁乾');
assert.deepEqual([e2.zhiFu.star, e2.zhiFu.to, e2.zhiShi.door, e2.zhiShi.to], ['天英', 2, '景門', 7], '英星直符加坤（丙寄坤），景門加兌');
assert.deepEqual([starAt(e2, '天禽'), starAt(e2, '天心'), starAt(e2, '天輔')], [7, 1, 9], '禽丙到兌、心丁到坎、輔乙到離');
assert.ok(at(e2, 7).heaven.includes('丙') && at(e2, 1).heaven.includes('丁') && at(e2, 9).heaven.includes('乙'));
for (const p of [9, 7, 1]) assert.ok(!['開門', '休門', '生門'].includes(at(e2, p).door!), '離兌坎三宮得奇不得門');
for (const p of [8, 3, 4]) assert.ok(['開門', '休門', '生門'].includes(at(e2, p).door!), '艮震巽三宮得門不得奇');
// 八門九星逐時移宮訣：陽一局乙丑時蓬星在九、休門在二；丙寅時蓬八、休三
const y1b = buildQimen('陽', 1, '甲子', '乙丑');
assert.deepEqual([starAt(y1b, '天蓬'), doorAt(y1b, '休門')], [9, 2]);
assert.ok(at(y1b, 2).heaven.includes('丙'), '休門丙奇在二坤');
const y1c = buildQimen('陽', 1, '甲子', '丙寅');
assert.deepEqual([starAt(y1c, '天蓬'), doorAt(y1c, '休門')], [8, 3]);
assert.ok(at(y1c, 3).heaven.includes('丙'), '休門丙奇在震');

// ── 5) 八神 ─────────────────────────────────────────────
assert.deepEqual(['值符', '九天', '九地', '太陰', '六合'].map(s => shenAt(y1c, s)), [8, 1, 6, 4, 9], '陽一局丙寅：直符八、九天一、九地六、太陰四、六合九');
const n9 = buildQimen('陰', 9, '甲子', '丙寅');
assert.deepEqual(['值符', '九天', '九地', '太陰', '六合'].map(s => shenAt(n9, s)), [2, 7, 6, 4, 3], '陰九局丙寅：直符二、九天七、九地六、太陰四、六合三');
assert.ok(n9.patterns.some(p => p.startsWith('地遁') && p.includes('8宮')), '陰九局丙寅：開門合六己下臨八宮，地遁');
assert.ok(y1c.patterns.some(p => p.startsWith('青龍返首') && p.includes('8宮')), '陽一局丙寅：直符甲子戊加八宮地丙，青龍返首');

// ── 6) 卷二格局算例：天盤某干加地盤某干在某宮 ─────────────
type Ex = [string, Dun, number, string, string, string, string, number];
const EXAMPLES: Ex[] = [
  // 名稱, 遁, 局, 日, 時, 天盤干, 地盤干, 宮
  ['天遁（陽四乙酉）', '陽', 4, '乙丑', '乙酉', '丙', '丁', 1],
  ['天遁（陰六庚申）', '陰', 6, '戊辰', '庚申', '丙', '丁', 9],
  ['地遁（陽一辛卯）', '陽', 1, '丙寅', '辛卯', '乙', '己', 2],
  ['飛鳥跌穴（陽九辛未）', '陽', 9, '甲子', '辛未', '丙', '戊', 9],
  ['飛鳥跌穴（陽三丁卯）', '陽', 3, '甲子', '丁卯', '丙', '戊', 3],
  ['青龍逃走（陰二己亥）', '陰', 2, '丙寅', '己亥', '乙', '辛', 8],
  ['白虎猖狂（陰二壬申）', '陰', 2, '甲子', '壬申', '辛', '乙', 3],
  ['朱雀投江（陰三壬申）', '陰', 3, '甲子', '壬申', '丁', '癸', 7],
  ['螣蛇夭矯（陽四戊子）', '陽', 4, '丙寅', '戊子', '癸', '丁', 1],
  ['大格（陰四丙寅）', '陰', 4, '甲子', '丙寅', '庚', '癸', 8],
  ['月朔格（陽八丁卯）', '陽', 8, '甲子', '丁卯', '庚', '己', 9],
  ['刑格（陽三丙寅）', '陽', 3, '甲子', '丙寅', '庚', '己', 4],
  ['熒入白（陽五戊戌）', '陽', 5, '丙寅', '戊戌', '丙', '庚', 7],
  ['熒入白（陰六丙寅）', '陰', 6, '甲子', '丙寅', '丙', '庚', 4],
  ['白入熒（陽四壬申）', '陽', 4, '甲子', '壬申', '庚', '丙', 2],
  ['白入熒（陰三戊寅）', '陰', 3, '乙丑', '戊寅', '庚', '丙', 2],
  ['飛干格（陽五庚午）', '陽', 5, '甲子', '庚午', '戊', '庚', 7],
  ['伏宮格（陽二壬申）', '陽', 2, '甲子', '壬申', '庚', '戊', 2],
  ['飛宮格（陽九庚午）', '陽', 9, '甲子', '庚午', '戊', '庚', 2],
  ['月奇入墓（陰四庚寅）', '陰', 4, '丙寅', '庚寅', '丙', '丙', 6],
];
for (const [name, dun, ju, day, hour, h, e, p] of EXAMPLES) {
  const c = buildQimen(dun, ju, day, hour);
  assert.ok(at(c, p).heaven.includes(h as never) && [at(c, p).earth, at(c, p).earthJi].includes(e as never), `${name}：應天盤${h}加地盤${e}於${p}宮，得 ${at(c, p).heaven.join('')}／${at(c, p).earth}`);
}
// 人遁：陽七局丙子時，休門與六丁下臨直符前二（太陰）六宮
const ren = buildQimen('陽', 7, '乙丑', '丙子');
assert.deepEqual([at(ren, 6).door, at(ren, 6).shen, at(ren, 6).heaven.includes('丁')], ['休門', '太陰', true]);
assert.ok(ren.patterns.some(p => p.startsWith('人遁')));
// 時格：陽二局己丑時，直符天輔加時干六己於三宮
const sg = buildQimen('陽', 2, '丙寅', '己丑');
assert.deepEqual([sg.zhiFu.star, sg.zhiFu.to], ['天輔', 3]);
// 格局判定
const pat = (dun: Dun, ju: number, day: string, hour: string, prefix: string) => buildQimen(dun, ju, day, hour).patterns.some(x => x.startsWith(prefix));
assert.ok(pat('陽', 9, '甲子', '辛未', '飛鳥跌穴'));
assert.ok(pat('陰', 3, '甲子', '壬申', '朱雀投江'));
assert.ok(pat('陰', 4, '甲子', '丙寅', '大格'));
assert.ok(pat('陽', 5, '甲子', '庚午', '飛干格'));
assert.ok(pat('陽', 2, '甲子', '壬申', '伏宮格'));
assert.ok(pat('陽', 9, '甲子', '庚午', '飛宮格'));
assert.ok(pat('陰', 4, '丙寅', '庚寅', '三奇入墓'));
assert.ok(pat('陽', 1, '甲子', '甲子', '伏吟'));
assert.ok(pat('陽', 1, '甲子', '庚午', '五不遇時'), '庚午時：時干庚克日干甲');

// ── 7) 置閏法 ───────────────────────────────────────────
// 以合成日數重現書中情形（日數為任意起點的日序；上元符頭每十五日一個）
const names = (segs: ReturnType<typeof zhiRunSchedule>) => segs.filter(x => x.yuan === '上元').map(x => `${x.jieqi}${x.run ? '閏' : ''}${x.lead}`);
// 萬曆二十九年：甲午超用芒種，甲辰交芒種（超十日）→ 己酉疊作芒種閏奇，其後夏至為接氣
assert.deepEqual(names(zhiRunSchedule(
  [{ name: '立夏', day: 1000 }, { name: '小满', day: 1020 }, { name: '芒种', day: 1040 }, { name: '夏至', day: 1055 }, { name: '小暑', day: 1071 }],
  [1000, 1015, 1030, 1045, 1060, 1075])), ['立夏0', '小满5', '芒种10', '芒种閏-5', '夏至-5', '小暑-4']);
// 萬曆二十六年：己卯超用大雪，十一日後交大雪 → 閏
assert.ok(zhiRunSchedule([{ name: '小雪', day: 1000 }, { name: '大雪', day: 1026 }, { name: '冬至', day: 1041 }], [1000, 1015, 1030, 1045]).some(x => x.run && x.jieqi === '大雪'));
// 「設遇小滿小雪二氣之交，雖超九日十日不可置閏」
assert.ok(!zhiRunSchedule([{ name: '立夏', day: 1000 }, { name: '小满', day: 1025 }, { name: '芒种', day: 1035 }], [1000, 1015, 1030]).some(x => x.run));
// 芒種超九日：未「過九日」，不置閏
assert.ok(!zhiRunSchedule([{ name: '小满', day: 1000 }, { name: '芒种', day: 1024 }, { name: '夏至', day: 1040 }], [1000, 1015, 1030]).some(x => x.run));

console.log(`✓ 奇門引擎：局數表 ${JU_CLAIMS.length} 條、萬曆二十四年拆補逐段、陽一陰九值符值使、兩個完整排盤、八神、卷二格局算例 ${EXAMPLES.length} 條與《遁甲演義》一致；置閏規則照書`);
