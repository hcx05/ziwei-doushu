/**
 * Claude Skill 用的命令行工具源码 —— 打包后输出到
 *   .claude/skills/ziwei-doushu/scripts/ziwei.mjs （单文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   chart     排盘，输出给模型读的命盘摘要（与网站 /api/interpret 同一份 buildDigest）
 *   sections  列出某个解读主题的小节与推理类型（演绎 / 归纳 / 溯因），来自 lib/ai/tasks.ts
 *   rules     输出推理分工规则全文
 *   quotes    搜索倪海厦《天纪·紫微斗数》原话（1848 条，带 B 站出处时间）
 *   classics  搜索《紫微斗数全书》等古籍原文
 */

import { generateChart } from '../../lib/ziwei/algorithm';
import { formToBirthInfo } from '../../lib/ziwei/share';
import { PROVINCES } from '../../lib/ziwei/cities';
import { isChinaDST } from '../../lib/ziwei/dst-cn';
import { isValidLunarDate, lunarToSolar } from '../../lib/ziwei/lunar-solar';
import { shiftGregorianDate } from '../../lib/ziwei/true-solar-time';
import { searchClassics } from '../../lib/classics';
import { buildDigest } from '../../lib/ai/digest';
import {
  TOPICS, LIUNIAN_SECTIONS, REASONING_LABEL, REASONING_RULES, UNCERTAINTY_MARK, buildTask,
  type AiTask, type SectionSpec, type TopicKey,
} from '../../lib/ai/tasks';
import type { BirthFormState } from '../../components/BirthForm';
// esbuild 以 text loader 内联；tsc 不认识 .jsonl，用 require 形式绕开类型检查
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QUOTES_JSONL: string = require('../../docs/tianji-ziwei/entries.jsonl');

type Args = { _: string[]; [k: string]: string | boolean | string[] };

function parseArgs(argv: string[]): Args {
  const out: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function fail(msg: string): never {
  console.error(`错误：${msg}`);
  process.exit(2);
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

// ────────────────── chart ──────────────────

function findCity(name: string): { province: string; city: string; longitude: number } | null {
  const n = name.replace(/[市县区]$/, '');
  const hits: { province: string; city: string; longitude: number }[] = [];
  for (const p of PROVINCES) {
    for (const c of p.cities) {
      if (c.name === name || c.name.replace(/[市县区]$/, '') === n) {
        hits.push({ province: p.name, city: c.name, longitude: c.longitude });
      }
    }
    if (p.name.replace(/[省市]$/, '') === n && p.cities.length) {
      hits.push({ province: p.name, city: p.cities[0].name, longitude: p.cities[0].longitude });
    }
  }
  return hits[0] ?? null;
}

function cmdChart(args: Args) {
  const date = str(args.date) ?? fail('缺少 --date YYYY-MM-DD');
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`--date 格式应为 YYYY-MM-DD，收到「${date}」`);
  let [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];

  if (args.lunar) {
    const leap = !!args.leap;
    if (!isValidLunarDate(y, mo, d, leap)) fail(`农历 ${y}年${leap ? '闰' : ''}${mo}月${d}日 不存在`);
    const solar = lunarToSolar(y, mo, d, leap) ?? fail('农历转公历失败');
    [y, mo, d] = [solar.year, solar.month, solar.day];
  }

  const g = str(args.gender) ?? fail('缺少 --gender（男 / 女）');
  const gender = /^(男|m|male)$/i.test(g) ? 'male' : /^(女|f|female)$/i.test(g) ? 'female' : fail(`--gender 无法识别：${g}`);

  const unknownTime = !!args['unknown-time'];
  let clockHour = '', clockMinute = '';
  if (!unknownTime) {
    const t = str(args.time) ?? fail('缺少 --time HH:MM；不知道出生时间请改用 --unknown-time');
    const tm = t.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式应为 HH:MM，收到「${t}」`);
    let minutes = Number(tm[1]) * 60 + Number(tm[2]);
    if (minutes >= 1440) fail(`--time 超出范围：${t}`);
    // 海外出生：把当地钟表时间换成东八区时间（经度另给 --longitude），引擎按 120° 基准做真太阳时
    const offArg = str(args['utc-offset']);
    if (offArg) {
      const off = Number(offArg);
      if (!Number.isFinite(off) || off < -12 || off > 14) fail(`--utc-offset 应为 -12 ~ +14 的小时数，收到「${offArg}」`);
      if (!str(args.longitude)) fail('海外出生请同时给 --longitude（出生地经度，西经为负），否则无法做真太阳时校正');
      minutes += Math.round((8 - off) * 60);
      const dayShift = Math.floor(minutes / 1440);
      minutes = ((minutes % 1440) + 1440) % 1440;
      if (dayShift) ({ year: y, month: mo, day: d } = shiftGregorianDate({ year: y, month: mo, day: d }, dayShift));
    }
    clockHour = String(Math.floor(minutes / 60));
    clockMinute = String(minutes % 60);
  }

  let province = '', city = '', longitude = 120;
  const cityArg = str(args.city);
  const lonArg = str(args.longitude);
  if (lonArg) {
    longitude = Number(lonArg);
    if (!Number.isFinite(longitude)) fail(`--longitude 不是数字：${lonArg}`);
    province = '自填经度';
    city = cityArg ?? '';
  } else if (cityArg) {
    const hit = findCity(cityArg) ?? fail(`找不到城市「${cityArg}」，请改用 --longitude 直接给经度（东经为正）`);
    ({ province, city, longitude } = hit);
  }

  const form: BirthFormState = {
    name: '', year: String(y), month: String(mo), day: String(d),
    clockHour, clockMinute, unknownTime, province, city, longitude, gender,
  };
  const chart = generateChart(formToBirthInfo(form));

  const notes: string[] = [];
  if (args.lunar) notes.push(`农历输入已换算为公历 ${y}-${mo}-${d}`);
  if (str(args['utc-offset'])) notes.push(`当地时间（UTC${Number(args['utc-offset']) >= 0 ? '+' : ''}${args['utc-offset']}）已换算为东八区 ${y}-${mo}-${d} ${clockHour}:${clockMinute.padStart(2, '0')} 再排盘`);
  if (province) notes.push(`已按出生地经度 ${longitude}° 做真太阳时校正（${province}${city ? ' ' + city : ''}）`);
  else if (!unknownTime) notes.push('未给出生地：按东经 120° 钟表时间排盘，未做真太阳时校正');
  if (!unknownTime && !str(args['utc-offset']) && isChinaDST(y, mo, d)) {
    notes.push('⚠ 该日期处于中国夏令时期间：若给的是当时的钟表时间，应先减 1 小时再排；请向命主确认，不要自行假设');
  }

  const year = str(args.year) ? Number(args.year) : new Date().getFullYear();
  console.log('# 命盘摘要（排盘引擎确定性输出）\n');
  if (notes.length) console.log(notes.map(n => `- ${n}`).join('\n') + '\n');
  console.log(buildDigest(chart, { liunianYear: year, includeBirth: true }));
  if (args.json) {
    console.log('\n# 原始 JSON\n');
    console.log(JSON.stringify(chart));
  }
}

// ────────────────── sections / rules ──────────────────

function cmdSections(args: Args) {
  const key = args._[1] as TopicKey | 'palace' | 'sihua' | 'liunian' | 'all' | undefined;
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
  if (!tasks.length) fail(`未知主题「${key}」，可用：${TOPICS.map(t => t.key).join(' / ')} / palace / sihua / liunian / all`);

  for (const { label, task, sections } of tasks) {
    const list = sections ?? buildTask(task!, dummy)!.sections;
    console.log(`## ${label}\n`);
    for (const s of list) {
      const title = task?.type === 'sihua' ? s.title.replace(/^化忌/, '化X') : s.title;
      console.log(`- **【${title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    }
    console.log('');
  }
  console.log(`溯因节一律以「${UNCERTAINTY_MARK}」开头，规则见 \`node ziwei.mjs rules\`。`);
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
  node ziwei.mjs sections [overview|love|career|wealth|health|personality|palace|sihua|liunian|all]
  node ziwei.mjs rules
  node ziwei.mjs quotes 化忌 夫妻 [--limit 20]
  node ziwei.mjs classics 紫微 [--limit 10]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'chart': cmdChart(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(REASONING_RULES); break;
    case 'quotes': cmdQuotes(args); break;
    case 'classics': cmdClassics(args); break;
    default: console.log(HELP);
  }
} catch (err) {
  // 排盘引擎对不存在的日期等会抛错；只给一行原因，别把打包后的源码整段吐出来
  fail(err instanceof Error ? err.message : String(err));
}
