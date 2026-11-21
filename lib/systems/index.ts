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
    '国运、地区运势（引擎只为个人出生时间设计）',
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

export const SYSTEMS: DivinationSystem[] = [ziwei, xiaoliuren, bazi, liuyao];

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
