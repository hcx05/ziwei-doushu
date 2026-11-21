/**
 * lib/systems/qimen/digest.ts —— 奇門局 → 給模型讀的文本摘要（只放工具確定性算出的事實）
 */
import { PALACE_NAME, type QimenChart } from './engine';

const cell = (c: QimenChart, p: number) => {
  const x = c.palaces[p - 1];
  if (p === 5) return `中5：地${x.earth}`;
  const stars = x.stars.map(s => s.replace('天', '')).join('');
  return `${PALACE_NAME[p]}${p}：${x.shen ?? ''} ${stars}${x.heaven.join('')}／地${x.earth}${x.earthJi ? x.earthJi : ''} ${x.door ?? ''}`;
};

export function buildQimenDigest(c: QimenChart, head: string[] = [], assumptions: string[] = []): string {
  const L: string[] = [];
  if (assumptions.length) L.push(...assumptions, '');
  L.push('【起局】');
  L.push(...head);
  L.push(`${c.dun}遁${c.ju}局；日${c.dayGz}、時${c.hourGz}；旬首${c.xunShou}（遁${c.xunYi}）；旬空${c.xunKong.join('')}；驛馬${c.yiMa}`);
  L.push(`值符：${c.zhiFu.star}（${PALACE_NAME[c.zhiFu.from]}${c.zhiFu.from}宮）加${PALACE_NAME[c.zhiFu.to]}${c.zhiFu.to}宮；值使：${c.zhiShi.door}加${PALACE_NAME[c.zhiShi.to]}${c.zhiShi.to}宮`);
  L.push('', '【九宮】（八神　天盤星與干／地盤干　門）');
  L.push([4, 9, 2].map(p => cell(c, p)).join('｜'));
  L.push([3, 5, 7].map(p => cell(c, p)).join('｜'));
  L.push([8, 1, 6].map(p => cell(c, p)).join('｜'));
  L.push('', '【格局】（只列書中定義明確者）');
  L.push(...(c.patterns.length ? c.patterns.map(p => `- ${p}`) : ['- 無']));
  L.push('', '（轉盤法；中五宮寄坤二，天禽隨天芮。九星時辰克應、神煞、書中占驗原文未收入。）');
  return L.join('\n');
}
