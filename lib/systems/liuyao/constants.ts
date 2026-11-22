/**
 * lib/systems/liuyao/constants.ts —— 六爻（納甲筮法）基礎表
 *
 * 納甲：乾納甲壬、坤納乙癸、震庚、巽辛、坎戊、離己、艮丙、兌丁；
 * 地支：陽卦順排（乾震子寅辰午申戌、坎寅辰午申戌子、艮辰午申戌子寅），
 *       陰卦逆排（坤未巳卯丑亥酉、巽丑亥酉未巳卯、離卯丑亥酉未巳、兌巳卯丑亥酉未）。
 * 八卦五行：乾兌金、離火、震巽木、坎水、艮坤土。
 */
import type { Branch, Stem, WuXing } from '@/lib/systems/bazi/constants';

export type TrigramName = '乾' | '兌' | '離' | '震' | '巽' | '坎' | '艮' | '坤';

export interface Trigram {
  name: TrigramName;
  nature: string;
  /** 自下而上，1 陽 0 陰 */
  lines: string;
  wuXing: WuXing;
  /** 內卦（下卦）納干、外卦（上卦）納干 */
  innerStem: Stem;
  outerStem: Stem;
  /** 作內卦時初、二、三爻的地支；作外卦時四、五、上爻的地支 */
  innerBranches: [Branch, Branch, Branch];
  outerBranches: [Branch, Branch, Branch];
  /** 先天數（梅花易數起卦用）：乾1兌2離3震4巽5坎6艮7坤8 */
  xiantian: number;
}

export const TRIGRAMS: Trigram[] = [
  { name: '乾', nature: '天', lines: '111', wuXing: '金', innerStem: '甲', outerStem: '壬', innerBranches: ['子', '寅', '辰'], outerBranches: ['午', '申', '戌'], xiantian: 1 },
  { name: '兌', nature: '澤', lines: '110', wuXing: '金', innerStem: '丁', outerStem: '丁', innerBranches: ['巳', '卯', '丑'], outerBranches: ['亥', '酉', '未'], xiantian: 2 },
  { name: '離', nature: '火', lines: '101', wuXing: '火', innerStem: '己', outerStem: '己', innerBranches: ['卯', '丑', '亥'], outerBranches: ['酉', '未', '巳'], xiantian: 3 },
  { name: '震', nature: '雷', lines: '100', wuXing: '木', innerStem: '庚', outerStem: '庚', innerBranches: ['子', '寅', '辰'], outerBranches: ['午', '申', '戌'], xiantian: 4 },
  { name: '巽', nature: '風', lines: '011', wuXing: '木', innerStem: '辛', outerStem: '辛', innerBranches: ['丑', '亥', '酉'], outerBranches: ['未', '巳', '卯'], xiantian: 5 },
  { name: '坎', nature: '水', lines: '010', wuXing: '水', innerStem: '戊', outerStem: '戊', innerBranches: ['寅', '辰', '午'], outerBranches: ['申', '戌', '子'], xiantian: 6 },
  { name: '艮', nature: '山', lines: '001', wuXing: '土', innerStem: '丙', outerStem: '丙', innerBranches: ['辰', '午', '申'], outerBranches: ['戌', '子', '寅'], xiantian: 7 },
  { name: '坤', nature: '地', lines: '000', wuXing: '土', innerStem: '乙', outerStem: '癸', innerBranches: ['未', '巳', '卯'], outerBranches: ['丑', '亥', '酉'], xiantian: 8 },
];

export const trigramByLines = (lines: string): Trigram => TRIGRAMS.find(t => t.lines === lines)!;
export const trigramByName = (name: string): Trigram => TRIGRAMS.find(t => t.name === name)!;

export type LiuQin = '父母' | '兄弟' | '子孫' | '妻財' | '官鬼';
export const LIUQIN: LiuQin[] = ['父母', '兄弟', '子孫', '妻財', '官鬼'];

export const LIUSHEN = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'] as const;
export type LiuShen = (typeof LIUSHEN)[number];

/** 六神起法：甲乙起青龍、丙丁起朱雀、戊起勾陳、己起螣蛇、庚辛起白虎、壬癸起玄武（自初爻往上） */
export const LIUSHEN_START: Record<Stem, number> = {
  甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
};

/** 世爻位置（1–6）與卦在本宮中的次序：本宮、一世……五世、遊魂、歸魂 */
export const PALACE_ORDER = ['本宮', '一世', '二世', '三世', '四世', '五世', '遊魂', '歸魂'] as const;
export const SHI_POSITION = [6, 1, 2, 3, 4, 5, 4, 3];

/** 進神（同五行地支前進）：亥→子、寅→卯、巳→午、申→酉，以及土的丑→辰→未→戌→丑 */
export const JIN_SHEN: [Branch, Branch][] = [
  ['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉'], ['丑', '辰'], ['辰', '未'], ['未', '戌'], ['戌', '丑'],
];

/** 用神取法（《增刪卜易》等通行說法），問事類別 → 用神 */
export const YONGSHEN_GUIDE: { yongShen: string; topics: string }[] = [
  { yongShen: '世爻', topics: '自身的事（自己的運勢、身體、出行平安）' },
  { yongShen: '應爻', topics: '對方、他人、對手、所去之地' },
  { yongShen: '父母', topics: '父母長輩、文書合同、證件、房屋車輛、考試文章、消息' },
  { yongShen: '兄弟', topics: '兄弟姐妹、朋友同輩、競爭者（也主破財）' },
  { yongShen: '子孫', topics: '子女晚輩、學生、醫藥、寵物（也是福神、解憂）' },
  { yongShen: '妻財', topics: '錢財、薪水、貨物、男占妻子或女友' },
  { yongShen: '官鬼', topics: '工作職位、女占丈夫或男友、官司、疾病、盜賊' },
];
