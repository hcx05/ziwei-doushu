/**
 * lib/systems/bazi/digest.ts —— 八字 → 給模型讀的文本摘要（只放引擎確定性算出的事實）
 */
import { BRANCH_WUXING, WUXING, shiShen, type Branch, type Stem } from './constants';
import { PILLAR_LABEL, type BaziChart, type Relation } from './engine';

function relLine(r: Relation): string {
  return `- ${r.kind}：${r.detail}（${r.members.join('、')}）`;
}

export function buildBaziDigest(c: BaziChart): string {
  const L: string[] = [];
  if (c.assumptions.length) L.push(...c.assumptions, '');

  L.push('【時間】');
  L.push(`標準時間（東八區）：${c.time.standard}`);
  L.push(c.time.trueSolar
    ? `真太陽時：${c.time.trueSolar}${c.time.corrected ? '' : '（未給經度，未校正）'}`
    : '真太陽時：時辰不詳，未計算');
  for (const n of c.notes) L.push(`- ${n}`);

  L.push('', '【四柱】');
  for (const p of c.pillars) {
    const hidden = p.hidden.map(h => `${h.stem}(${h.shiShen})`).join(' ');
    L.push(`${PILLAR_LABEL[p.key]}：${p.ganZhi}　天干${p.stem}＝${p.stemShiShen}　藏干 ${hidden}　納音${p.naYin}`);
  }
  const dm = c.dayMaster;
  L.push(`日主：${dm.stem}（${dm.yang ? '陽' : '陰'}${dm.wuXing}）`);

  L.push('', '【月令與根氣】');
  L.push(`月令：${c.season.monthBranch}，當令五行為${c.season.seasonWuXing}；日主${dm.wuXing}在月令為「${c.season.dayMasterState}」`);
  L.push(c.roots.length
    ? `日主通根：${c.roots.map(r => `${PILLAR_LABEL[r.pillar]}${r.branch}藏${r.stem}（${r.position}）`).join('、')}`
    : '日主通根：地支藏干中無與日主同五行者');
  const g = c.shiShenGroups;
  L.push(`天干十神（不含日主）：比劫${g.比劫}、印${g.印}、食傷${g.食傷}、財${g.財}、官殺${g.官殺}`);
  L.push(`五行個數（天干＋地支本氣）：${WUXING.map(w => `${w}${c.wuXingCount.surface[w]}`).join(' ')}`);
  L.push(`五行個數（天干＋全部藏干）：${WUXING.map(w => `${w}${c.wuXingCount.withHidden[w]}`).join(' ')}`);
  L.push('（以上只是計數，不同流派對強弱的計分方法不同，強弱結論屬於溯因。）');

  L.push('', '【原局干支作用】');
  L.push(c.relations.length ? c.relations.map(relLine).join('\n') : '- 原局四柱之間沒有合、沖、刑、害');
  L.push(`旬空：日柱旬空 ${c.xunKong.day.join('')}；年柱旬空 ${c.xunKong.year.join('')}`);

  L.push('', '【大運】');
  const s = c.yun.start;
  L.push(`${c.yun.forward ? '順排' : '逆排'}；出生後 ${s.years} 年 ${s.months} 個月 ${s.days} 天起運（約 ${s.solar}）。歲數為虛歲。`);
  for (const d of c.yun.steps) {
    const ss = shiShen(dm.stem, d.ganZhi[0] as Stem);
    L.push(`- 第${d.index}步 ${d.ganZhi}（天干${ss}，地支${d.ganZhi[1]}屬${BRANCH_WUXING[d.ganZhi[1] as Branch]}）：${d.startYear}–${d.endYear}，虛歲 ${d.startAge}–${d.endAge}`);
  }

  if (c.liunian) {
    const ln = c.liunian;
    L.push('', `【流年 ${ln.year}】`);
    L.push(`流年干支：${ln.ganZhi}（以立春換年）；天干對日主為${shiShen(dm.stem, ln.ganZhi[0] as Stem)}`);
    L.push(ln.daYun ? `所在大運：第${ln.daYun.index}步 ${ln.daYun.ganZhi}（${ln.daYun.startYear}–${ln.daYun.endYear}）` : '所在大運：尚未起運');
    L.push(ln.relations.length ? ln.relations.map(relLine).join('\n') : '- 大運、流年與原局之間沒有合、沖、刑、害');
  }
  return L.join('\n');
}

