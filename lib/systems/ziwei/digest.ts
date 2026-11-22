/**
 * lib/systems/ziwei/digest.ts —— 命盤 → 給 AI 讀的文本摘要
 *
 * Claude Skill（.claude/skills/ziwei-doushu）與迴歸測試共用這一份，
 * 保證兩邊餵給模型的命盤事實完全一致。這裡只放排盤引擎**確定性**算出的事實；
 * 解讀規則見 lib/systems/ziwei/tasks.ts。
 *
 * 隱私：默認不含姓名、出生地、經緯度、公曆生日、四柱（includeBirth 才帶）。
 */

import type { Palace, SiHua, ZiweiChart } from '@/lib/systems/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/systems/ziwei/constants';
import { detectPatterns } from '@/lib/systems/ziwei/patterns';
import { getDaXianSiHua, getLiuNianSiHua, getYearBranchIndex } from '@/lib/systems/ziwei/sihua';
import { HOUR_UNKNOWN_NOTICE } from './tasks';

export interface DigestOptions {
  /** 附上該公曆年的流年命宮與流年四化落宮 */
  liunianYear?: number;
  /** 附上公曆 / 農曆生日與四柱（默認關） */
  includeBirth?: boolean;
}

const SIHUA_ORDER: SiHua[] = ['祿', '權', '科', '忌'];

function palaceLine(palace: Palace): string {
  const stars = palace.stars.length
    ? palace.stars
        .map(s => `${s.name}${s.siHua ? `化${s.siHua}` : ''}${s.brightnessRaw ? `·${s.brightnessRaw}` : ''}`)
        .join('、')
    : palace.borrowedStars?.length
      ? `空宮（借對宮${palace.borrowedFromName ?? ''}：${palace.borrowedStars.join('、')}）`
      : '空宮';

  const tags: string[] = [];
  if (palace.isMingGong) tags.push('命宮');
  if (palace.isShenGong) tags.push('身宮');
  if (palace.daXianAge) tags.push(`本宮大限${palace.daXianAge[0]}–${palace.daXianAge[1]}歲`);
  if (palace.isCurrentDaXian) tags.push('★當前大限');
  if (palace.selfSihua?.length) {
    tags.push(`自化 ${palace.selfSihua.map(s => `${s.starName}化${s.siHua}`).join('、')}`);
  }

  const suffix = tags.length ? `（${tags.join('；')}）` : '';
  return `${BRANCHES[palace.branch]}宮 ${palace.name}·${STEMS[palace.stem]}干：${stars}${suffix}`;
}

/** 某顆星落在本命盤哪一宮 */
function palaceOfStar(chart: ZiweiChart, starName: string): Palace | undefined {
  return chart.palaces.find(p => p.stars.some(s => s.name === starName));
}

/** 「祿天同（落子宮·夫妻宮）」這樣的四化落宮描述 */
function transformsLine(chart: ZiweiChart, transforms: Record<SiHua, string>): string {
  return SIHUA_ORDER.map(h => {
    const star = transforms[h];
    const p = palaceOfStar(chart, star);
    return `化${h}${star}（${p ? `落${BRANCHES[p.branch]}宮·${p.name}` : '本盤未安此星'}）`;
  }).join('；');
}

export function buildDigest(chart: ZiweiChart, opts: DigestOptions = {}): string {
  const lines: string[] = [];

  if (chart.birthInfo.hourUnknown) lines.push(HOUR_UNKNOWN_NOTICE, '');
  lines.push(`性別：${chart.birthInfo.gender === 'female' ? '女' : '男'}`);
  if (chart.yinYangGender) lines.push(`陰陽屬性：${chart.yinYangGender}`);
  lines.push(`五行局：${chart.wuxingJuName}`);
  lines.push(`命宮在${BRANCHES[chart.mingGongBranch]}，身宮在${BRANCHES[chart.shenGongBranch]}`);
  if (chart.mingZhu) lines.push(`命主：${chart.mingZhu}；身主：${chart.shenZhu ?? '—'}`);
  lines.push(`當前虛歲：${chart.currentAge}（當前年份：${new Date().getFullYear()}）`);

  lines.push('', '【十二宮】');
  const palaces = [...chart.palaces].sort((a, b) => a.branch - b.branch);
  for (const palace of palaces) lines.push(palaceLine(palace));

  lines.push('', '【大限】');
  // 大限四化取大限宮的宮干（引擎 sihua.ts 的 getDaXianSiHua），不讀 daXians[].siHua（排盤時未填）
  chart.daXians.forEach((dx, i) => {
    const sh = getDaXianSiHua(chart, i);
    const sihua = sh
      ? `｜${sh.stemName}干四化：祿${sh.transforms.祿} 權${sh.transforms.權} 科${sh.transforms.科} 忌${sh.transforms.忌}`
      : '';
    const current = i === chart.currentDaXianIndex ? ' ★當前' : '';
    lines.push(`${dx.startAge}–${dx.endAge}歲 ${dx.palaceName}${sihua}${current}`);
  });

  const curSh = chart.currentDaXianIndex >= 0 ? getDaXianSiHua(chart, chart.currentDaXianIndex) : null;
  if (curSh) {
    lines.push('', `【當前大限（${curSh.stemName}干）四化落宮】`, transformsLine(chart, curSh.transforms));
  }

  if (opts.liunianYear) {
    const y = opts.liunianYear;
    const ln = getLiuNianSiHua(y);
    const yb = getYearBranchIndex(y);
    const lnMing = chart.palaces.find(p => p.branch === yb);
    lines.push(
      '',
      `【流年 ${y}（${ln.stemName}${BRANCHES[yb]}年）】`,
      `流年命宮：${BRANCHES[yb]}宮（本命${lnMing?.name ?? '—'}）`,
      `流年四化：${transformsLine(chart, ln.transforms)}`,
    );
  }

  const patterns = detectPatterns(chart);
  if (patterns.length) {
    lines.push('', '【引擎識別出的格局】');
    for (const p of patterns.slice(0, 8)) {
      lines.push(`${p.name}（${p.level}）：${p.description.slice(0, 60)}`);
    }
  }

  if (opts.includeBirth) {
    const b = chart.birthInfo;
    const l = chart.lunarInfo;
    lines.push('', '【生辰】');
    lines.push(`公曆：${b.year}-${b.month}-${b.day}，時辰支序號 ${b.hour}${b.hourUnknown ? '（時辰不詳，按子時假設）' : `（${BRANCHES[b.hour]}時）`}`);
    lines.push(
      `農曆：${l.lunarYear}年${l.isLeapMonth ? '閏' : ''}${Math.abs(l.lunarMonth)}月${l.lunarDay}日`,
    );
    if (l.fourPillars) lines.push(`四柱：${l.fourPillars.join(' ')}`);
  }

  return lines.join('\n');
}
