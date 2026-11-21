/**
 * lib/systems/wuyun/digest.ts —— 五运六气年局 → 给模型读的文本摘要（只放查表结果）
 */
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';
import type { WuyunYear } from './engine';

export function buildWuyunDigest(c: WuyunYear, focus?: { yunStep: number; qiStep: number; at: string }): string {
  const L: string[] = [];
  if (c.assumptions.length) L.push(...c.assumptions, '');

  L.push('【年局】');
  L.push(`运气年：${c.ganZhi}年（${c.span.start} 大寒交司 至 ${c.span.end}，北京时间）`);
  L.push(`岁运（中运）：${c.suiYun.label}（${c.stem}干化${c.suiYun.wuXing}，${c.suiYun.excess ? '阳干太过' : '阴干不及'}）`);
  L.push(`司天：${c.siTian.name}（${c.branch}年）；在泉：${c.zaiQuan.name}`);
  L.push(`运气关系：${c.relation.kind}（${c.relation.note}）`);
  L.push(`运气同化：${c.tongHua.length ? c.tongHua.join('；') : '无（非天符、岁会、同天符、同岁会）'}`);

  L.push('', '【主运五步】（恒为木火土金水；太少按「太少相生」由岁运推出）');
  for (const s of c.zhuYun) L.push(`${s.name} ${s.label}（${s.wuXing}）  ${s.start} 起  ［传统口径：${s.tradition}］`);
  L.push(`${ASSUMPTION_MARK}五运交接日按全年五等分推算（约七十三日五刻）；传统「春分后十三日」等说法与之相差可达数日，交接前后几天的归属两种口径可能不同。`);

  L.push('', '【客运五步】（初运即岁运，五行相生顺推，太少相生）');
  L.push(c.keYun.map(s => `${s.name} ${s.label}（${s.wuXing}）`).join('；'));

  L.push('', '【六气六步】（主气恒定；客气三之气为司天、终之气为在泉）');
  for (const s of c.steps) {
    L.push(`${s.name}  ${s.start} 起（${s.jieQi}）  主气 ${s.zhu.name}  客气 ${s.ke.name}  → ${s.relation}`);
  }

  if (focus) {
    L.push('', '【所问日期】');
    L.push(`${focus.at}：主运${c.zhuYun[focus.yunStep].name} ${c.zhuYun[focus.yunStep].label}、客运${c.keYun[focus.yunStep].label}；${c.steps[focus.qiStep].name}，主气${c.steps[focus.qiStep].zhu.name}、客气${c.steps[focus.qiStep].ke.name}`);
  }

  L.push('', '（以上全为查表结果。《素问》运气七篇原文尚未收入仓库，不得凭记忆引用；交司时刻、南北政、平气判定本工具未计算。）');
  return L.join('\n');
}
