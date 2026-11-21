/**
 * 梅花易數 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/meihua/scripts/meihua.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   cast      起卦：--time-cast（年月日時，可加 --plus）、--number（物數、聲數）、--numbers A,B（字占、丈尺）、
 *             --trigrams 上,下（後天端法；下卦可用方位，如 --trigrams 乾,東南）
 *   topic     查書中某一類占法原文（不給類別則列出十八類）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
 */
import { Solar } from 'lunar-javascript';
import { BRANCHES, type Branch } from '../../lib/systems/bazi/constants';
import type { TrigramName } from '../../lib/systems/liuyao/constants';
import type { CastMoment } from '../../lib/systems/liuyao/engine';
import {
  DIRECTION_TRIGRAM, buildMeihua, castByNumber, castByTime, castByTrigrams, castByTwoNumbers, type MeihuaCast,
} from '../../lib/systems/meihua/engine';
import { buildMeihuaDigest } from '../../lib/systems/meihua/digest';
import { MEIHUA_TOPICS } from '../../lib/systems/meihua/text.data';
import { MEIHUA_SECTION_SETS, MEIHUA_VOCABULARY } from '../../lib/systems/meihua/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { clockBranch, fail, parseArgs, parseMoment, runCheck, str, type Args } from './common';

/** 繁簡卦名、方位 → 引擎用的卦名 */
function trigramArg(s: string): TrigramName {
  const n = s.trim().replace(/兌/g, '兑').replace(/離/g, '离');
  if (['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'].includes(n)) return n as TrigramName;
  const dir = s.trim().replace(/方$/, '').replace(/东/g, '東');
  const hit = DIRECTION_TRIGRAM[dir];
  if (hit) return hit;
  fail(`無法識別「${s}」：應為卦名（乾兌離震巽坎艮坤）或方位（南、北、東、西、東南、西北、東北、西南）`);
}

const posInt = (v: unknown, name: string) => {
  const s = str(v) ?? fail(`缺少 ${name}`);
  if (!/^\d+$/.test(s) || Number(s) < 1) fail(`${name} 應為正整數，收到「${s}」`);
  return Number(s);
};

/** 月建（以東八區時刻對節氣）與農曆日期 */
function calendarOf(m: CastMoment) {
  const off = m.utcOffset ?? 8;
  const t = new Date(Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute) + (8 - off) * 3600_000);
  const bj = Solar.fromYmdHms(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), 0);
  const monthBranch = bj.getLunar().getEightChar().getMonth()[1] as Branch;
  const lunar = Solar.fromYmd(m.year, m.month, m.day).getLunar();
  return { monthBranch, lunar };
}

function cmdCast(args: Args) {
  const moment = parseMoment(args);
  const modes = ['time-cast', 'number', 'numbers', 'trigrams'].filter(k => args[k] !== undefined);
  if (modes.length !== 1) fail('起卦方法四選一：--time-cast、--number N、--numbers A,B、--trigrams 上,下');
  const { monthBranch, lunar } = calendarOf(moment);
  const hourNo = clockBranch(moment.hour) + 1;
  const notes: string[] = [];
  let cast: MeihuaCast;
  switch (modes[0]) {
    case 'time-cast': {
      const yb = BRANCHES.indexOf(lunar.getYearZhi() as Branch) + 1;
      const plus = args.plus === undefined ? 0 : posInt(args.plus, '--plus');
      cast = castByTime(yb, Math.abs(lunar.getMonth()), lunar.getDay(), hourNo, plus);
      notes.push(`農曆 ${lunar.getYearZhi()}年${lunar.getMonth() < 0 ? '閏' : ''}${Math.abs(lunar.getMonth())}月${lunar.getDay()}日 ${BRANCHES[hourNo - 1]}時`);
      if (lunar.getMonth() < 0) notes.push(`${ASSUMPTION_MARK}閏月按月份數字計（書中未言閏月）。`);
      if (lunar.getYearZhiByLiChun() !== lunar.getYearZhi()) {
        notes.push(`${ASSUMPTION_MARK}此日在立春與春節之間：年支按農曆年（春節換年）取 ${lunar.getYearZhi()}；若按立春換年則為 ${lunar.getYearZhiByLiChun()}，上卦會不同。`);
      }
      break;
    }
    case 'number':
      cast = castByNumber(posInt(args.number, '--number'), hourNo);
      break;
    case 'numbers': {
      const parts = (str(args.numbers) ?? fail('--numbers 應為 A,B')).split(/[,，]/);
      if (parts.length !== 2) fail('--numbers 應為兩個數，以逗號分隔，如 --numbers 7,8');
      cast = castByTwoNumbers(posInt(parts[0], '上數'), posInt(parts[1], '下數'), args['add-hour'] ? hourNo : undefined);
      break;
    }
    default: {
      const parts = (str(args.trigrams) ?? fail('--trigrams 應為 上,下')).split(/[,，]/);
      if (parts.length !== 2) fail('--trigrams 應為兩項，如 --trigrams 乾,東南（物為上卦、方位為下卦）');
      cast = castByTrigrams(trigramArg(parts[0]), trigramArg(parts[1]), hourNo);
    }
  }
  if (moment.hour === 23) notes.push(`${ASSUMPTION_MARK}23 點起卦：時支取子時、日期仍按當天；有人按次日計，卦會不同。`);
  const chart = buildMeihua(cast, monthBranch);
  console.log('# 梅花易數（工具確定性輸出）\n');
  const pad = (n: number) => String(n).padStart(2, '0');
  console.log(`- 起卦時間：${moment.year}-${pad(moment.month)}-${pad(moment.day)} ${pad(moment.hour)}:${pad(moment.minute)}（${BRANCHES[hourNo - 1]}時，時數 ${hourNo}）`);
  for (const n of notes) console.log(`- ${n}`);
  console.log('');
  console.log(buildMeihuaDigest(chart, str(args.topic)));
  if (args.json) console.log('\n# 原始 JSON\n\n' + JSON.stringify(chart));
}

function cmdTopic(args: Args) {
  const q = args._[1];
  if (!q) {
    console.log('# 《梅花易數》卷二十八類占法\n');
    console.log(MEIHUA_TOPICS.map(t => `- ${t.title}`).join('\n'));
    return;
  }
  const t = MEIHUA_TOPICS.find(x => x.topic === q || x.title.startsWith(q)) ?? fail(`沒有「${q}」；可用：${MEIHUA_TOPICS.map(x => x.topic).join('、')}`);
  console.log(`# ${t.title}\n`);
  for (const line of t.text.split('\n')) console.log(`「${line}」\n`);
  console.log('（維基文庫《梅花易數》卷二原文）');
}

function cmdSections(args: Args) {
  const list = MEIHUA_SECTION_SETS[args._[1] ?? 'meihua'] ?? fail(`未知小節集合「${args._[1]}」，可用：${Object.keys(MEIHUA_SECTION_SETS).join(' / ')}`);
  console.log('## meihua\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node meihua.mjs rules\`。`);
}

const HELP = `梅花易數 Skill 工具（起卦時間一律用問卜者當下的當地時間；海外加 --utc-offset）

  node meihua.mjs cast --time-cast --date 2026-11-21 --time 15:20 [--plus 6]   年月日時起卦（--plus：另加姓字筆畫等）
  node meihua.mjs cast --number 5 --date ... --time ...                        物數、聲數：數為上卦，加時為下卦
  node meihua.mjs cast --numbers 7,8 [--add-hour] --date ... --time ...        兩數：字占、丈尺（尺寸占加 --add-hour）
  node meihua.mjs cast --trigrams 乾,東南 --date ... --time ...                後天端法：物卦為上、方位卦為下
  （任一種都可加 --topic 求財 附上書中該類占法原文）
  node meihua.mjs topic [求財]
  node meihua.mjs sections [meihua] [--skeleton]
  node meihua.mjs rules
  node meihua.mjs check meihua --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'cast': cmdCast(args); break;
    case 'topic': cmdTopic(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(MEIHUA_VOCABULARY)); break;
    case 'check': runCheck(args, MEIHUA_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check meihua [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
