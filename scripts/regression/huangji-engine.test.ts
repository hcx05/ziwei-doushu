/**
 * 皇極經世引擎回歸（lib/systems/huangji/）
 *
 *   1) 編排：一元十二會、一會三十運、一運十二世、一世三十年；會月、運星、世辰的循環標記與卷一一致
 *      （「月寅三 星甲六十一 辰子七百二十一」等）；
 *   2) 定年錨點：卷五上「經世之申二千一百五十七／甲子唐帝堯二十一年」= 公元前 2337 年，
 *      卷六下「經世之申二千二百六十五／甲子……改元天祐」= 公元 904 年、「經世之酉二千二百六十六／甲午後唐閔帝……改元應順」= 934 年；
 *   3) 逐年紀事：抽查史書年代清楚的事件（焚書、坑儒、長平、秦滅齊、建安、永嘉、貞觀）落在正確公元年；
 *      每年干支與一般年干支一致；資料的缺行、缺頁標記可被查出。
 */
import assert from 'node:assert/strict';
import { ganZhiOf } from '../../lib/systems/bazi/constants';
import { CHRONICLE } from '../../lib/systems/huangji/chronicle.data';
import { CHRONICLE_RANGE, locate, searchChronicle } from '../../lib/systems/huangji/engine';

// ── 1) 編排 ────────────────────────────────────────────────
/** 本元第 n 年 → 使用者輸入的公元年（負數為公元前） */
const yearOfN = (n: number) => { const astro = n - 67017; return astro <= 0 ? astro - 1 : astro; };
const p721 = locate(yearOfN(720 * 30 + 1));
assert.deepEqual([p721.hui.label, p721.hui.no, p721.yun.label, p721.yun.no, p721.shi.label, p721.shi.no, p721.yearInShi],
  ['月寅', 3, '星甲', 61, '辰子', 721, 1], '卷一：日甲一 月寅三 星甲六十一 辰子七百二十一');
const first = locate(yearOfN(1));
assert.deepEqual([first.n, first.ganZhi, first.hui.label, first.yun.label, first.shi.label], [1, '甲子', '月子', '星甲', '辰子'], '元之首年');
assert.throws(() => locate(yearOfN(1) - 1), /超出本元範圍/);
assert.equal(locate(yearOfN(129600)).shi.no, 4320);
assert.throws(() => locate(yearOfN(129601)), /超出本元範圍/);
assert.throws(() => locate(0), /非零整數/);

// ── 2) 錨點 ────────────────────────────────────────────────
const yao21 = locate(-2337);
assert.deepEqual([yao21.ganZhi, yao21.hui.label, yao21.yun.label, yao21.yun.no, yao21.shi.label, yao21.shi.no, yao21.yearInShi],
  ['甲子', '月巳', '星癸', 180, '辰申', 2157, 1], '經元之甲一、經會之巳六、經運之癸一百八十、經世之申二千一百五十七');
assert.equal(yao21.chronicle.entry?.text, '唐帝堯二十一年');
const yao1 = locate(-2357);
assert.equal(yao1.ganZhi, '甲辰');
assert.ok(yao1.chronicle.entry?.text.startsWith('唐帝堯肇位于平陽'));
const tianyou = locate(904);
assert.deepEqual([tianyou.shi.no, tianyou.yearInShi, tianyou.ganZhi], [2265, 1, '甲子']);
assert.ok(tianyou.chronicle.entry?.text.includes('改元天祐'));
const yingshun = locate(934);
assert.deepEqual([yingshun.shi.no, yingshun.ganZhi], [2266, '甲午']);
assert.ok(yingshun.chronicle.entry?.text.includes('改元應順'));
const now = locate(2026);
assert.deepEqual([now.hui.label, now.yun.no, now.yun.inHui, now.shi.no, now.yearInShi, now.chronicle.status], ['月午', 192, 12, 2302, 13, 'out-of-range']);
assert.deepEqual(now.yun.span, ['公元 1744 年', '公元 2103 年'], '午會第十二運');

// ── 3) 逐年紀事 ────────────────────────────────────────────
const at = (kw: string) => searchChronicle(kw, 5).map(h => h.position.label);
assert.ok(at('聚天下書焚之').includes('公元前 213 年'), '焚書');
assert.ok(at('聚天下學士于驪山坑之').includes('公元前 212 年'), '坑儒');
assert.ok(at('大敗趙軍于長平').includes('公元前 260 年'), '長平之戰');
assert.ok(at('王翦滅齊').includes('公元前 221 年'), '秦滅齊');
assert.ok(at('改元建安').includes('公元 196 年'));
assert.ok(at('晉改元永嘉').includes('公元 307 年'));
assert.ok(at('改元貞觀').includes('公元 627 年'));
let checked = 0;
for (const e of CHRONICLE) {
  const astro = -2366 + (e.shi - 2156) * 30 + (e.n - 1); // 世 2156 第 1 年 = 公元前 2367 年（天文紀年 −2366）
  assert.equal(e.gz, ganZhiOf(astro - 4), `世${e.shi}第${e.n}年干支`);
  checked++;
}
assert.equal(CHRONICLE.filter(e => e.missing).length > 0, true, '資料應標出原文缺行');
assert.equal(locate(450).chronicle.status, 'gap', '世 2248 後段維基文庫缺頁');
assert.equal(locate(1000).chronicle.status, 'out-of-range');
assert.deepEqual(CHRONICLE_RANGE, { from: '公元前 2367 年', to: '公元 963 年' });
assert.throws(() => searchChronicle('  '), /不能為空/);

console.log(`✓ 皇極經世引擎：元會運世編排與卷一一致；堯、天祐、應順三錨點吻合；${checked} 年干支連續、焚書坑儒長平等七事年代正確`);
