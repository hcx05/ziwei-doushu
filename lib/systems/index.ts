/**
 * lib/systems/index.ts —— 已登記的推演體系
 *
 * 新增體系時：在這裡加一項，並補上對應的確定性工具與迴歸測試。
 * 規劃見 docs/ROADMAP-multi-system.md。
 */
import type { DivinationSystem } from '@/lib/reasoning/registry';
import type { SectionSpec } from '@/lib/reasoning/kinds';
import {
  XIAOLIUREN_SECTIONS, XIAOLIUREN_VOCABULARY, ZIWEI_SECTION_KEYS, ZIWEI_VOCABULARY, ziweiSectionSet,
} from '@/lib/systems/ziwei/tasks';
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
import {
  QIMEN_ABDUCTION_HOTSPOTS, QIMEN_OUT_OF_SCOPE, QIMEN_SECTION_SETS, QIMEN_VOCABULARY,
} from './qimen/tasks';

const ziwei: DivinationSystem = {
  id: 'ziwei',
  name: '紫微斗數（倪海廈《天紀》體系）',
  scope: '命',
  vocabulary: ZIWEI_VOCABULARY,
  sectionSets: Object.fromEntries(ZIWEI_SECTION_KEYS.map(k => [k, ziweiSectionSet(k)!])),
  abductionHotspots: [
    { question: '從已發生的事反推原因', why: '同一件事可對應多個宮位與四化，選哪一個是「最佳解釋」' },
    { question: '定盤、校正時辰', why: '從性格與經歷反推出生時辰，候選時辰都可能說得通' },
    { question: '兩人合不合', why: '兩張盤的訊號要取捨加總，規則本身不給綜合評判' },
    { question: '二選一的人生決定', why: '象意不直接決定現實選擇' },
    { question: '推測具體事件與時間', why: '規則只給象意與時段，落到哪一件事是跳躍' },
    { question: '命主說不準、要求修正解讀', why: '為貼合反饋而改解讀本身就是溯因' },
    { question: '命格定性、優勢與課題、實際建議', why: '吉凶訊號並存時，以哪一面為主規則不決定' },
  ],
  outOfScope: [
    '用紫微盤推國運、地區運勢（引擎只為個人出生時間設計；國運世局改用 taiyi、huangji）',
    '姓名學、風水布局、六神、測字（倉庫沒有對應工具）',
    '合盤分數、配對指數（倉庫沒有計分方法）',
    '語料裡查不到的倪師原話、古籍裡沒有的說法',
  ],
};

const xiaoliuren: DivinationSystem = {
  id: 'xiaoliuren',
  name: '小六壬（倪海廈起法）',
  scope: '事',
  vocabulary: XIAOLIUREN_VOCABULARY,
  sectionSets: { xiaoliuren: XIAOLIUREN_SECTIONS },
  abductionHotspots: [
    { question: '課象對應到所問之事的具體情況', why: '例如赤口的「第三者」是誰，原話沒有指定' },
    { question: '倪師沒講應期的課多久應驗', why: '只有大安、小吉、速喜有原話應期' },
  ],
  outOfScope: [
    '同一個念起第二次課',
    '一次問多件事',
    '推薦具體投資標的、承諾收益',
  ],
};

const bazi: DivinationSystem = {
  id: 'bazi',
  name: '八字（子平術）',
  scope: '命',
  vocabulary: BAZI_VOCABULARY,
  sectionSets: BAZI_SECTION_SETS,
  abductionHotspots: BAZI_ABDUCTION_HOTSPOTS,
  outOfScope: BAZI_OUT_OF_SCOPE,
};

const liuyao: DivinationSystem = {
  id: 'liuyao',
  name: '六爻（納甲筮法，附《周易》經文）',
  scope: '事',
  vocabulary: LIUYAO_VOCABULARY,
  sectionSets: LIUYAO_SECTION_SETS,
  abductionHotspots: LIUYAO_ABDUCTION_HOTSPOTS,
  outOfScope: LIUYAO_OUT_OF_SCOPE,
};

const wuyun: DivinationSystem = {
  id: 'wuyun',
  name: '五運六氣（《素問》運氣學說）',
  scope: '年',
  vocabulary: WUYUN_VOCABULARY,
  sectionSets: WUYUN_SECTION_SETS,
  abductionHotspots: WUYUN_ABDUCTION_HOTSPOTS,
  outOfScope: WUYUN_OUT_OF_SCOPE,
};

const zeri: DivinationSystem = {
  id: 'zeri',
  name: '擇日（通書，《協紀辨方書》體系）',
  scope: '時',
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

const qimen: DivinationSystem = {
  id: 'qimen',
  name: '奇門遁甲（《遁甲演義》時家轉盤）',
  scope: '事',
  vocabulary: QIMEN_VOCABULARY,
  sectionSets: QIMEN_SECTION_SETS,
  abductionHotspots: QIMEN_ABDUCTION_HOTSPOTS,
  outOfScope: QIMEN_OUT_OF_SCOPE,
};

/** 按用途排列：命理、問事占卜、擇日、世局年景；各體系地位相同 */
export const SYSTEMS: DivinationSystem[] = [bazi, ziwei, liuyao, meihua, liuren, qimen, xiaoliuren, zeri, taiyi, huangji, wuyun];

export function getSystem(id: string): DivinationSystem | undefined {
  return SYSTEMS.find(s => s.id === id);
}

/** 按小節集合的代號找出所屬體系與小節（代號在所有體系間唯一） */
export function findSectionSet(key: string): { system: DivinationSystem; sections: SectionSpec[] } | null {
  for (const system of SYSTEMS) {
    const sections = system.sectionSets[key];
    if (sections) return { system, sections };
  }
  return null;
}
