/**
 * lib/systems/zeri/digest.ts —— 擇日資料 → 給模型讀的文本摘要（只放工具查出的事實）
 */
import { clashes, shengXiaoOf, type FindHit, type ZeriDay } from './engine';
import type { Branch } from '../bazi/constants';

const list = (a: string[]) => (a.length ? a.join('、') : '無');

export function buildDayDigest(d: ZeriDay, person?: Branch, withTimes = true): string {
  const L: string[] = [];
  if (d.assumptions.length) L.push(...d.assumptions, '');
  L.push(`【${d.date}（${d.week}）】${d.lunar}`);
  L.push(`干支：${d.yearGanZhi}年 ${d.monthGanZhi}月 ${d.dayGanZhi}日（納音${d.dayNaYin}）`);
  L.push(`建除：${d.zhiXing}日；天神：${d.tianShen.name}（${d.tianShen.huangDao}，${d.tianShen.luck}）；二十八宿：${d.xiu.name}宿（${d.xiu.luck}）；九星：${d.nineStar}`);
  L.push(`沖煞：沖${d.chong.shengXiao}（${d.chong.ganZhi}），煞${d.sha}`);
  if (person) {
    L.push(clashes(d.dayGanZhi[1] as Branch, person)
      ? `當事人屬${shengXiaoOf(person)}：本日日支沖當事人年支（通書稱「日沖」，一般不取用）`
      : `當事人屬${shengXiaoOf(person)}：本日不沖`);
  }
  L.push(`宜：${list(d.yi)}`);
  L.push(`忌：${list(d.ji)}`);
  L.push(`吉神宜趨：${list(d.jiShen)}`);
  L.push(`凶煞宜忌：${list(d.xiongSha)}`);
  L.push(`彭祖百忌：${d.pengZu.join('；')}`);
  if (d.jie) {
    L.push(`節前（${d.jie.prevMonthGanZhi}月建）：建除${d.jie.prevZhiXing}；宜：${list(d.jie.prevYi)}；忌：${list(d.jie.prevJi)}`);
  }
  if (withTimes) {
    L.push('', '時辰（北京時間；首尾兩個子時分屬本日早子與晚子）：');
    for (const t of d.times) {
      const tc = person && t.chong === shengXiaoOf(person) ? '  ※沖當事人' : '';
      L.push(`- ${t.zhi}時 ${t.range} ${t.ganZhi}  ${t.tianShen}（${t.huangDao}）  沖${t.chong} 煞${t.sha}  宜：${list(t.yi)}  忌：${list(t.ji)}${tc}`);
    }
  }
  return L.join('\n');
}

export function buildFindDigest(term: string, from: string, to: string, hits: FindHit[], person?: Branch): string {
  const L: string[] = [];
  L.push(`【篩選條件】${from} 至 ${to}，宜「${term}」且不忌「${term}」${person ? `；當事人屬${shengXiaoOf(person)}，標出日沖` : ''}`);
  L.push(`共 ${hits.length} 天（按日期先後，未排序、未評分）：`, '');
  for (const h of hits) {
    const d = h.day;
    const tags = [
      `${d.zhiXing}日`, `${d.tianShen.name}${d.tianShen.huangDao}`, `${d.xiu.name}宿${d.xiu.luck}`,
      `沖${d.chong.shengXiao}`,
    ];
    const warn = [h.clash && '※日沖當事人', d.jie && `※交${d.jie.name}日（節前宜忌不同）`].filter(Boolean).join(' ');
    L.push(`- ${d.date} ${d.week} ${d.dayGanZhi}  ${tags.join('  ')}${warn ? '  ' + warn : ''}`);
  }
  for (const h of hits) if (h.day.assumptions.length) L.push('', ...h.day.assumptions);
  L.push('', '（多個可用日之間如何取捨，通書沒有統一的先後規則；需要比較時用 day 子命令查看各日的吉神凶煞與時辰。）');
  return L.join('\n');
}
