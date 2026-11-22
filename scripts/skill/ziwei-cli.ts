/**
 * Claude Skill 用的命令行工具源码 —— 打包后输出到
 *   .claude/skills/ziwei-doushu/scripts/ziwei.mjs （单文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   chart     排盘，输出给模型读的命盘摘要（lib/systems/ziwei/digest.ts 的 buildDigest）
 *   sections  列出某个解读主题的小节与推理类型（演绎 / 归纳 / 溯因），来自 lib/systems/ziwei/tasks.ts
 *   rules     输出推理分工规则全文（可指定体系：ziwei / xiaoliuren）
 *   check     检查解读草稿：溯因节是否以「仅供参考」标记开头、小节是否齐全（--fix 自动补标记）
 *   quotes    搜索倪海厦《天纪·紫微斗数》原话（1848 条，带 B 站出处时间）
 *   classics  搜索《紫微斗数全书》等古籍原文
 *   liuyue    流月：斗君、流月命宫、流月四化落宫（不给 --month 则列出全年 12 个月）
 *   liuri     流日：某一公历日的流日命宫、流日四化落宫
 *   liuren    小六壬：按农历月日时起课，含义只给倪师原话
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
// esbuild 以 text loader 内联；tsc 不认识 .jsonl，用 require 形式绕开类型检查
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QUOTES_JSONL: string = require('../../docs/tianji-ziwei/entries.jsonl');

/** 由出生参数排盘；chart / liuyue / liuri 共用 */
function buildChartFromArgs(args: Args): { chart: ZiweiChart; notes: string[] } {
  const { form, notes } = parseBirthArgs(args);
  return { chart: generateChart(formToBirthInfo(form)), notes };
}

function cmdChart(args: Args) {
  const { chart, notes } = buildChartFromArgs(args);
  const year = str(args.year) ? Number(args.year) : new Date().getFullYear();
  console.log('# 命盘摘要（排盘引擎确定性输出）\n');
  if (notes.length) console.log(notes.map(n => `- ${n}`).join('\n') + '\n');
  console.log(buildDigest(chart, { liunianYear: year, includeBirth: true }));
  if (args.json) {
    console.log('\n# 原始 JSON\n');
    console.log(JSON.stringify(chart));
  }
}

// ────────────────── liuyue / liuri ──────────────────

const SIHUA_ORDER: SiHua[] = ['禄', '权', '科', '忌'];

function palaceLabel(chart: ZiweiChart, branch: number): string {
  const p = chart.palaces.find(x => x.branch === branch);
  if (!p) return `${BRANCHES[branch]}宫`;
  const stars = p.stars.filter(s => s.type === 'major').map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、');
  return `${BRANCHES[branch]}宫（本命${p.name}：${stars || (p.borrowedStars?.length ? '空宫，借对宫' + p.borrowedStars.join('、') : '空宫')}）`;
}

function transformsText(chart: ZiweiChart, t: Record<SiHua, string>): string {
  return SIHUA_ORDER.map(h => {
    const p = chart.palaces.find(x => x.stars.some(s => s.name === t[h]));
    return `化${h}${t[h]}（${p ? `落${BRANCHES[p.branch]}宫·${p.name}` : '本盘未安此星'}）`;
  }).join('；');
}

function hourCaveat(chart: ZiweiChart): string[] {
  return chart.birthInfo.hourUnknown
    ? [`${ASSUMPTION_MARK}出生时辰不详，斗君（流月起点）依赖出生时辰，以下流月 / 流日宫位都建立在「子时」假设上。`]
    : [];
}

function cmdLiuyue(args: Args) {
  const { chart, notes } = buildChartFromArgs(args);
  const year = str(args.year) ? Number(args.year) : solarToLunar(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()).year;
  const yb = getYearBranchIndex(year);
  const ln = getLiuNianSiHua(year);
  const months = str(args.month) ? [Number(args.month)] : Array.from({ length: 12 }, (_, i) => i + 1);
  if (months.some(m => !(m >= 1 && m <= 12))) fail('--month 应为农历月 1–12');

  console.log(`# 流月（农历 ${year} 年，${ln.stemName}${BRANCHES[yb]}年）\n`);
  for (const n of [...notes, ...hourCaveat(chart)]) console.log(`- ${n}`);
  const first = getLiuYue(chart, year, 1);
  console.log(`- 斗君（流年正月）在${BRANCHES[first.douJun]}宫：从流年${BRANCHES[yb]}宫起正月逆数到生月，再起子时顺数到生时`);
  console.log(`- 流年命宫：${palaceLabel(chart, yb)}；流年四化：${transformsText(chart, ln.transforms)}\n`);
  for (const m of months) {
    const ly = getLiuYue(chart, year, m, { isLeapMonth: !!args.leap });
    console.log(`## 农历${args.leap ? '闰' : ''}${m}月（${ly.stemName}干）`);
    console.log(`- 流月命宫：${palaceLabel(chart, ly.branch)}`);
    console.log(`- 流月四化：${transformsText(chart, ly.transforms)}\n`);
  }
}

function cmdLiuri(args: Args) {
  const { chart, notes } = buildChartFromArgs(args);
  const on = str(args.on) ?? fail('缺少 --on YYYY-MM-DD（要看的那一天，公历）');
  const m = on.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--on 格式应为 YYYY-MM-DD，收到「${on}」`);
  const info = getLiuRi(chart, Number(m[1]), Number(m[2]), Number(m[3]));
  const { lunar, liuyue } = info;
  const yb = getYearBranchIndex(lunar.year);
  const ln = getLiuNianSiHua(lunar.year);

  console.log(`# 流日 ${on}（农历 ${lunar.year} 年${lunar.isLeapMonth ? '闰' : ''}${lunar.month}月${lunar.day}日）\n`);
  for (const n of [...notes, ...hourCaveat(chart)]) console.log(`- ${n}`);
  console.log(`- 流年（${ln.stemName}${BRANCHES[yb]}年）命宫：${palaceLabel(chart, yb)}；流年四化：${transformsText(chart, ln.transforms)}`);
  console.log(`- 流月（${liuyue.month}月，${liuyue.stemName}干）命宫：${palaceLabel(chart, liuyue.branch)}；流月四化：${transformsText(chart, liuyue.transforms)}`);
  console.log(`- 流日命宫（倪师口径：初一起于流月宫的下一宫）：${palaceLabel(chart, info.branch)}`);
  if (info.branchCommon !== info.branch) {
    console.log(`  - 通行口径（初一起于流月宫本宫）则为：${palaceLabel(chart, info.branchCommon)}。两种口径不同，解读时须一并说明。`);
  }
  console.log(info.transforms
    ? `- 流日四化（${info.stemName}日干）：${transformsText(chart, info.transforms)}`
    : '- 流日四化：日干换算失败');
}

// ────────────────── liuren（小六壬）──────────────────

function cmdLiuren(args: Args) {
  let lm: number, ld: number, hb: number;
  let header: string;
  const notes: string[] = [];
  if (str(args['lunar-month']) || str(args['lunar-day'])) {
    lm = Number(str(args['lunar-month']) ?? fail('缺少 --lunar-month'));
    ld = Number(str(args['lunar-day']) ?? fail('缺少 --lunar-day'));
    const h = str(args.hour) ?? fail('缺少 --hour（时辰，如 戌 或 0–11）');
    hb = BRANCHES.includes(h.replace(/时$/, '')) ? BRANCHES.indexOf(h.replace(/时$/, '')) : Number(h);
    if (!Number.isInteger(hb) || hb < 0 || hb > 11) fail(`--hour 无法识别：${h}`);
    header = `农历${lm}月${ld}日 ${BRANCHES[hb]}时`;
  } else {
    let y: number, mo: number, d: number, hh: number, mm: number;
    if (args.now) {
      const off = Number(str(args['utc-offset']) ?? fail('--now 须同时给 --utc-offset（起念当地的时区，如 8 或 -5）'));
      const t = new Date(Date.now() + off * 3600_000);
      [y, mo, d, hh, mm] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes()];
    } else {
      const ds = str(args.date) ?? fail('缺少起课时间：用 --date YYYY-MM-DD --time HH:MM（起念当下的当地时间），或 --now --utc-offset 8');
      const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式应为 YYYY-MM-DD，收到「${ds}」`);
      const ts = str(args.time) ?? fail('缺少 --time HH:MM');
      const tm = ts.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式应为 HH:MM，收到「${ts}」`);
      [y, mo, d, hh, mm] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
    }
    const lunar = solarToLunar(y, mo, d);
    [lm, ld, hb] = [lunar.month, lunar.day, clockToBranch(hh, mm)];
    header = `公历 ${y}-${mo}-${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} → 农历${lunar.isLeapMonth ? '闰' : ''}${lm}月${ld}日 ${BRANCHES[hb]}时`;
    if (lunar.isLeapMonth) notes.push('闰月按月份数字起课');
    if (hh === 23) notes.push(`${ASSUMPTION_MARK}23 点属晚子时：本课按当天的农历日起；倪师未讲晚子时是否换日，若按次日起课结果可能不同`);
  }

  const r = xiaoLiuRen(lm, ld, hb);
  console.log(`# 小六壬：${header}\n`);
  for (const n of notes) console.log(`- ${n}`);
  console.log(`- 起法：从大安起正月数到${lm}月 → ${r.monthPos}；从${r.monthPos}起初一数到${ld}日 → ${r.dayPos}；从${r.dayPos}起子时数到${BRANCHES[hb]}时 → **${r.result}**`);
  const mean = LIUREN_MEANING[r.result];
  console.log(`- 课象：**${r.result}**。倪师：「${mean.quote}」（视频分P25 ${mean.time}｜${mean.url}）\n`);
  console.log('倪师讲的使用规矩：');
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
  if (wantAll || key === 'palace') tasks.push({ label: 'palace（单宫分析）', task: { type: 'palace', branch: dummy.mingGongBranch } });
  if (wantAll || key === 'sihua') {
    const star = dummy.palaces.flatMap(p => p.stars).find(s => s.type === 'major')!;
    tasks.push({ label: 'sihua（四化飞化，以「化X」代称）', task: { type: 'sihua', starName: star.name, siHua: '忌', view: 'daxian' } });
  }
  if (wantAll || key === 'liunian') tasks.push({ label: 'liunian（流年）', task: null, sections: LIUNIAN_SECTIONS });
  if (wantAll || key === 'liuyue') tasks.push({ label: 'liuyue（流月）', task: null, sections: LIUYUE_SECTIONS });
  if (wantAll || key === 'liuri') tasks.push({ label: 'liuri（流日）', task: null, sections: LIURI_SECTIONS });
  if (wantAll || key === 'xiaoliuren') tasks.push({ label: 'xiaoliuren（小六壬）', task: null, sections: XIAOLIUREN_SECTIONS });
  if (!tasks.length) fail(`未知主题「${key}」，可用：${TOPICS.map(t => t.key).join(' / ')} / palace / sihua / liunian / liuyue / liuri / xiaoliuren / all`);

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
  console.log(`溯因节可以下结论，但一律以「${UNCERTAINTY_MARK}」开头，规则见 \`node ziwei.mjs rules\`。`);
}

// ────────────────── check：溯因节是否已标注 ──────────────────

function cmdCheck(args: Args) {
  const key = args._[1];
  if (!key) fail(`用法：check <小节集合> [--hua 禄|权|科|忌] [--file 草稿.md] [--fix]；草稿也可从标准输入读入。可用集合：${SYSTEMS.flatMap(s => Object.keys(s.sectionSets)).join(' / ')}`);
  let found = findSectionSet(key);
  if (key === 'sihua' && typeof args.hua === 'string') {
    if (!['禄', '权', '科', '忌'].includes(args.hua)) fail('--hua 只能是 禄 / 权 / 科 / 忌');
    found = { system: getSystem('ziwei')!, sections: ziweiSectionSet('sihua', args.hua)! };
  }
  if (!found) fail(`未知小节集合「${key}」`);
  runCheck(args, found.sections);
}

function cmdRules(args: Args) {
  const id = args._[1] ?? 'ziwei';
  const system = getSystem(id);
  if (!system) fail(`未知体系「${id}」，可用：${SYSTEMS.map(s => s.id).join(' / ')}`);
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
  if (!terms.length) fail('用法：quotes <关键词…> [--limit 20]（多个关键词须同时出现）');
  const limit = Number(str(args.limit) ?? 20);
  const hits = quotes().filter(e => {
    const hay = `${e.h2} ${e.h3} ${e.quote} ${e.note}`;
    return terms.every(t => hay.includes(t));
  });
  if (!hits.length) {
    console.log(`没有同时包含「${terms.join('」「')}」的倪师原话。可以减少关键词或换个说法再搜；搜不到就不要引用原话。`);
    return;
  }
  console.log(`共 ${hits.length} 条，显示前 ${Math.min(limit, hits.length)} 条。引用时请逐字照抄并附出处链接。\n`);
  for (const e of hits.slice(0, limit)) {
    const url = `https://www.bilibili.com/video/${e.bvid}?p=${e.part}&t=${hmsToSec(e.t_hms)}`;
    const topic = [e.h2, e.h3].filter(Boolean).join(' › ');
    // note 里的 cleaned 是语料清洗标记，对读者没有意义；只保留勘误说明
    const note = e.note.split(/〕〔/).filter(n => n && n !== 'cleaned').join('；');
    console.log(`- 「${e.quote}」 —— ${topic}｜视频分P${e.part} ${e.t_hms}｜${url}${note ? `｜勘误：${note}` : ''}`);
  }
}

// ────────────────── classics ──────────────────

function cmdClassics(args: Args) {
  const q = args._.slice(1).join('');
  if (!q) fail('用法：classics <关键词> [--limit 10]');
  const limit = Number(str(args.limit) ?? 10);
  const hits = searchClassics(q, limit);
  if (!hits.length) {
    console.log(`古籍中没有找到「${q}」。搜不到就不要声称古籍有此说法。`);
    return;
  }
  for (const h of hits) console.log(`- 《${h.bookTitle}》${h.chapterTitle}：${h.text}`);
}

// ────────────────── main ──────────────────

const HELP = `紫微斗数 Skill 工具

  node ziwei.mjs chart --date 1990-06-15 --time 10:30 --gender 女 [--city 杭州 | --longitude 120.2] [--year 2026]
  node ziwei.mjs chart --date 1990-05-21 --lunar [--leap] --unknown-time --gender 男
  node ziwei.mjs chart --date 1992-03-04 --time 23:10 --gender 男 --utc-offset -5 --longitude -74.0   （海外出生）
  node ziwei.mjs liuyue --date 1990-06-15 --time 10:30 --gender 女 [--year 2026] [--month 3]
  node ziwei.mjs liuri  --date 1990-06-15 --time 10:30 --gender 女 --on 2026-11-21
  node ziwei.mjs liuren --date 2026-11-21 --time 15:20            （起念当下的当地时间）
  node ziwei.mjs liuren --now --utc-offset 8
  node ziwei.mjs liuren --lunar-month 4 --lunar-day 5 --hour 戌
  node ziwei.mjs sections [overview|love|career|wealth|health|personality|palace|sihua|liunian|liuyue|liuri|xiaoliuren|all] [--skeleton]
  node ziwei.mjs rules [ziwei|xiaoliuren]
  node ziwei.mjs check overview --file 草稿.md [--fix]      （检查溯因节是否以标记开头；--fix 输出补好标记的版本）
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
  // 排盘引擎对不存在的日期等会抛错；只给一行原因，别把打包后的源码整段吐出来
  fail(err instanceof Error ? err.message : String(err));
}
