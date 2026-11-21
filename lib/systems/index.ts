/**
 * lib/systems/index.ts —— 已登记的推演体系
 *
 * 新增体系时：在这里加一项，并补上对应的确定性工具与回归测试。
 * 规划见 docs/ROADMAP-multi-system.md。
 */
import type { DivinationSystem } from '@/lib/reasoning/registry';
import type { SectionSpec } from '@/lib/reasoning/kinds';
import {
  XIAOLIUREN_SECTIONS, XIAOLIUREN_VOCABULARY, ZIWEI_SECTION_KEYS, ZIWEI_VOCABULARY, ziweiSectionSet,
} from '@/lib/ai/tasks';
import {
  BAZI_ABDUCTION_HOTSPOTS, BAZI_OUT_OF_SCOPE, BAZI_SECTION_SETS, BAZI_VOCABULARY,
} from './bazi/tasks';
import {
  LIUYAO_ABDUCTION_HOTSPOTS, LIUYAO_OUT_OF_SCOPE, LIUYAO_SECTION_SETS, LIUYAO_VOCABULARY,
} from './liuyao/tasks';
import {
  WUYUN_ABDUCTION_HOTSPOTS, WUYUN_OUT_OF_SCOPE, WUYUN_SECTION_SETS, WUYUN_VOCABULARY,
} from './wuyun/tasks';
import {
  ZERI_ABDUCTION_HOTSPOTS, ZERI_OUT_OF_SCOPE, ZERI_SECTION_SETS, ZERI_VOCABULARY,
} from './zeri/tasks';
import {
  TAIYI_ABDUCTION_HOTSPOTS, TAIYI_OUT_OF_SCOPE, TAIYI_SECTION_SETS, TAIYI_VOCABULARY,
} from './taiyi/tasks';
import {
  HUANGJI_ABDUCTION_HOTSPOTS, HUANGJI_OUT_OF_SCOPE, HUANGJI_SECTION_SETS, HUANGJI_VOCABULARY,
} from './huangji/tasks';
import {
  MEIHUA_ABDUCTION_HOTSPOTS, MEIHUA_OUT_OF_SCOPE, MEIHUA_SECTION_SETS, MEIHUA_VOCABULARY,
} from './meihua/tasks';
import {
  LIUREN_ABDUCTION_HOTSPOTS, LIUREN_OUT_OF_SCOPE, LIUREN_SECTION_SETS, LIUREN_VOCABULARY,
} from './liuren/tasks';

const ziwei: DivinationSystem = {
  id: 'ziwei',
  name: '紫微斗数（倪海厦《天纪》体系）',
  scope: '命',
  vocabulary: ZIWEI_VOCABULARY,
  sectionSets: Object.fromEntries(ZIWEI_SECTION_KEYS.map(k => [k, ziweiSectionSet(k)!])),
  abductionHotspots: [
    { question: '从已发生的事反推原因', why: '同一件事可对应多个宫位与四化，选哪一个是「最佳解释」' },
    { question: '定盘、校正时辰', why: '从性格与经历反推出生时辰，候选时辰都可能说得通' },
    { question: '两人合不合', why: '两张盘的讯号要取舍加总，规则本身不给综合评判' },
    { question: '二选一的人生决定', why: '象意不直接决定现实选择' },
    { question: '推测具体事件与时间', why: '规则只给象意与时段，落到哪一件事是跳跃' },
    { question: '命主说不准、要求修正解读', why: '为贴合反馈而改解读本身就是溯因' },
    { question: '命格定性、优势与课题、实际建议', why: '吉凶讯号并存时，以哪一面为主规则不决定' },
  ],
  outOfScope: [
    '用紫微盘推国运、地区运势（引擎只为个人出生时间设计；国运世局改用 taiyi、huangji）',
    '姓名学、风水布局、六神、测字（仓库没有对应工具）',
    '合盘分数、配对指数（仓库没有计分方法）',
    '语料里查不到的倪师原话、古籍里没有的说法',
  ],
};

const xiaoliuren: DivinationSystem = {
  id: 'xiaoliuren',
  name: '小六壬（倪海厦起法）',
  scope: '事',
  vocabulary: XIAOLIUREN_VOCABULARY,
  sectionSets: { xiaoliuren: XIAOLIUREN_SECTIONS },
  abductionHotspots: [
    { question: '课象对应到所问之事的具体情况', why: '例如赤口的「第三者」是谁，原话没有指定' },
    { question: '倪师没讲应期的课多久应验', why: '只有大安、小吉、速喜有原话应期' },
  ],
  outOfScope: [
    '同一个念起第二次课',
    '一次问多件事',
    '推荐具体投资标的、承诺收益',
  ],
};

const bazi: DivinationSystem = {
  id: 'bazi',
  name: '八字（子平术）',
  scope: '命',
  vocabulary: BAZI_VOCABULARY,
  sectionSets: BAZI_SECTION_SETS,
  abductionHotspots: BAZI_ABDUCTION_HOTSPOTS,
  outOfScope: BAZI_OUT_OF_SCOPE,
};

const liuyao: DivinationSystem = {
  id: 'liuyao',
  name: '六爻（纳甲筮法，附《周易》经文）',
  scope: '事',
  vocabulary: LIUYAO_VOCABULARY,
  sectionSets: LIUYAO_SECTION_SETS,
  abductionHotspots: LIUYAO_ABDUCTION_HOTSPOTS,
  outOfScope: LIUYAO_OUT_OF_SCOPE,
};

const wuyun: DivinationSystem = {
  id: 'wuyun',
  name: '五运六气（《素问》运气学说）',
  scope: '年',
  vocabulary: WUYUN_VOCABULARY,
  sectionSets: WUYUN_SECTION_SETS,
  abductionHotspots: WUYUN_ABDUCTION_HOTSPOTS,
  outOfScope: WUYUN_OUT_OF_SCOPE,
};

const zeri: DivinationSystem = {
  id: 'zeri',
  name: '择日（通书，《协纪辨方书》体系）',
  scope: '时',
  vocabulary: ZERI_VOCABULARY,
  sectionSets: ZERI_SECTION_SETS,
  abductionHotspots: ZERI_ABDUCTION_HOTSPOTS,
  outOfScope: ZERI_OUT_OF_SCOPE,
};

const taiyi: DivinationSystem = {
  id: 'taiyi',
  name: '太乙神數（《太乙金鏡式經》歲計）',
  scope: '世',
  vocabulary: TAIYI_VOCABULARY,
  sectionSets: TAIYI_SECTION_SETS,
  abductionHotspots: TAIYI_ABDUCTION_HOTSPOTS,
  outOfScope: TAIYI_OUT_OF_SCOPE,
};

const huangji: DivinationSystem = {
  id: 'huangji',
  name: '皇極經世（邵雍元會運世）',
  scope: '世',
  vocabulary: HUANGJI_VOCABULARY,
  sectionSets: HUANGJI_SECTION_SETS,
  abductionHotspots: HUANGJI_ABDUCTION_HOTSPOTS,
  outOfScope: HUANGJI_OUT_OF_SCOPE,
};

const meihua: DivinationSystem = {
  id: 'meihua',
  name: '梅花易數（《梅花易數》體用法）',
  scope: '事',
  vocabulary: MEIHUA_VOCABULARY,
  sectionSets: MEIHUA_SECTION_SETS,
  abductionHotspots: MEIHUA_ABDUCTION_HOTSPOTS,
  outOfScope: MEIHUA_OUT_OF_SCOPE,
};

const liuren: DivinationSystem = {
  id: 'liuren',
  name: '大六壬（《六壬大全》九宗門）',
  scope: '事',
  vocabulary: LIUREN_VOCABULARY,
  sectionSets: LIUREN_SECTION_SETS,
  abductionHotspots: LIUREN_ABDUCTION_HOTSPOTS,
  outOfScope: LIUREN_OUT_OF_SCOPE,
};

export const SYSTEMS: DivinationSystem[] = [ziwei, xiaoliuren, bazi, liuyao, wuyun, zeri, taiyi, huangji, meihua, liuren];

export function getSystem(id: string): DivinationSystem | undefined {
  return SYSTEMS.find(s => s.id === id);
}

/** 按小节集合的代号找出所属体系与小节（代号在所有体系间唯一） */
export function findSectionSet(key: string): { system: DivinationSystem; sections: SectionSpec[] } | null {
  for (const system of SYSTEMS) {
    const sections = system.sectionSets[key];
    if (sections) return { system, sections };
  }
  return null;
}
