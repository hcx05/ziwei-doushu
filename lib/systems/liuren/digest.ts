/**
 * lib/systems/liuren/digest.ts —— 六壬課 → 給模型讀的文本摘要（只放工具確定性算出的事實）
 */
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';
import { JIANG_NAME, type LiurenChart } from './engine';

export function buildLiurenDigest(c: LiurenChart, assumptions: string[] = []): string {
  const L: string[] = [];
  if (assumptions.length) L.push(...assumptions, '');
  const sc = c.sanChuan;
  L.push('【課式】');
  L.push(`日干支：${c.dayGanZhi}；占時：${c.hour}；月將：${c.yueJiang}（${JIANG_NAME[c.yueJiang]}）加${c.hour}`);
  L.push(`旬空：${c.xunKong.join('')}；貴人：${c.guiren.day ? '晝' : '夜'}貴${c.guiren.branch}，${c.guiren.forward ? '順行' : '逆行'}`);
  L.push('', '天地盤（地盤：天盤神／天將）：');
  const row = (idx: number[]) => idx.map(i => { const p = c.plate[i]; return `${p.earth}：${p.heaven}／${p.jiang}`; }).join('　');
  L.push(row([5, 6, 7, 8]), row([4, 9]), row([3, 10]), row([2, 1, 0, 11]));

  L.push('', '【四課】（上神／下；天將）');
  for (const k of [...c.siKe].reverse()) {
    L.push(`第${k.no}課：${k.upper}／${k.lower}${k.no === 1 ? `（寄${k.lowerPos}）` : ''}；${k.jiang}${k.ke ? `；${k.ke}` : ''}`);
  }

  L.push('', `【三傳】${sc.method}${sc.detail ? `（${sc.detail}）` : ''}`);
  const label = ['初傳', '中傳', '末傳'];
  sc.items.forEach((it, i) => {
    L.push(`${label[i]}：${it.dun ?? '（旬空無遁干）'}${it.branch}　${it.liuQin}　${it.jiang}${it.kong ? '　旬空' : ''}`);
  });
  L.push('取傳過程：');
  for (const s of sc.steps) L.push(`- ${s}`);
  if (sc.alternative) {
    L.push(`${ASSUMPTION_MARK}涉害有異說。本工具按《六壬大全》「涉害行來本家止，路逢多克為用取」數深淺；${sc.alternative.rule}，三傳為 ${sc.alternative.chuan.join('')}。`);
  }
  L.push('', '（六親以日干五行論；遁干按本旬。神煞、課體斷語未計算，不得自行補上。）');
  return L.join('\n');
}

