/**
 * 三盤疊宮（lib/systems/ziwei/layers.ts）迴歸：
 *   1) 以本命命宮為一層時，每宮的層宮名與引擎排出的本命宮名完全一致（走法與排盤同一方向）；
 *   2) 大限層：每個大限宮在自己那一層叫「命宮」，往前一宮（地支減一）叫兄弟；
 *   3) yearContext 依虛歲落在正確的大限，童限、超出範圍也處理；
 *   4) yearHits 只列落入或化忌對沖該宮的四化，不多不少。
 */
import assert from 'node:assert/strict';
import { generateChart } from '../../lib/systems/ziwei/algorithm';
import { BRANCHES } from '../../lib/systems/ziwei/constants';
import {
  branchOfLayerPalace, branchOfStar, layerPalaceName, locate, normalizePalaceName, yearContext, yearHits,
} from '../../lib/systems/ziwei/layers';
import { CHILDHOOD_DAXIAN_INDEX } from '../../lib/systems/ziwei/yunxian-context';

let seed = 20261122;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };

let charts = 0;
for (let i = 0; i < 300; i++) {
  const year = 1930 + rnd(90), month = 1 + rnd(12), day = 1 + rnd(28), hour = rnd(12);
  const chart = generateChart({ year, month, day, hour, gender: rnd(2) ? 'male' : 'female' } as never);
  charts++;
  for (const p of chart.palaces) {
    assert.equal(layerPalaceName(chart.mingGongBranch, p.branch), p.name, `${year}-${month}-${day} ${BRANCHES[p.branch]}宮本命層宮名`);
    assert.equal(branchOfLayerPalace(chart.mingGongBranch, p.name), p.branch);
  }
  for (const dx of chart.daXians) {
    assert.equal(layerPalaceName(dx.palaceBranch, dx.palaceBranch), '命宮');
    assert.equal(layerPalaceName(dx.palaceBranch, (dx.palaceBranch + 11) % 12), '兄弟');
  }
  // 每個大限內的任一年都落回該大限
  chart.daXians.forEach((dx, k) => {
    const y = chart.lunarInfo.lunarYear + dx.startAge - 1 + rnd(10);
    const ctx = yearContext(chart, y);
    assert.equal(ctx.daXianIndex, k, `${y} 應在第 ${k} 個大限`);
    assert.equal(ctx.daXianBranch, dx.palaceBranch);
    assert.equal(ctx.liuNianBranch, ((y - 4) % 12 + 12) % 12);
  });
  if (chart.daXians[0].startAge > 1) {
    assert.equal(yearContext(chart, chart.lunarInfo.lunarYear).daXianIndex, CHILDHOOD_DAXIAN_INDEX, '一歲應為童限');
  }
}

// 示範盤：1990-06-15 巳時 女（命宮丑，當前大限在戌）
const demo = generateChart({ year: 1990, month: 6, day: 15, hour: 5, gender: 'female' } as never);
const ctx = yearContext(demo, 2026);
assert.equal(ctx.daXianBranch, 10);
assert.equal(locate(demo, 8, ctx.layers), '本命疾厄／大限夫妻／流年福德');
assert.equal(locate(demo, 6, ctx.layers), '本命僕役／大限財帛／流年命宮');
assert.equal(branchOfStar(demo, '廉貞'), 8);
const hits = yearHits(demo, ctx, '夫妻');
assert.deepEqual(hits, [
  '流年化祿天同入本命夫妻', '流年化忌廉貞入大限夫妻',
  '大限化祿天同入本命夫妻', '大限化忌廉貞入大限夫妻',
  '生年化忌天同入本命夫妻',
]);
assert.ok(yearHits(demo, yearContext(demo, 2027), '夫妻').includes('生年化忌天同沖流年夫妻（落對宮亥）'));
assert.equal(normalizePalaceName('婚姻'), '夫妻');
assert.equal(normalizePalaceName('官祿宮'), '官祿');
assert.equal(normalizePalaceName('交友'), '僕役');
assert.equal(normalizePalaceName('隨便'), undefined);

console.log(`✓ 三盤疊宮：${charts} 張盤本命層宮名與引擎一致、大限／流年／童限定位正確、四化碰宮列舉正確`);
