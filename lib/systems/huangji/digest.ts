/**
 * lib/systems/huangji/digest.ts —— 皇極經世定位 → 給模型讀的文本摘要
 */
import { CHRONICLE_RANGE, type HuangjiPosition } from './engine';

const STATUS: Record<HuangjiPosition['chronicle']['status'], string> = {
  text: '',
  blank: '原文此年列有干支，無紀事',
  missing: '原文此年缺干支行（四庫本轉錄所缺）',
  gap: '維基文庫轉錄於此缺頁，無法查得',
  'out-of-range': `不在「以運經世」逐年紀事範圍（${CHRONICLE_RANGE.from}至${CHRONICLE_RANGE.to}）`,
};

export function buildHuangjiDigest(p: HuangjiPosition): string {
  const L: string[] = [];
  L.push('【元會運世】');
  L.push(`${p.label}，干支${p.ganZhi}；本元第 ${p.n.toLocaleString('en-US')} 年`);
  L.push(`元：日甲（一）`);
  L.push(`會：${p.hui.label}（第${p.hui.no}會；${p.hui.span[0]}至${p.hui.span[1]}）`);
  L.push(`運：${p.yun.label}（第${p.yun.no}運，本會第${p.yun.inHui}運；${p.yun.span[0]}至${p.yun.span[1]}）`);
  L.push(`世：${p.shi.label}（第${p.shi.no}世，本運第${p.shi.inYun}世；${p.shi.span[0]}至${p.shi.span[1]}）`);
  L.push(`年：本世第${p.yearInShi}年`);
  L.push('', '【以運經世原文】');
  const e = p.chronicle.entry;
  if (p.chronicle.status === 'text' && e) L.push(`「${e.gz}${e.text}」（《皇極經世書》四庫全書本，經世第${e.shi}世第${e.n}年；□ 為原書特殊字）`);
  else L.push(STATUS[p.chronicle.status]);
  L.push('', '（定位為算術結果；值卦、開物閉物、元會運世對應的治亂之說本工具未計算。）');
  return L.join('\n');
}
