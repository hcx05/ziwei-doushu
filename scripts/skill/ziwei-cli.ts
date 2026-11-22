/**
 * Claude Skill 用的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/ziwei-doushu/scripts/ziwei.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   chart     排盤，輸出給模型讀的命盤摘要（lib/systems/ziwei/digest.ts 的 buildDigest）
 *   sections  列出某個解讀主題的小節與推理類型（演繹 / 歸納 / 溯因），來自 lib/systems/ziwei/tasks.ts
 *   rules     輸出推理分工規則全文（可指定體系：ziwei / xiaoliuren）
 *   check     檢查解讀草稿：溯因節是否以「僅供參考」標記開頭、小節是否齊全（--fix 自動補標記）
 *   quotes    搜索倪海廈《天紀·紫微斗數》原話（1848 條，帶 B 站出處時間）
 *   classics  搜索《紫微斗數全書》等古籍原文
 *   liuyue    流月：斗君、流月命宮、流月四化落宮（不給 --month 則列出全年 12 個月）
 *   liuri     流日：某一公曆日的流日命宮、流日四化落宮
 *   liuren    小六壬：按農曆月日時起課，含義只給倪師原話
 */

import { generateChart } from '../../lib/systems/ziwei/algorithm';
import { formToBirthInfo } from '../../lib/systems/ziwei/share';
import { searchClassics } from '../../lib/systems/ziwei/classics';
import { buildDigest } from '../../lib/systems/ziwei/digest';
import {
  TOPICS, LIUNIAN_SECTIONS, LIUYUE_SECTIONS, LIURI_SECTIONS, XIAOLIUREN_SECTIONS,
  ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK, buildTask,
  ziweiSectionSet, type AiTask, type SectionSpec, type TopicKey,
} from '../../lib/systems/ziwei/tasks';
import { BRANCHES } from '../../lib/systems/ziwei/constants';
import { getLiuNianSiHua, getYearBranchIndex } from '../../lib/systems/ziwei/sihua';
import { getLiuRi, getLiuYue, solarToLunar } from '../../lib/systems/ziwei/liuyue';
import { LIUREN_MEANING, LIUREN_USAGE, clockToBranch, xiaoLiuRen } from '../../lib/systems/ziwei/xiaoliuren';
import type { SiHua, ZiweiChart } from '../../lib/systems/ziwei/types';
import { fail, parseArgs, parseBirthArgs, runCheck, str, type Args } from './common';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { findSectionSet, getSystem, SYSTEMS } from '../../lib/systems';
// esbuild 以 text loader 內聯；tsc 不認識 .jsonl，用 require 形式繞開類型檢查
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QUOTES_JSONL: string = require('../../docs/tianji-ziwei/entries.jsonl');

/** 由出生參數排盤；chart / liuyue / liuri 共用 */
function buildChartFromArgs(args: Args): { chart: ZiweiChart; notes: string[] } {
  const { form, notes } = parseBirthArgs(args);
  return { chart: generateChart(formToBirthInfo(form)), notes };
}

function cmdChart(args: Args) {
  const { chart, notes } = buildChartFromArgs(args);
  const year = str(args.year) ? Number(args.year) : new Date().getFullYear();
  console.log('# 命盤摘要（排盤引擎確定性輸出）\n');
  if (notes.length) console.log(notes.map(n => `- ${n}`).join('\n') + '\n');
  console.log(buildDigest(chart, { liunianYear: year, includeBirth: true }));
  if (args.json) {
    console.log('\n# 原始 JSON\n');
    console.log(JSON.stringify(chart));
  }
}

// ────────────────── liuyue / liuri ──────────────────

const SIHUA_ORDER: SiHua[] = ['祿', '權', '科', '忌'];

function palaceLabel(chart: ZiweiChart, branch: number): string {
  const p = chart.palaces.find(x => x.branch === branch);
  if (!p) return `${BRANCHES[branch]}宮`;
  const stars = p.stars.filter(s => s.type === 'major').map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、');
  return `${BRANCHES[branch]}宮（本命${p.name}：${stars || (p.borrowedStars?.length ? '空宮，借對宮' + p.borrowedStars.join('、') : '空宮')}）`;
}

function transformsText(chart: ZiweiChart, t: Record<SiHua, string>): string {
  return SIHUA_ORDER.map(h => {
    const p = chart.palaces.find(x => x.stars.some(s => s.name === t[h]));
    return `化${h}${t[h]}（${p ? `落${BRANCHES[p.branch]}宮·${p.name}` : '本盤未安此星'}）`;
  }).join('；');
}

function hourCaveat(chart: ZiweiChart): string[] {
  return chart.birthInfo.hourUnknown
    ? [`${ASSUMPTION_MARK}出生時辰不詳，斗君（流月起點）依賴出生時辰，以下流月 / 流日宮位都建立在「子時」假設上。`]
    : [];
}

function cmdLiuyue(args: Args) {
  const { chart, notes } = buildChartFromArgs(args);
  const year = str(args.year) ? Number(args.year) : solarToLunar(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()).year;
  const yb = getYearBranchIndex(year);
  const ln = getLiuNianSiHua(year);
  const months = str(args.month) ? [Number(args.month)] : Array.from({ length: 12 }, (_, i) => i + 1);
  if (months.some(m => !(m >= 1 && m <= 12))) fail('--month 應為農曆月 1–12');

  console.log(`# 流月（農曆 ${year} 年，${ln.stemName}${BRANCHES[yb]}年）\n`);
  for (const n of [...notes, ...hourCaveat(chart)]) console.log(`- ${n}`);
  const first = getLiuYue(chart, year, 1);
  console.log(`- 斗君（流年正月）在${BRANCHES[first.douJun]}宮：從流年${BRANCHES[yb]}宮起正月逆數到生月，再起子時順數到生時`);
  console.log(`- 流年命宮：${palaceLabel(chart, yb)}；流年四化：${transformsText(chart, ln.transforms)}\n`);
  for (const m of months) {
    const ly = getLiuYue(chart, year, m, { isLeapMonth: !!args.leap });
    console.log(`## 農曆${args.leap ? '閏' : ''}${m}月（${ly.stemName}干）`);
    console.log(`- 流月命宮：${palaceLabel(chart, ly.branch)}`);
    console.log(`- 流月四化：${transformsText(chart, ly.transforms)}\n`);
  }
}

function cmdLiuri(args: Args) {
  const { chart, notes } = buildChartFromArgs(args);
  const on = str(args.on) ?? fail('缺少 --on YYYY-MM-DD（要看的那一天，公曆）');
  const m = on.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--on 格式應為 YYYY-MM-DD，收到「${on}」`);
  const info = getLiuRi(chart, Number(m[1]), Number(m[2]), Number(m[3]));
  const { lunar, liuyue } = info;
  const yb = getYearBranchIndex(lunar.year);
  const ln = getLiuNianSiHua(lunar.year);

  console.log(`# 流日 ${on}（農曆 ${lunar.year} 年${lunar.isLeapMonth ? '閏' : ''}${lunar.month}月${lunar.day}日）\n`);
  for (const n of [...notes, ...hourCaveat(chart)]) console.log(`- ${n}`);
  console.log(`- 流年（${ln.stemName}${BRANCHES[yb]}年）命宮：${palaceLabel(chart, yb)}；流年四化：${transformsText(chart, ln.transforms)}`);
  console.log(`- 流月（${liuyue.month}月，${liuyue.stemName}干）命宮：${palaceLabel(chart, liuyue.branch)}；流月四化：${transformsText(chart, liuyue.transforms)}`);
  console.log(`- 流日命宮（倪師口徑：初一起於流月宮的下一宮）：${palaceLabel(chart, info.branch)}`);
  if (info.branchCommon !== info.branch) {
    console.log(`  - 通行口徑（初一起於流月宮本宮）則為：${palaceLabel(chart, info.branchCommon)}。兩種口徑不同，解讀時須一併說明。`);
  }
  console.log(info.transforms
    ? `- 流日四化（${info.stemName}日干）：${transformsText(chart, info.transforms)}`
    : '- 流日四化：日干換算失敗');
}

// ────────────────── liuren（小六壬）──────────────────

function cmdLiuren(args: Args) {
  let lm: number, ld: number, hb: number;
  let header: string;
  const notes: string[] = [];
  if (str(args['lunar-month']) || str(args['lunar-day'])) {
    lm = Number(str(args['lunar-month']) ?? fail('缺少 --lunar-month'));
    ld = Number(str(args['lunar-day']) ?? fail('缺少 --lunar-day'));
    const h = str(args.hour) ?? fail('缺少 --hour（時辰，如 戌 或 0–11）');
    hb = BRANCHES.includes(h.replace(/時$/, '')) ? BRANCHES.indexOf(h.replace(/時$/, '')) : Number(h);
    if (!Number.isInteger(hb) || hb < 0 || hb > 11) fail(`--hour 無法識別：${h}`);
    header = `農曆${lm}月${ld}日 ${BRANCHES[hb]}時`;
  } else {
    let y: number, mo: number, d: number, hh: number, mm: number;
    if (args.now) {
      const off = Number(str(args['utc-offset']) ?? fail('--now 須同時給 --utc-offset（起念當地的時區，如 8 或 -5）'));
      const t = new Date(Date.now() + off * 3600_000);
      [y, mo, d, hh, mm] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes()];
    } else {
      const ds = str(args.date) ?? fail('缺少起課時間：用 --date YYYY-MM-DD --time HH:MM（起念當下的當地時間），或 --now --utc-offset 8');
      const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式應為 YYYY-MM-DD，收到「${ds}」`);
      const ts = str(args.time) ?? fail('缺少 --time HH:MM');
      const tm = ts.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式應為 HH:MM，收到「${ts}」`);
      [y, mo, d, hh, mm] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
    }
    const lunar = solarToLunar(y, mo, d);
    [lm, ld, hb] = [lunar.month, lunar.day, clockToBranch(hh, mm)];
    header = `公曆 ${y}-${mo}-${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} → 農曆${lunar.isLeapMonth ? '閏' : ''}${lm}月${ld}日 ${BRANCHES[hb]}時`;
    if (lunar.isLeapMonth) notes.push('閏月按月份數字起課');
    if (hh === 23) notes.push(`${ASSUMPTION_MARK}23 點屬晚子時：本課按當天的農曆日起；倪師未講晚子時是否換日，若按次日起課結果可能不同`);
  }

  const r = xiaoLiuRen(lm, ld, hb);
  console.log(`# 小六壬：${header}\n`);
  for (const n of notes) console.log(`- ${n}`);
  console.log(`- 起法：從大安起正月數到${lm}月 → ${r.monthPos}；從${r.monthPos}起初一數到${ld}日 → ${r.dayPos}；從${r.dayPos}起子時數到${BRANCHES[hb]}時 → **${r.result}**`);
  const mean = LIUREN_MEANING[r.result];
  console.log(`- 課象：**${r.result}**。倪師：「${mean.quote}」（視頻分P25 ${mean.time}｜${mean.url}）\n`);
  console.log('倪師講的使用規矩：');
  for (const u of LIUREN_USAGE) console.log(`- 「${u.quote}」（${u.time}｜${u.url}）`);
}

// ────────────────── sections / rules ──────────────────

function cmdSections(args: Args) {
  const key = args._[1] as TopicKey | 'palace' | 'sihua' | 'liunian' | 'liuyue' | 'liuri' | 'xiaoliuren' | 'all' | undefined;
  const dummy = generateChart(formToBirthInfo({
    name: '', year: '1990', month: '1', day: '1', clockHour: '12', clockMinute: '0',
    unknownTime: false, province: '', city: '', longitude: 120, gender: 'male',
  }));
  const tasks: { label: string; task: AiTask | null; sections?: SectionSpec[] }[] = [];
  const wantAll = !key || key === 'all';
  for (const t of TOPICS) if (wantAll || key === t.key) tasks.push({ label: `${t.key}（${t.label}）`, task: { type: 'topic', key: t.key } });
  if (wantAll || key === 'palace') tasks.push({ label: 'palace（單宮分析）', task: { type: 'palace', branch: dummy.mingGongBranch } });
  if (wantAll || key === 'sihua') {
    const star = dummy.palaces.flatMap(p => p.stars).find(s => s.type === 'major')!;
    tasks.push({ label: 'sihua（四化飛化，以「化X」代稱）', task: { type: 'sihua', starName: star.name, siHua: '忌', view: 'daxian' } });
  }
  if (wantAll || key === 'liunian') tasks.push({ label: 'liunian（流年）', task: null, sections: LIUNIAN_SECTIONS });
  if (wantAll || key === 'liuyue') tasks.push({ label: 'liuyue（流月）', task: null, sections: LIUYUE_SECTIONS });
  if (wantAll || key === 'liuri') tasks.push({ label: 'liuri（流日）', task: null, sections: LIURI_SECTIONS });
  if (wantAll || key === 'xiaoliuren') tasks.push({ label: 'xiaoliuren（小六壬）', task: null, sections: XIAOLIUREN_SECTIONS });
  if (!tasks.length) fail(`未知主題「${key}」，可用：${TOPICS.map(t => t.key).join(' / ')} / palace / sihua / liunian / liuyue / liuri / xiaoliuren / all`);

  for (const { label, task, sections } of tasks) {
    const list = sections ?? buildTask(task!, dummy)!.sections;
    console.log(`## ${label}\n`);
    if (args.skeleton) {
      const sk = task?.type === 'sihua' ? list.map(s => ({ ...s, title: s.title.replace(/^化忌/, '化X') })) : list;
      console.log(renderSkeleton(sk) + '\n');
      continue;
    }
    for (const s of list) {
      const title = task?.type === 'sihua' ? s.title.replace(/^化忌/, '化X') : s.title;
      console.log(`- **【${title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    }
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node ziwei.mjs rules\`。`);
}

// ────────────────── check：溯因節是否已標注 ──────────────────

function cmdCheck(args: Args) {
  const key = args._[1];
  if (!key) fail(`用法：check <小節集合> [--hua 祿|權|科|忌] [--file 草稿.md] [--fix]；草稿也可從標準輸入讀入。可用集合：${SYSTEMS.flatMap(s => Object.keys(s.sectionSets)).join(' / ')}`);
  let found = findSectionSet(key);
  if (key === 'sihua' && typeof args.hua === 'string') {
    if (!['祿', '權', '科', '忌'].includes(args.hua)) fail('--hua 只能是 祿 / 權 / 科 / 忌');
    found = { system: getSystem('ziwei')!, sections: ziweiSectionSet('sihua', args.hua)! };
  }
  if (!found) fail(`未知小節集合「${key}」`);
  runCheck(args, found.sections);
}

function cmdRules(args: Args) {
  const id = args._[1] ?? 'ziwei';
  const system = getSystem(id);
  if (!system) fail(`未知體系「${id}」，可用：${SYSTEMS.map(s => s.id).join(' / ')}`);
  console.log(buildReasoningRules(system.vocabulary));
}

// ────────────────── quotes ──────────────────

interface QuoteEntry {
  book: string; h2: string; h3: string; quote: string; note: string;
  t_hms: string; bvid: string; part: number;
}

let QUOTES: QuoteEntry[] | null = null;
function quotes(): QuoteEntry[] {
  if (!QUOTES) QUOTES = QUOTES_JSONL.split('\n').filter(Boolean).map(l => JSON.parse(l) as QuoteEntry);
  return QUOTES;
}

function hmsToSec(hms: string): number {
  return hms.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
}

function cmdQuotes(args: Args) {
  const terms = args._.slice(1);
  if (!terms.length) fail('用法：quotes <關鍵詞…> [--limit 20]（多個關鍵詞須同時出現）');
  const limit = Number(str(args.limit) ?? 20);
  const hits = quotes().filter(e => {
    const hay = `${e.h2} ${e.h3} ${e.quote} ${e.note}`;
    return terms.every(t => hay.includes(t));
  });
  if (!hits.length) {
    console.log(`沒有同時包含「${terms.join('」「')}」的倪師原話。可以減少關鍵詞或換個說法再搜；搜不到就不要引用原話。`);
    return;
  }
  console.log(`共 ${hits.length} 條，顯示前 ${Math.min(limit, hits.length)} 條。引用時請逐字照抄並附出處鏈接。\n`);
  for (const e of hits.slice(0, limit)) {
    const url = `https://www.bilibili.com/video/${e.bvid}?p=${e.part}&t=${hmsToSec(e.t_hms)}`;
    const topic = [e.h2, e.h3].filter(Boolean).join(' › ');
    // note 裡的 cleaned 是語料清洗標記，對讀者沒有意義；只保留勘誤說明
    const note = e.note.split(/〕〔/).filter(n => n && n !== 'cleaned').join('；');
    console.log(`- 「${e.quote}」 —— ${topic}｜視頻分P${e.part} ${e.t_hms}｜${url}${note ? `｜勘誤：${note}` : ''}`);
  }
}

// ────────────────── classics ──────────────────

function cmdClassics(args: Args) {
  const q = args._.slice(1).join('');
  if (!q) fail('用法：classics <關鍵詞> [--limit 10]');
  const limit = Number(str(args.limit) ?? 10);
  const hits = searchClassics(q, limit);
  if (!hits.length) {
    console.log(`古籍中沒有找到「${q}」。搜不到就不要聲稱古籍有此說法。`);
    return;
  }
  for (const h of hits) console.log(`- 《${h.bookTitle}》${h.chapterTitle}：${h.text}`);
}

// ────────────────── main ──────────────────

const HELP = `紫微斗數 Skill 工具

  node ziwei.mjs chart --date 1990-06-15 --time 10:30 --gender 女 [--city 杭州 | --longitude 120.2] [--year 2026]
  node ziwei.mjs chart --date 1990-05-21 --lunar [--leap] --unknown-time --gender 男
  node ziwei.mjs chart --date 1992-03-04 --time 23:10 --gender 男 --utc-offset -5 --longitude -74.0   （海外出生）
  node ziwei.mjs liuyue --date 1990-06-15 --time 10:30 --gender 女 [--year 2026] [--month 3]
  node ziwei.mjs liuri  --date 1990-06-15 --time 10:30 --gender 女 --on 2026-11-21
  node ziwei.mjs liuren --date 2026-11-21 --time 15:20            （起念當下的當地時間）
  node ziwei.mjs liuren --now --utc-offset 8
  node ziwei.mjs liuren --lunar-month 4 --lunar-day 5 --hour 戌
  node ziwei.mjs sections [overview|love|career|wealth|health|personality|palace|sihua|liunian|liuyue|liuri|xiaoliuren|all] [--skeleton]
  node ziwei.mjs rules [ziwei|xiaoliuren]
  node ziwei.mjs check overview --file 草稿.md [--fix]      （檢查溯因節是否以標記開頭；--fix 輸出補好標記的版本）
  node ziwei.mjs quotes 化忌 夫妻 [--limit 20]
  node ziwei.mjs classics 紫微 [--limit 10]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'chart': cmdChart(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': cmdRules(args); break;
    case 'check': cmdCheck(args); break;
    case 'quotes': cmdQuotes(args); break;
    case 'classics': cmdClassics(args); break;
    case 'liuyue': cmdLiuyue(args); break;
    case 'liuri': cmdLiuri(args); break;
    case 'liuren': cmdLiuren(args); break;
    default: console.log(HELP);
  }
} catch (err) {
  // 排盤引擎對不存在的日期等會拋錯；只給一行原因，別把打包後的源碼整段吐出來
  fail(err instanceof Error ? err.message : String(err));
}
