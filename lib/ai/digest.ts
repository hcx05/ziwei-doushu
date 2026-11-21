/**
 * lib/ai/digest.ts —— 命盘 → 给 AI 读的文本摘要
 *
 * 网站（app/api/interpret）与 Claude Skill（.claude/skills/ziwei-doushu）共用这一份，
 * 保证两边喂给模型的命盘事实完全一致。这里只放排盘引擎**确定性**算出的事实；
 * 解读规则见 lib/ai/tasks.ts。
 *
 * 隐私：默认不含姓名、出生地、经纬度、公历生日、四柱（includeBirth 才带）。
 */

import type { Palace, SiHua, ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { detectPatterns } from '@/lib/ziwei/patterns';
import { getDaXianSiHua, getLiuNianSiHua, getYearBranchIndex } from '@/lib/ziwei/sihua';
import { HOUR_UNKNOWN_NOTICE } from './tasks';

export interface DigestOptions {
  /** 附上该公历年的流年命宫与流年四化落宫 */
  liunianYear?: number;
  /** 附上公历 / 农历生日与四柱（网站默认关；本人在 Claude 对话里排盘时可开） */
  includeBirth?: boolean;
}

const SIHUA_ORDER: SiHua[] = ['禄', '权', '科', '忌'];

function palaceLine(palace: Palace): string {
  const stars = palace.stars.length
    ? palace.stars
        .map(s => `${s.name}${s.siHua ? `化${s.siHua}` : ''}${s.brightnessRaw ? `·${s.brightnessRaw}` : ''}`)
        .join('、')
    : palace.borrowedStars?.length
      ? `空宫（借对宫${palace.borrowedFromName ?? ''}：${palace.borrowedStars.join('、')}）`
      : '空宫';

  const tags: string[] = [];
  if (palace.isMingGong) tags.push('命宫');
  if (palace.isShenGong) tags.push('身宫');
  if (palace.daXianAge) tags.push(`本宫大限${palace.daXianAge[0]}–${palace.daXianAge[1]}岁`);
  if (palace.isCurrentDaXian) tags.push('★当前大限');
  if (palace.selfSihua?.length) {
    tags.push(`自化 ${palace.selfSihua.map(s => `${s.starName}化${s.siHua}`).join('、')}`);
  }

  const suffix = tags.length ? `（${tags.join('；')}）` : '';
  return `${BRANCHES[palace.branch]}宫 ${palace.name}·${STEMS[palace.stem]}干：${stars}${suffix}`;
}

/** 某颗星落在本命盘哪一宫 */
function palaceOfStar(chart: ZiweiChart, starName: string): Palace | undefined {
  return chart.palaces.find(p => p.stars.some(s => s.name === starName));
}

/** 「禄天同（落子宫·夫妻宫）」这样的四化落宫描述 */
function transformsLine(chart: ZiweiChart, transforms: Record<SiHua, string>): string {
  return SIHUA_ORDER.map(h => {
    const star = transforms[h];
    const p = palaceOfStar(chart, star);
    return `化${h}${star}（${p ? `落${BRANCHES[p.branch]}宫·${p.name}` : '本盘未安此星'}）`;
  }).join('；');
}

export function buildDigest(chart: ZiweiChart, opts: DigestOptions = {}): string {
  const lines: string[] = [];

  if (chart.birthInfo.hourUnknown) lines.push(HOUR_UNKNOWN_NOTICE, '');
  lines.push(`性别：${chart.birthInfo.gender === 'female' ? '女' : '男'}`);
  if (chart.yinYangGender) lines.push(`阴阳属性：${chart.yinYangGender}`);
  lines.push(`五行局：${chart.wuxingJuName}`);
  lines.push(`命宫在${BRANCHES[chart.mingGongBranch]}，身宫在${BRANCHES[chart.shenGongBranch]}`);
  if (chart.mingZhu) lines.push(`命主：${chart.mingZhu}；身主：${chart.shenZhu ?? '—'}`);
  lines.push(`当前虚岁：${chart.currentAge}（当前年份：${new Date().getFullYear()}）`);

  lines.push('', '【十二宫】');
  const palaces = [...chart.palaces].sort((a, b) => a.branch - b.branch);
  for (const palace of palaces) lines.push(palaceLine(palace));

  lines.push('', '【大限】');
  // 大限四化取大限宫的宫干（引擎 sihua.ts 的 getDaXianSiHua），不读 daXians[].siHua（排盘时未填）
  chart.daXians.forEach((dx, i) => {
    const sh = getDaXianSiHua(chart, i);
    const sihua = sh
      ? `｜${sh.stemName}干四化：禄${sh.transforms.禄} 权${sh.transforms.权} 科${sh.transforms.科} 忌${sh.transforms.忌}`
      : '';
    const current = i === chart.currentDaXianIndex ? ' ★当前' : '';
    lines.push(`${dx.startAge}–${dx.endAge}岁 ${dx.palaceName}${sihua}${current}`);
  });

  const curSh = chart.currentDaXianIndex >= 0 ? getDaXianSiHua(chart, chart.currentDaXianIndex) : null;
  if (curSh) {
    lines.push('', `【当前大限（${curSh.stemName}干）四化落宫】`, transformsLine(chart, curSh.transforms));
  }

  if (opts.liunianYear) {
    const y = opts.liunianYear;
    const ln = getLiuNianSiHua(y);
    const yb = getYearBranchIndex(y);
    const lnMing = chart.palaces.find(p => p.branch === yb);
    lines.push(
      '',
      `【流年 ${y}（${ln.stemName}${BRANCHES[yb]}年）】`,
      `流年命宫：${BRANCHES[yb]}宫（本命${lnMing?.name ?? '—'}）`,
      `流年四化：${transformsLine(chart, ln.transforms)}`,
    );
  }

  const patterns = detectPatterns(chart);
  if (patterns.length) {
    lines.push('', '【引擎识别出的格局】');
    for (const p of patterns.slice(0, 8)) {
      lines.push(`${p.name}（${p.level}）：${p.description.slice(0, 60)}`);
    }
  }

  if (opts.includeBirth) {
    const b = chart.birthInfo;
    const l = chart.lunarInfo;
    lines.push('', '【生辰】');
    lines.push(`公历：${b.year}-${b.month}-${b.day}，时辰支序号 ${b.hour}${b.hourUnknown ? '（时辰不详，按子时假设）' : `（${BRANCHES[b.hour]}时）`}`);
    lines.push(
      `农历：${l.lunarYear}年${l.isLeapMonth ? '闰' : ''}${Math.abs(l.lunarMonth)}月${l.lunarDay}日`,
    );
    if (l.fourPillars) lines.push(`四柱：${l.fourPillars.join(' ')}`);
  }

  return lines.join('\n');
}
