/**
 * lib/systems/meihua/digest.ts —— 梅花卦 → 給模型讀的文本摘要（只放工具確定性算出的事實與原文）
 */
import type { MeihuaChart } from './engine';
import { KE_TI, MEIHUA_TOPICS, SHENG_TI, WANWU } from './text.data';

/** 引擎沿用六爻常數的簡體卦名；摘要統一用繁體 */
export const tw = (s: string) => s.replace(/兑/g, '兌').replace(/离/g, '離');
const POS = ['初', '二', '三', '四', '五', '上'];

export function buildMeihuaDigest(c: MeihuaChart, topic?: string): string {
  const L: string[] = [];
  const t = (x: { name: string; nature: string; wuXing: string }) => `${tw(x.name)}（${x.nature}，${x.wuXing}）`;
  L.push('【起卦】');
  L.push(`方法：${c.cast.method}`);
  L.push(`算式：${tw(c.cast.detail)}`);
  L.push(`本卦：${tw(c.main.fullName)}（上${t(c.upper)}、下${t(c.lower)}），第${POS[c.moving - 1]}爻動`);
  L.push(`互卦：上${tw(c.hu.upper.name)}下${tw(c.hu.lower.name)}（${tw(c.hu.hexagram.fullName)}）${c.hu.from === '變卦' ? '——本卦為乾或坤，「乾坤無互，互其變卦」，取自變卦' : ''}`);
  L.push(`變卦：${tw(c.changed.fullName)}`);
  L.push(`成卦之數：${c.chengGuaShu}`);

  L.push('', '【體用與卦氣】');
  L.push(`月建 ${c.season.monthBranch}（${c.season.season === '四季' ? '辰戌丑未四季之月' : c.season.season + '季'}）`);
  L.push(`體卦：${c.ti.position}${t(c.ti.trigram)}，卦氣${c.ti.qi}`);
  for (const p of c.pieces) {
    const rel = { 生體: '生體', 克體: '克體', 比和: '與體比和', 體克: '體克之', 體生: '體生之（洩體）' }[p.relation];
    L.push(`${p.role}：${t(p.trigram)}，${rel}；卦氣${p.qi}`);
  }
  L.push(`體黨（互、變中與體同五行）：${c.party.ti.length ? c.party.ti.map(tw).join('、') : '無'}；用黨（與用同五行）：${c.party.yong.length ? c.party.yong.map(tw).join('、') : '無'}`);
  L.push('（卦氣：書中只列旺、衰，未列者記「平」。）');

  L.push('', '【原文：體用總訣】');
  L.push('「體卦為主，用卦為事，互卦為事之中間，刻應變卦為事之終。」「體克用，諸事吉；用克體，諸事凶。體生用，有耗失之患；用生體，有進益之喜。體用比和，則百事順遂。」');
  const gen = [...new Set(c.pieces.filter(p => p.relation === '生體').map(p => tw(p.trigram.name)))];
  const ke = [...new Set(c.pieces.filter(p => p.relation === '克體').map(p => tw(p.trigram.name)))];
  for (const g of gen) L.push(`「${SHENG_TI[g]}」`);
  for (const k of ke) L.push(`「${KE_TI[k]}」`);
  if (!gen.length && !ke.length) L.push('卦中無生體、克體之卦：「生克不逢，則止以本卦而論之。」');

  if (topic) {
    const hit = MEIHUA_TOPICS.find(x => x.topic === topic || x.title.startsWith(topic));
    L.push('', `【原文：${hit ? hit.title : '占法'}】`);
    if (hit) for (const line of hit.text.split('\n')) L.push(`「${line}」`);
    else L.push(`沒有「${topic}」這一類；可用：${MEIHUA_TOPICS.map(x => x.topic).join('、')}。`);
  } else {
    L.push('', `【書中占法】未指定類別；可用 --topic 指定：${MEIHUA_TOPICS.map(x => x.topic).join('、')}。`);
  }

  L.push('', '【動爻爻辭】', `「${c.movingText}」（《周易》${tw(c.main.name)}卦）`);
  L.push('', '【八卦萬物屬類（卷一，節錄卦中出現的卦）】');
  const seen = new Set<string>();
  for (const x of [c.ti.trigram, ...c.pieces.map(p => p.trigram)]) {
    const n = tw(x.name);
    if (seen.has(n)) continue;
    seen.add(n);
    L.push(`${n}：「${WANWU[n]}」`);
  }
  L.push('', '（原文取自維基文庫《梅花易數》卷一、卷二；把類象、爻辭對應到所問之事屬於溯因。）');
  return L.join('\n');
}
