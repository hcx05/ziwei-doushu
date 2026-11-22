/**
 * lib/systems/wuyun/digest.ts —— 五運六氣年局 → 給模型讀的文本摘要（只放查表結果）
 */
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';
import type { WuyunYear } from './engine';

export function buildWuyunDigest(c: WuyunYear, focus?: { yunStep: number; qiStep: number; at: string }): string {
  const L: string[] = [];
  if (c.assumptions.length) L.push(...c.assumptions, '');

  L.push('【年局】');
  L.push(`運氣年：${c.ganZhi}年（${c.span.start} 大寒交司 至 ${c.span.end}，北京時間）`);
  L.push(`歲運（中運）：${c.suiYun.label}（${c.stem}干化${c.suiYun.wuXing}，${c.suiYun.excess ? '陽干太過' : '陰干不及'}）`);
  L.push(`司天：${c.siTian.name}（${c.branch}年）；在泉：${c.zaiQuan.name}`);
  L.push(`運氣關係：${c.relation.kind}（${c.relation.note}）`);
  L.push(`運氣同化：${c.tongHua.length ? c.tongHua.join('；') : '無（非天符、歲會、同天符、同歲會）'}`);

  L.push('', '【主運五步】（恆為木火土金水；太少按「太少相生」由歲運推出）');
  for (const s of c.zhuYun) L.push(`${s.name} ${s.label}（${s.wuXing}）  ${s.start} 起  ［傳統口徑：${s.tradition}］`);
  L.push(`${ASSUMPTION_MARK}五運交接日按全年五等分推算（約七十三日五刻）；傳統「春分後十三日」等說法與之相差可達數日，交接前後幾天的歸屬兩種口徑可能不同。`);

  L.push('', '【客運五步】（初運即歲運，五行相生順推，太少相生）');
  L.push(c.keYun.map(s => `${s.name} ${s.label}（${s.wuXing}）`).join('；'));

  L.push('', '【六氣六步】（主氣恆定；客氣三之氣為司天、終之氣為在泉）');
  for (const s of c.steps) {
    L.push(`${s.name}  ${s.start} 起（${s.jieQi}）  主氣 ${s.zhu.name}  客氣 ${s.ke.name}  → ${s.relation}`);
  }

  if (focus) {
    L.push('', '【所問日期】');
    L.push(`${focus.at}：主運${c.zhuYun[focus.yunStep].name} ${c.zhuYun[focus.yunStep].label}、客運${c.keYun[focus.yunStep].label}；${c.steps[focus.qiStep].name}，主氣${c.steps[focus.qiStep].zhu.name}、客氣${c.steps[focus.qiStep].ke.name}`);
  }

  L.push('', '（以上全為查表結果。《素問》運氣七篇原文尚未收入倉庫，不得憑記憶引用；交司時刻、南北政、平氣判定本工具未計算。）');
  return L.join('\n');
}
