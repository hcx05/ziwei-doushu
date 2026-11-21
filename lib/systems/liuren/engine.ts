/**
 * lib/systems/liuren/engine.ts —— 大六壬起課（確定性）
 *
 * 依據《六壬大全》（四庫全書本）卷一「入手法」：
 *   · 十干寄宮：「甲課寅兮乙課辰，丙戊課巳……丁己課未，庚申，辛戌，壬亥，癸課原來丑宮坐」；
 *   · 月將加占時成天地盤；月將以中氣換（卷二：雨水後登明亥為正月將、春分後河魁戌……）；
 *   · 四課：干上、干陰、支上、支陰；
 *   · 九宗門取三傳：一賊克（重審、元首）、二比用（知一）、三涉害、四遙克（蒿矢、彈射）、五昴星、
 *     六別責、七八專、八伏吟、九返吟（含井欄）。
 *   · 中傳取初傳之上神，末傳取中傳之上神（伏吟、返吟無克、昴星、別責、八專另有取法）。
 * 十二天將：貴人起法書中只有圖、正文未載，用通行歌訣（見 GUIREN 與假設說明）。
 *
 * 只列課式事實；斷吉凶、類神對應、應期都不在這裡。
 */
import {
  BRANCHES, BRANCH_WUXING, STEMS, STEM_WUXING, controls, generates, type Branch, type Stem, type WuXing,
} from '@/lib/systems/bazi/constants';

export const B = (i: number) => BRANCHES[((i % 12) + 12) % 12];
export const bi = (b: Branch) => BRANCHES.indexOf(b);

/** 十干寄宮 */
export const JI_GONG: Record<Stem, Branch> = {
  甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑',
};
/** 寄宮 → 寄在此宮的干（涉害數「路逢多克」時連干一併數） */
export const STEMS_AT: Record<Branch, Stem[]> = Object.fromEntries(
  BRANCHES.map(b => [b, STEMS.filter(s => JI_GONG[s] === b)]),
) as Record<Branch, Stem[]>;

const STEM_HE: Record<Stem, Stem> = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
/** 三合：申子辰、亥卯未、寅午戌、巳酉丑；「支前三合」取本支在三合中的下一位 */
const TRINE_NEXT = (b: Branch): Branch => B(bi(b) + 4);
/** 驛馬：申子辰馬在寅、寅午戌在申、巳酉丑在亥、亥卯未在巳 */
export const yiMa = (b: Branch): Branch => B([2, 11, 8, 5][bi(b) % 4]);
/** 三刑：子卯相刑、寅巳申、丑戌未；辰午酉亥自刑 */
export const XING: Record<Branch, Branch> = {
  子: '卯', 卯: '子', 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 辰: '辰', 午: '午', 酉: '酉', 亥: '亥',
};
const chong = (b: Branch) => B(bi(b) + 6);
const isYangB = (b: Branch) => bi(b) % 2 === 0;
const isYangS = (s: Stem) => STEMS.indexOf(s) % 2 === 0;
const MENG = new Set<Branch>(['寅', '申', '巳', '亥']);
const ZHONG = new Set<Branch>(['子', '午', '卯', '酉']);

/** 中氣 → 月將（卷二：雨水後登明亥為正月將……） */
export const QI_JIANG: Record<string, Branch> = {
  雨水: '亥', 春分: '戌', 谷雨: '酉', 小满: '申', 夏至: '未', 大暑: '午', 处暑: '巳', 秋分: '辰', 霜降: '卯', 小雪: '寅', 冬至: '丑', 大寒: '子',
};
export const JIANG_NAME: Record<Branch, string> = {
  亥: '登明', 戌: '河魁', 酉: '從魁', 申: '傳送', 未: '小吉', 午: '勝光', 巳: '太乙', 辰: '天罡', 卯: '太衝', 寅: '功曹', 丑: '大吉', 子: '神后',
};

export interface Ke {
  no: 1 | 2 | 3 | 4;
  /** 下：第一課為日干，其餘為地支 */
  lower: Stem | Branch;
  /** 下的位置（日干以寄宮論） */
  lowerPos: Branch;
  upper: Branch;
  /** 下賊上 / 上克下 / 無 */
  ke: '下賊上' | '上克下' | null;
}

export type KeTi =
  | '重審' | '元首' | '知一' | '涉害' | '蒿矢' | '彈射' | '昴星' | '別責' | '八專'
  | '伏吟' | '返吟';

export interface SanChuanResult {
  method: KeTi;
  /** 課體細名：自任、自信、無依、井欄、虎視、冬蛇掩目等 */
  detail: string;
  chuan: [Branch, Branch, Branch];
  /** 取初傳的過程（可供核對） */
  steps: string[];
  /** 涉害等有異說時，另一派得出的三傳 */
  alternative?: { rule: string; chuan: [Branch, Branch, Branch] };
}

const wxOf = (x: Stem | Branch): WuXing => (STEMS as readonly string[]).includes(x) ? STEM_WUXING[x as Stem] : BRANCH_WUXING[x as Branch];

/** 天地盤：offset = 月將 − 占時；天盤某神所臨的地盤 = 神 − offset */
export class Plate {
  constructor(readonly offset: number) {}
  /** 地盤某位上的天盤神 */
  up(earth: Branch): Branch { return B(bi(earth) + this.offset); }
  /** 天盤某神所臨的地盤 */
  at(heaven: Branch): Branch { return B(bi(heaven) - this.offset); }
}

export function siKe(stem: Stem, branch: Branch, plate: Plate): Ke[] {
  const mk = (no: Ke['no'], lower: Stem | Branch, lowerPos: Branch): Ke => {
    const upper = plate.up(lowerPos);
    const lw = wxOf(lower), uw = BRANCH_WUXING[upper];
    return { no, lower, lowerPos, upper, ke: controls(lw, uw) ? '下賊上' : controls(uw, lw) ? '上克下' : null };
  };
  const k1 = mk(1, stem, JI_GONG[stem]);
  const k2 = mk(2, k1.upper, k1.upper);
  const k3 = mk(3, branch, branch);
  const k4 = mk(4, k3.upper, k3.upper);
  return [k1, k2, k3, k4];
}

/** 涉害深淺：上神從所臨地盤順行回到本位，沿途地支與寄干克它的次數 */
export function sheHaiDepth(upper: Branch, earth: Branch): { depth: number; path: string } {
  let depth = 0;
  const hits: string[] = [];
  for (let i = bi(earth); ; i++) {
    const e = B(i);
    for (const x of [e, ...STEMS_AT[e]] as (Stem | Branch)[]) {
      if (controls(wxOf(x), BRANCH_WUXING[upper])) { depth++; hits.push(x); }
    }
    if (e === upper) break;
  }
  return { depth, path: `${upper}自${earth}行至本位，受克 ${depth} 次${hits.length ? `（${hits.join('')}）` : ''}` };
}

function uniqueByUpper(ks: Ke[]): Ke[] {
  const seen = new Set<Branch>();
  return ks.filter(k => (seen.has(k.upper) ? false : (seen.add(k.upper), true)));
}

/** 九宗門取三傳 */
export function sanChuan(stem: Stem, branch: Branch, plate: Plate): SanChuanResult {
  const ke = siKe(stem, branch, plate);
  const yang = isYangS(stem);
  const ganShang = ke[0].upper, zhiShang = ke[2].upper;
  const follow = (first: Branch): [Branch, Branch, Branch] => { const m = plate.up(first); return [first, m, plate.up(m)]; };
  const steps: string[] = [];
  const off = ((plate.offset % 12) + 12) % 12;

  // ── 伏吟 ──
  if (off === 0) {
    const hasKe = ke[0].ke !== null;
    const first = hasKe || yang ? ganShang : zhiShang;
    steps.push(hasKe ? `伏吟有克還為用：干上${ganShang}與日干相克` : `伏吟無克，${yang ? '剛日取干上' : '柔日取支上'}神${first}`);
    let mid: Branch;
    if (XING[first] === first) {
      mid = first === ganShang ? zhiShang : ganShang;
      steps.push(`初傳${first}自刑，「次傳顛倒日辰併」，中傳取${first === ganShang ? '支' : '干'}上神${mid}`);
    } else {
      mid = XING[first];
      steps.push(`中傳取初傳所刑：${first}刑${mid}`);
    }
    let last: Branch;
    if (XING[mid] === mid) { last = chong(mid); steps.push(`中傳${mid}自刑，「沖取末傳不論刑」：${last}`); }
    else { last = XING[mid]; steps.push(`末傳取中傳所刑：${mid}刑${last}`); }
    return { method: '伏吟', detail: yang ? '自任' : '自信', chuan: [first, mid, last], steps };
  }

  const isFanYin = off === 6;
  const isBaZhuan = JI_GONG[stem] === branch;

  // ── 賊克、比用、涉害 ──
  const xia = uniqueByUpper(ke.filter(k => k.ke === '下賊上'));
  const shang = uniqueByUpper(ke.filter(k => k.ke === '上克下'));
  const pool = xia.length ? xia : shang;
  if (pool.length) {
    const kind = xia.length ? '下賊上' : '上克下';
    let first: Branch;
    let method: KeTi;
    let alternative: SanChuanResult['alternative'];
    if (pool.length === 1) {
      first = pool[0].upper;
      method = xia.length ? '重審' : '元首';
      steps.push(`第${pool[0].no}課${kind}，取上神${first}為初傳`);
    } else {
      const biYong = pool.filter(k => isYangB(k.upper) === yang);
      steps.push(`${kind}有 ${pool.length} 課（${pool.map(k => `第${k.no}課${k.upper}`).join('、')}）`);
      if (biYong.length === 1) {
        first = biYong[0].upper;
        method = '知一';
        steps.push(`比用：${yang ? '陽日用陽' : '陰日用陰'}，取${first}`);
      } else {
        const cand = biYong.length > 1 ? biYong : pool;
        steps.push(biYong.length ? `俱比，入涉害` : `俱不比，入涉害`);
        const scored = cand.map(k => ({ k, ...sheHaiDepth(k.upper, k.lowerPos) }));
        for (const s of scored) steps.push(`涉害：${s.path}`);
        const max = Math.max(...scored.map(s => s.depth));
        let top = scored.filter(s => s.depth === max).map(s => s.k);
        const pickMengZhong = (ks: Ke[]): Ke[] => {
          const m = ks.filter(k => MENG.has(k.lowerPos));
          if (m.length) return m;
          const z = ks.filter(k => ZHONG.has(k.lowerPos));
          return z.length ? z : ks;
        };
        const fuDeng = (ks: Ke[]): Branch => (ks.length === 1 ? ks[0].upper : yang ? ganShang : zhiShang);
        if (top.length > 1) {
          steps.push(`受克相等（${max} 次），「孟深仲淺季當休」：先取臨孟，次取臨仲`);
          top = pickMengZhong(top);
          if (top.length > 1) steps.push(`仍相等，「復等柔辰剛日宜」：${yang ? '剛日取干上' : '柔日取支上'}神`);
        }
        first = fuDeng(top);
        steps.push(`取${first}為初傳`);
        method = '涉害';
        const simple = fuDeng(pickMengZhong(cand));
        if (simple !== first) {
          alternative = { rule: '另一派涉害不數深淺，直接先取臨孟、次取臨仲、再按剛柔日取干上或支上', chuan: follow(simple) };
        }
      }
    }
    if (isFanYin) return { method: '返吟', detail: `無依（有克，按${method}取初傳）`, chuan: follow(first), steps, alternative };
    return { method, detail: isBaZhuan ? '八專有克' : '', chuan: follow(first), steps, alternative };
  }

  // ── 以下四課皆無克 ──
  if (isFanYin) {
    const ma = yiMa(branch);
    steps.push(`返吟無克，井欄：初傳取日支${branch}之驛馬${ma}，中傳支上神${zhiShang}，末傳干上神${ganShang}`);
    return { method: '返吟', detail: '井欄', chuan: [ma, zhiShang, ganShang], steps };
  }
  if (isBaZhuan) {
    const first = yang ? B(bi(ganShang) + 2) : B(bi(ke[3].upper) - 2);
    steps.push(yang ? `八專無克，陽日自干上神${ganShang}順數三位（連本位）得${first}` : `八專無克，陰日自第四課上神${ke[3].upper}逆數三位（連本位）得${first}`);
    steps.push(`中末皆取干上神${ganShang}`);
    return { method: '八專', detail: '', chuan: [first, ganShang, ganShang], steps };
  }

  // ── 遙克 ──
  const others = uniqueByUpper(ke.slice(1));
  const sw = STEM_WUXING[stem];
  const shenKeRi = others.filter(k => controls(BRANCH_WUXING[k.upper], sw));
  const riKeShen = others.filter(k => controls(sw, BRANCH_WUXING[k.upper]));
  const yao = shenKeRi.length ? shenKeRi : riKeShen;
  if (yao.length) {
    const name = shenKeRi.length ? '蒿矢' : '彈射';
    let pick = yao;
    if (yao.length > 1) {
      const b2 = yao.filter(k => isYangB(k.upper) === yang);
      pick = b2.length ? b2 : yao;
    }
    const first = pick[0].upper;
    steps.push(`四課無克，${shenKeRi.length ? '神遙克日' : '日遙克神'}（${name}）：${yao.map(k => `第${k.no}課${k.upper}`).join('、')}${yao.length > 1 ? `；擇與日干比者` : ''}，取${first}`);
    if (pick.length > 1) steps.push(`⚠ 比者仍有 ${pick.length} 個，按課序取第一個`);
    return { method: name, detail: '', chuan: follow(first), steps };
  }

  // ── 昴星、別責 ──
  const distinct = new Set(ke.map(k => `${k.lowerPos}${k.upper}`)).size;
  if (distinct === 4) {
    if (yang) {
      const first = plate.up('酉');
      steps.push(`無遙無克，昴星（虎視）：剛日仰視，取地盤酉上神${first}；中傳支上${zhiShang}，末傳干上${ganShang}`);
      return { method: '昴星', detail: '虎視', chuan: [first, zhiShang, ganShang], steps };
    }
    const first = plate.at('酉');
    steps.push(`無遙無克，昴星（冬蛇掩目）：柔日俯視，取天盤酉所臨之地${first}；中傳干上${ganShang}，末傳支上${zhiShang}`);
    return { method: '昴星', detail: '冬蛇掩目', chuan: [first, ganShang, zhiShang], steps };
  }
  const first = yang ? plate.up(JI_GONG[STEM_HE[stem]]) : TRINE_NEXT(branch);
  steps.push(yang
    ? `四課不全、無遙無克，別責：剛日取干合（${STEM_HE[stem]}，寄${JI_GONG[STEM_HE[stem]]}）上神${first}；中末皆干上神${ganShang}`
    : `四課不全、無遙無克，別責：柔日取支前三合${first}；中末皆干上神${ganShang}`);
  return { method: '別責', detail: '', chuan: [first, ganShang, ganShang], steps };
}

// ────────────────── 十二天將 ──────────────────

export const TIAN_JIANG = ['貴人', '螣蛇', '朱雀', '六合', '勾陳', '青龍', '天空', '白虎', '太常', '玄武', '太陰', '天后'] as const;
export type TianJiang = (typeof TIAN_JIANG)[number];

/** 通行歌訣「甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，壬癸兔蛇藏，六辛逢馬虎」，前者為晝貴、後者為夜貴 */
export const GUIREN: Record<Stem, [Branch, Branch]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['午', '寅'],
};
/** 占時卯至申為晝，酉至寅為夜 */
export const isDay = (hour: Branch) => bi(hour) >= 3 && bi(hour) <= 8;

export function tianJiang(stem: Stem, hour: Branch, plate: Plate): { guiren: Branch; day: boolean; forward: boolean; byHeaven: Record<Branch, TianJiang> } {
  const day = isDay(hour);
  const guiren = GUIREN[stem][day ? 0 : 1];
  const seat = plate.at(guiren);
  // 貴人所臨地盤在亥子丑寅卯辰則順行，巳午未申酉戌則逆行
  const forward = [11, 0, 1, 2, 3, 4].includes(bi(seat));
  const byHeaven = {} as Record<Branch, TianJiang>;
  for (let k = 0; k < 12; k++) byHeaven[B(bi(guiren) + (forward ? k : -k))] = TIAN_JIANG[k];
  return { guiren, day, forward, byHeaven };
}

// ────────────────── 遁干、六親 ──────────────────

/** 本旬遁干：旬首甲所在之支起甲，順數；不在本旬的兩支為旬空 */
export function xunDun(dayGanZhi: string): { kong: [Branch, Branch]; stemOf: (b: Branch) => Stem | null } {
  const s = STEMS.indexOf(dayGanZhi[0] as Stem), b = bi(dayGanZhi[1] as Branch);
  const jia = ((b - s) % 12 + 12) % 12;
  const stemOf = (x: Branch): Stem | null => { const k = ((bi(x) - jia) % 12 + 12) % 12; return k < 10 ? STEMS[k] : null; };
  return { kong: [B(jia + 10), B(jia + 11)], stemOf };
}

export type LiuQin = '兄弟' | '子孫' | '妻財' | '官鬼' | '父母';
export function liuQin(stem: Stem, b: Branch): LiuQin {
  const me = STEM_WUXING[stem], x = BRANCH_WUXING[b];
  if (me === x) return '兄弟';
  if (generates(me, x)) return '子孫';
  if (controls(me, x)) return '妻財';
  if (controls(x, me)) return '官鬼';
  return '父母';
}

// ────────────────── 整課 ──────────────────

export interface LiurenInput {
  dayGanZhi: string;
  /** 占時（地支） */
  hour: Branch;
  /** 月將（地支） */
  yueJiang: Branch;
}

export interface LiurenChart extends LiurenInput {
  plate: { earth: Branch; heaven: Branch; jiang: TianJiang }[];
  siKe: (Ke & { jiang: TianJiang })[];
  sanChuan: SanChuanResult & { items: { branch: Branch; dun: Stem | null; liuQin: LiuQin; jiang: TianJiang; kong: boolean }[] };
  guiren: { branch: Branch; day: boolean; forward: boolean };
  xunKong: [Branch, Branch];
}

export function buildLiuren(input: LiurenInput): LiurenChart {
  const stem = input.dayGanZhi[0] as Stem, branch = input.dayGanZhi[1] as Branch;
  if (!STEMS.includes(stem) || !BRANCHES.includes(branch) || STEMS.indexOf(stem) % 2 !== bi(branch) % 2) throw new RangeError(`日干支不合法：${input.dayGanZhi}`);
  const plate = new Plate(bi(input.yueJiang) - bi(input.hour));
  const tj = tianJiang(stem, input.hour, plate);
  const xun = xunDun(input.dayGanZhi);
  const sc = sanChuan(stem, branch, plate);
  return {
    ...input,
    plate: BRANCHES.map(e => ({ earth: e, heaven: plate.up(e), jiang: tj.byHeaven[plate.up(e)] })),
    siKe: siKe(stem, branch, plate).map(k => ({ ...k, jiang: tj.byHeaven[k.upper] })),
    sanChuan: {
      ...sc,
      items: sc.chuan.map(b => ({ branch: b, dun: xun.stemOf(b), liuQin: liuQin(stem, b), jiang: tj.byHeaven[b], kong: xun.kong.includes(b) })),
    },
    guiren: { branch: tj.guiren, day: tj.day, forward: tj.forward },
    xunKong: xun.kong,
  };
}
