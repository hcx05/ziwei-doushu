/**
 * lib/systems/ziwei/digest.ts —— 命盤 → 給 AI 讀的文本摘要
 *
 * Claude Skill（.claude/skills/ziwei-doushu）與迴歸測試共用這一份，
 * 保證兩邊餵給模型的命盤事實完全一致。這裡只放排盤引擎**確定性**算出的事實；
 * 解讀規則見 lib/systems/ziwei/tasks.ts。
 *
 * 隱私：默認不含姓名、出生地、經緯度、公曆生日、四柱（includeBirth 才帶）。
 */

import type { Palace, ZiweiChart } from '@/lib/systems/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/systems/ziwei/constants';
import { detectPatterns } from '@/lib/systems/ziwei/patterns';
import { getDaXianSiHua } from '@/lib/systems/ziwei/sihua';
import { locate, natalTransforms, overlayTable, transformsWithLayers, yearContext } from '@/lib/systems/ziwei/layers';
import { HOUR_UNKNOWN_NOTICE } from './tasks';

export interface DigestOptions {
  /** 附上該年所在大限、流年命宮、四化落宮與三盤疊宮 */
  liunianYear?: number;
  /** 附上公曆 / 農曆生日與四柱（默認關） */
  includeBirth?: boolean;
}

const LEVEL_LABEL: Record<string, string> = { excellent: '上格', good: '吉', neutral: '中性', caution: '凶' };

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

  if (opts.liunianYear) {
    const ctx = yearContext(chart, opts.liunianYear);
    const y = ctx.year;
    const isCurrent = ctx.daXianIndex === chart.currentDaXianIndex;
    lines.push('', `【${y} 年所在大限】${ctx.daXianLabel}${ctx.daXianBranch !== undefined ? `，大限命宮在${BRANCHES[ctx.daXianBranch]}宮` : ''}${isCurrent ? '（即當前大限）' : ''}；該年虛歲 ${ctx.age}`);
    if (ctx.daXianSiHua) {
      lines.push(`大限四化（${ctx.daXianSiHua.stemName}干）：${transformsWithLayers(chart, ctx.daXianSiHua.transforms, ctx.layers)}`);
    }
    lines.push(
      '',
      `【流年 ${y}（${ctx.liuNian.stemName}${BRANCHES[ctx.liuNianBranch]}年）】`,
      `流年命宮：${BRANCHES[ctx.liuNianBranch]}宮（${locate(chart, ctx.liuNianBranch, ctx.layers)}）`,
      `流年四化：${transformsWithLayers(chart, ctx.liuNian.transforms, ctx.layers)}`,
      `生年四化：${transformsWithLayers(chart, natalTransforms(chart), ctx.layers)}`,
      '',
      `【三盤疊宮（${y} 年）】每宮依次為本命、大限、流年的宮名；看某年某事，看四化落在大限、流年的哪一宮`,
      ...overlayTable(chart, ctx.layers),
    );
  } else {
    const curSh = chart.currentDaXianIndex >= 0 ? getDaXianSiHua(chart, chart.currentDaXianIndex) : null;
    if (curSh) {
      const layers = [{ label: '大限', mingBranch: chart.daXians[chart.currentDaXianIndex].palaceBranch }];
      lines.push('', `【當前大限（${curSh.stemName}干）四化落宮】`, transformsWithLayers(chart, curSh.transforms, layers));
    }
  }

  const patterns = detectPatterns(chart);
  if (patterns.length) {
    lines.push('', '【引擎識別出的格局】成立與否、加分、破格是按條件算出的事實；說明文字是引擎內建的通行說法，不是倪師原話、也不是古籍原文，引用時不得加引號或歸給倪師');
    for (const p of patterns) {
      const c = p.conditions;
      const cond = [
        c?.required?.length ? `成立：${c.required.join('、')}` : '',
        c?.bonus?.length ? `加分：${c.bonus.join('、')}` : '',
        c?.breaking?.length ? `破格／減力：${c.breaking.join('、')}` : '',
      ].filter(Boolean).join('；');
      lines.push(`- ${p.name}（${LEVEL_LABEL[p.level]}）${cond ? `｜${cond}` : ''}`);
      lines.push(`  說明：${p.description}`);
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
