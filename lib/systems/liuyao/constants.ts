/**
 * lib/systems/liuyao/constants.ts —— 六爻（纳甲筮法）基础表
 *
 * 纳甲：乾纳甲壬、坤纳乙癸、震庚、巽辛、坎戊、离己、艮丙、兑丁；
 * 地支：阳卦顺排（乾震子寅辰午申戌、坎寅辰午申戌子、艮辰午申戌子寅），
 *       阴卦逆排（坤未巳卯丑亥酉、巽丑亥酉未巳卯、离卯丑亥酉未巳、兑巳卯丑亥酉未）。
 * 八卦五行：乾兑金、离火、震巽木、坎水、艮坤土。
 */
import type { Branch, Stem, WuXing } from '@/lib/systems/bazi/constants';

export type TrigramName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

export interface Trigram {
  name: TrigramName;
  nature: string;
  /** 自下而上，1 阳 0 阴 */
  lines: string;
  wuXing: WuXing;
  /** 内卦（下卦）纳干、外卦（上卦）纳干 */
  innerStem: Stem;
  outerStem: Stem;
  /** 作内卦时初、二、三爻的地支；作外卦时四、五、上爻的地支 */
  innerBranches: [Branch, Branch, Branch];
  outerBranches: [Branch, Branch, Branch];
  /** 先天数（梅花易数起卦用）：乾1兑2离3震4巽5坎6艮7坤8 */
  xiantian: number;
}

export const TRIGRAMS: Trigram[] = [
  { name: '乾', nature: '天', lines: '111', wuXing: '金', innerStem: '甲', outerStem: '壬', innerBranches: ['子', '寅', '辰'], outerBranches: ['午', '申', '戌'], xiantian: 1 },
  { name: '兑', nature: '泽', lines: '110', wuXing: '金', innerStem: '丁', outerStem: '丁', innerBranches: ['巳', '卯', '丑'], outerBranches: ['亥', '酉', '未'], xiantian: 2 },
  { name: '离', nature: '火', lines: '101', wuXing: '火', innerStem: '己', outerStem: '己', innerBranches: ['卯', '丑', '亥'], outerBranches: ['酉', '未', '巳'], xiantian: 3 },
  { name: '震', nature: '雷', lines: '100', wuXing: '木', innerStem: '庚', outerStem: '庚', innerBranches: ['子', '寅', '辰'], outerBranches: ['午', '申', '戌'], xiantian: 4 },
  { name: '巽', nature: '风', lines: '011', wuXing: '木', innerStem: '辛', outerStem: '辛', innerBranches: ['丑', '亥', '酉'], outerBranches: ['未', '巳', '卯'], xiantian: 5 },
  { name: '坎', nature: '水', lines: '010', wuXing: '水', innerStem: '戊', outerStem: '戊', innerBranches: ['寅', '辰', '午'], outerBranches: ['申', '戌', '子'], xiantian: 6 },
  { name: '艮', nature: '山', lines: '001', wuXing: '土', innerStem: '丙', outerStem: '丙', innerBranches: ['辰', '午', '申'], outerBranches: ['戌', '子', '寅'], xiantian: 7 },
  { name: '坤', nature: '地', lines: '000', wuXing: '土', innerStem: '乙', outerStem: '癸', innerBranches: ['未', '巳', '卯'], outerBranches: ['丑', '亥', '酉'], xiantian: 8 },
];

export const trigramByLines = (lines: string): Trigram => TRIGRAMS.find(t => t.lines === lines)!;
export const trigramByName = (name: string): Trigram => TRIGRAMS.find(t => t.name === name)!;

export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼';
export const LIUQIN: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼'];

export const LIUSHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const;
export type LiuShen = (typeof LIUSHEN)[number];

/** 六神起法：甲乙起青龙、丙丁起朱雀、戊起勾陈、己起螣蛇、庚辛起白虎、壬癸起玄武（自初爻往上） */
export const LIUSHEN_START: Record<Stem, number> = {
  甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
};

/** 世爻位置（1–6）与卦在本宫中的次序：本宫、一世……五世、游魂、归魂 */
export const PALACE_ORDER = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'] as const;
export const SHI_POSITION = [6, 1, 2, 3, 4, 5, 4, 3];

/** 进神（同五行地支前进）：亥→子、寅→卯、巳→午、申→酉，以及土的丑→辰→未→戌→丑 */
export const JIN_SHEN: [Branch, Branch][] = [
  ['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉'], ['丑', '辰'], ['辰', '未'], ['未', '戌'], ['戌', '丑'],
];

/** 用神取法（《增删卜易》等通行说法），问事类别 → 用神 */
export const YONGSHEN_GUIDE: { yongShen: string; topics: string }[] = [
  { yongShen: '世爻', topics: '自身的事（自己的运势、身体、出行平安）' },
  { yongShen: '应爻', topics: '对方、他人、对手、所去之地' },
  { yongShen: '父母', topics: '父母长辈、文书合同、证件、房屋车辆、考试文章、消息' },
  { yongShen: '兄弟', topics: '兄弟姐妹、朋友同辈、竞争者（也主破财）' },
  { yongShen: '子孙', topics: '子女晚辈、学生、医药、宠物（也是福神、解忧）' },
  { yongShen: '妻财', topics: '钱财、薪水、货物、男占妻子或女友' },
  { yongShen: '官鬼', topics: '工作职位、女占丈夫或男友、官司、疾病、盗贼' },
];
