/**
 * lib/systems/bazi/constants.ts —— 八字（子平術）的基礎表
 *
 * 只收各派公認、沒有爭議的基礎表：天干地支的五行陰陽、地支藏干、十神定義、
 * 天干五合與相沖、地支六合 / 三合 / 三會 / 六沖 / 三刑 / 六害。
 * 有流派分歧的（地支相破、半合是否成立、合化條件、藏干分數）不在這裡下結論。
 */

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];

export const WUXING = ['木', '火', '土', '金', '水'] as const;
export type WuXing = (typeof WUXING)[number];

/** 天干五行：甲乙木、丙丁火、戊己土、庚辛金、壬癸水 */
export const STEM_WUXING: Record<Stem, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
/** 天干陰陽：奇位（甲丙戊庚壬）為陽 */
export const stemIsYang = (s: Stem) => STEMS.indexOf(s) % 2 === 0;

/** 地支五行（本氣） */
export const BRANCH_WUXING: Record<Branch, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/**
 * 地支藏干（本氣在前，其次中氣、餘氣），次序依人元司令分野。
 * 巳中氣取庚（「戊五日、庚九日、丙十六日」）；部分書寫作丙戊庚，只影響中氣 / 餘氣的標籤，不影響十神。
 */
export const HIDDEN_STEMS: Record<Branch, Stem[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

/** 五行相生：木→火→土→金→水→木 */
export const generates = (a: WuXing, b: WuXing) => (WUXING.indexOf(a) + 1) % 5 === WUXING.indexOf(b);
/** 五行相克：木克土、土克水、水克火、火克金、金克木 */
export const controls = (a: WuXing, b: WuXing) => (WUXING.indexOf(a) + 2) % 5 === WUXING.indexOf(b);

export type ShiShen = '比肩' | '劫財' | '食神' | '傷官' | '偏財' | '正財' | '七殺' | '正官' | '偏印' | '正印';

/**
 * 十神：以日干為「我」看另一天干。
 * 同我者比劫、我生者食傷、我克者財、克我者官殺、生我者印；陰陽相同為偏（比肩、食神、偏財、七殺、偏印），相異為正。
 */
export function shiShen(dayStem: Stem, other: Stem): ShiShen {
  const me = STEM_WUXING[dayStem];
  const it = STEM_WUXING[other];
  const same = stemIsYang(dayStem) === stemIsYang(other);
  if (me === it) return same ? '比肩' : '劫財';
  if (generates(me, it)) return same ? '食神' : '傷官';
  if (controls(me, it)) return same ? '偏財' : '正財';
  if (controls(it, me)) return same ? '七殺' : '正官';
  return same ? '偏印' : '正印';
}

// ────────────────── 干支關係 ──────────────────

/** 天干五合及其合化五行（合而能否化，需看月令等條件，此處只列「合」） */
export const STEM_COMBINE: [Stem, Stem, WuXing][] = [
  ['甲', '己', '土'], ['乙', '庚', '金'], ['丙', '辛', '水'], ['丁', '壬', '木'], ['戊', '癸', '火'],
];
/** 天干相沖（四沖：陽克陽、陰克陰且方位相對） */
export const STEM_CLASH: [Stem, Stem][] = [['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']];

/** 地支六合（午未合，諸書或作火或作土，故不標化神） */
export const BRANCH_COMBINE: [Branch, Branch, WuXing | null][] = [
  ['子', '丑', '土'], ['寅', '亥', '木'], ['卯', '戌', '火'], ['辰', '酉', '金'], ['巳', '申', '水'], ['午', '未', null],
];
/** 地支三合局（長生、帝旺、墓庫） */
export const BRANCH_TRINE: [Branch, Branch, Branch, WuXing][] = [
  ['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金'],
];
/** 地支三會方 */
export const BRANCH_DIRECTION: [Branch, Branch, Branch, WuXing][] = [
  ['寅', '卯', '辰', '木'], ['巳', '午', '未', '火'], ['申', '酉', '戌', '金'], ['亥', '子', '丑', '水'],
];
/** 地支六沖 */
export const BRANCH_CLASH: [Branch, Branch][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];
/** 地支六害 */
export const BRANCH_HARM: [Branch, Branch][] = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];
/** 三刑：寅巳申（無恩之刑）、丑戌未（恃勢之刑）、子卯（無禮之刑） */
export const BRANCH_PUNISH_GROUPS: { members: Branch[]; name: string }[] = [
  { members: ['寅', '巳', '申'], name: '無恩之刑' },
  { members: ['丑', '戌', '未'], name: '恃勢之刑' },
  { members: ['子', '卯'], name: '無禮之刑' },
];
/** 自刑：辰辰、午午、酉酉、亥亥 */
export const BRANCH_SELF_PUNISH: Branch[] = ['辰', '午', '酉', '亥'];

/** 六十甲子序號（0 = 甲子） → 干支 */
export function ganZhiOf(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return STEMS[i % 10] + BRANCHES[i % 12];
}
