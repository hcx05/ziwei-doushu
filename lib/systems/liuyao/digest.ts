/**
 * lib/systems/liuyao/digest.ts —— 六爻卦 → 给模型读的文本摘要（只放工具确定性算出的事实）
 */
import { YONGSHEN_GUIDE } from './constants';
import type { LiuyaoChart } from './engine';

const POS = ['初', '二', '三', '四', '五', '上'];
const VALUE_LABEL: Record<number, string> = { 6: '老阴（动）', 7: '少阳', 8: '少阴', 9: '老阳（动）' };

export function buildLiuyaoDigest(c: LiuyaoChart): string {
  const L: string[] = [];
  if (c.assumptions.length) L.push(...c.assumptions, '');

  L.push('【起卦】');
  L.push(`方法：${c.method}`);
  L.push(`起卦时间：${c.calendar.moment}`);
  L.push(`爻值（自下而上）：${c.values.map((v, i) => `${POS[i]}${VALUE_LABEL[v]}`).join('、')}`);

  const m = c.main;
  L.push('', '【卦象】');
  L.push(`本卦：${m.text.fullName}（第${m.text.no}卦），${m.palace.name}宫${m.palaceOrder}卦，宫属${m.palace.wuXing}；世在${POS[m.shi - 1]}爻，应在${POS[m.ying - 1]}爻`);
  L.push(c.changed
    ? `变卦：${c.changed.text.fullName}（第${c.changed.text.no}卦），${c.changed.palace.name}宫${c.changed.palaceOrder}卦`
    : '变卦：无（六爻皆静）');
  L.push(`月建：${c.calendar.monthGanZhi}（${c.calendar.monthBranch}月）；日辰：${c.calendar.dayGanZhi}；旬空：${c.calendar.xunKong.join('')}`);

  L.push('', '【装卦】（自上而下；六亲以本卦宫五行论）');
  for (const l of [...c.lines].reverse()) {
    const marks = [l.shi && '世', l.ying && '应', l.moving && (l.yang ? '○动' : '×动')].filter(Boolean).join(' ');
    const facts = [
      `月令${l.monthState}`,
      l.monthBreak && '月破',
      l.dayClash && '日冲',
      l.empty && '旬空',
    ].filter(Boolean).join('、');
    let line = `${POS[l.position - 1]}爻 ${l.yang ? '▅▅▅▅▅' : '▅▅ ▅▅'}  ${l.liuShen}  ${l.liuQin}${l.stem}${l.branch}${l.wuXing}`;
    if (marks) line += `  ${marks}`;
    line += `  ［${facts}］`;
    if (l.changed) line += `  → 化${l.changed.liuQin}${l.changed.stem}${l.changed.branch}${l.changed.wuXing}${l.changed.effects.length ? `（${l.changed.effects.join('、')}）` : ''}`;
    if (l.hidden) line += `  伏：${l.hidden.liuQin}${l.hidden.stem}${l.hidden.branch}${l.hidden.wuXing}`;
    L.push(line);
  }
  if (c.missingLiuQin.length) L.push(`本卦不现：${c.missingLiuQin.join('、')}（伏神取自${m.palace.name}为${m.palace.nature}卦同位之爻）`);

  L.push('', '【取用神参考】（问事类别 → 用神；类别不明或用神两现时的取舍属于溯因）');
  for (const g of YONGSHEN_GUIDE) L.push(`- ${g.yongShen}：${g.topics}`);

  L.push('', `【经文】按朱熹《易学启蒙》占法——${c.reading.rule}`);
  for (const t of c.reading.texts) L.push(`- ${t.label}：「${t.text}」`);
  L.push(`本卦卦辞：「${m.text.guaCi}」`);
  if (c.changed) L.push(`变卦卦辞：「${c.changed.text.guaCi}」`);
  L.push('（经文来自《周易》原文，校勘见仓库 docs/zhouyi-collation.md；把经文套到所问之事上属于溯因。）');
  return L.join('\n');
}
