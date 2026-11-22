/**
 * lib/systems/liuyao/digest.ts —— 六爻卦 → 給模型讀的文本摘要（只放工具確定性算出的事實）
 */
import { YONGSHEN_GUIDE } from './constants';
import type { LiuyaoChart } from './engine';

const POS = ['初', '二', '三', '四', '五', '上'];
const VALUE_LABEL: Record<number, string> = { 6: '老陰（動）', 7: '少陽', 8: '少陰', 9: '老陽（動）' };

export function buildLiuyaoDigest(c: LiuyaoChart): string {
  const L: string[] = [];
  if (c.assumptions.length) L.push(...c.assumptions, '');

  L.push('【起卦】');
  L.push(`方法：${c.method}`);
  L.push(`起卦時間：${c.calendar.moment}`);
  L.push(`爻值（自下而上）：${c.values.map((v, i) => `${POS[i]}${VALUE_LABEL[v]}`).join('、')}`);

  const m = c.main;
  L.push('', '【卦象】');
  L.push(`本卦：${m.text.fullName}（第${m.text.no}卦），${m.palace.name}宮${m.palaceOrder}卦，宮屬${m.palace.wuXing}；世在${POS[m.shi - 1]}爻，應在${POS[m.ying - 1]}爻`);
  L.push(c.changed
    ? `變卦：${c.changed.text.fullName}（第${c.changed.text.no}卦），${c.changed.palace.name}宮${c.changed.palaceOrder}卦`
    : '變卦：無（六爻皆靜）');
  L.push(`月建：${c.calendar.monthGanZhi}（${c.calendar.monthBranch}月）；日辰：${c.calendar.dayGanZhi}；旬空：${c.calendar.xunKong.join('')}`);

  L.push('', '【裝卦】（自上而下；六親以本卦宮五行論）');
  for (const l of [...c.lines].reverse()) {
    const marks = [l.shi && '世', l.ying && '應', l.moving && (l.yang ? '○動' : '×動')].filter(Boolean).join(' ');
    const facts = [
      `月令${l.monthState}`,
      l.monthBreak && '月破',
      l.dayClash && '日沖',
      l.empty && '旬空',
    ].filter(Boolean).join('、');
    let line = `${POS[l.position - 1]}爻 ${l.yang ? '▅▅▅▅▅' : '▅▅ ▅▅'}  ${l.liuShen}  ${l.liuQin}${l.stem}${l.branch}${l.wuXing}`;
    if (marks) line += `  ${marks}`;
    line += `  ［${facts}］`;
    if (l.changed) line += `  → 化${l.changed.liuQin}${l.changed.stem}${l.changed.branch}${l.changed.wuXing}${l.changed.effects.length ? `（${l.changed.effects.join('、')}）` : ''}`;
    if (l.hidden) line += `  伏：${l.hidden.liuQin}${l.hidden.stem}${l.hidden.branch}${l.hidden.wuXing}`;
    L.push(line);
  }
  if (c.missingLiuQin.length) L.push(`本卦不現：${c.missingLiuQin.join('、')}（伏神取自${m.palace.name}為${m.palace.nature}卦同位之爻）`);

  L.push('', '【取用神參考】（問事類別 → 用神；類別不明或用神兩現時的取捨屬於溯因）');
  for (const g of YONGSHEN_GUIDE) L.push(`- ${g.yongShen}：${g.topics}`);

  L.push('', `【經文】按朱熹《易學啟蒙》占法——${c.reading.rule}`);
  for (const t of c.reading.texts) L.push(`- ${t.label}：「${t.text}」`);
  L.push(`本卦卦辭：「${m.text.guaCi}」`);
  if (c.changed) L.push(`變卦卦辭：「${c.changed.text.guaCi}」`);
  L.push('（經文來自《周易》原文，校勘見倉庫 docs/zhouyi-collation.md；把經文套到所問之事上屬於溯因。）');
  return L.join('\n');
}
