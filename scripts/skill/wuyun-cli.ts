/**
 * 五運六氣 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/wuyun-liuqi/scripts/wuyun.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   year      某運氣年（自該年大寒起）的歲運、主客運、司天在泉、主客氣六步、同化與客主加臨
 *   date      某公曆日期落在哪個運氣年、哪一運、哪一氣
 *   table     列出一段年份的歲運、司天、在泉、運氣關係與同化（便於比較多年）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
 */
import { computeWuyun, locateDate } from '../../lib/systems/wuyun/engine';
import { buildWuyunDigest } from '../../lib/systems/wuyun/digest';
import { WUYUN_SECTION_SETS, WUYUN_VOCABULARY } from '../../lib/systems/wuyun/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { fail, parseArgs, runCheck, str, type Args } from './common';

function intArg(v: unknown, name: string): number {
  const s = str(v) ?? fail(`缺少 ${name}`);
  if (!/^\d{4}$/.test(s)) fail(`${name} 應為四位年份，收到「${s}」`);
  return Number(s);
}

function cmdYear(args: Args) {
  const y = intArg(args._[1] ?? args.year, '年份（如 year 2026）');
  console.log('# 五運六氣年局（工具確定性輸出）\n');
  console.log(buildWuyunDigest(computeWuyun(y)));
}

function cmdDate(args: Args) {
  const ds = str(args._[1]) ?? str(args.date) ?? fail('用法：date YYYY-MM-DD [--time HH:MM]（北京時間）');
  const m = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`日期格式應為 YYYY-MM-DD，收到「${ds}」`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) fail(`日期不存在：${ds}`);
  let hh = 12, mm = 0;
  const ts = str(args.time);
  if (ts) {
    const tm = ts.match(/^(\d{1,2}):(\d{2})$/) ?? fail(`--time 格式應為 HH:MM，收到「${ts}」`);
    [hh, mm] = [Number(tm[1]), Number(tm[2])];
    if (hh > 23 || mm > 59) fail(`--time 超出範圍：${ts}`);
  }
  const r = locateDate(y, mo, d, hh, mm);
  console.log('# 五運六氣（工具確定性輸出）\n');
  if (!ts) console.log('- 未給時刻，按當日 12:00（北京時間）定位\n');
  console.log(buildWuyunDigest(r.chart, { ...r, at: `${ds}${ts ? ' ' + ts : ''}` }));
}

function cmdTable(args: Args) {
  const from = intArg(args.from, '--from 起始年份');
  const to = intArg(args.to, '--to 結束年份');
  if (to < from) fail('--to 不能早於 --from');
  if (to - from > 59) fail('一次最多列 60 年');
  console.log('# 五運六氣年表（工具確定性輸出；運氣年自該年大寒起）\n');
  console.log('| 年 | 干支 | 歲運 | 司天 | 在泉 | 運氣關係 | 同化 |');
  console.log('|---|---|---|---|---|---|---|');
  for (let y = from; y <= to; y++) {
    const c = computeWuyun(y);
    console.log(`| ${y} | ${c.ganZhi} | ${c.suiYun.label} | ${c.siTian.name} | ${c.zaiQuan.name} | ${c.relation.kind} | ${c.tongHua.join('；') || '—'} |`);
  }
}

function cmdSections(args: Args) {
  const list = WUYUN_SECTION_SETS[args._[1] ?? 'wuyun'] ?? fail(`未知小節集合「${args._[1]}」，可用：${Object.keys(WUYUN_SECTION_SETS).join(' / ')}`);
  console.log('## wuyun\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node wuyun.mjs rules\`。`);
}

const HELP = `五運六氣 Skill 工具

  node wuyun.mjs year 2026                     （運氣年：自該年大寒起至次年大寒）
  node wuyun.mjs date 2026-11-21 [--time 15:20] （某日落在哪一運、哪一氣；北京時間）
  node wuyun.mjs table --from 2020 --to 2030   （多年對照表）
  node wuyun.mjs sections [wuyun] [--skeleton]
  node wuyun.mjs rules
  node wuyun.mjs check wuyun --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'year': cmdYear(args); break;
    case 'date': cmdDate(args); break;
    case 'table': cmdTable(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(WUYUN_VOCABULARY)); break;
    case 'check': runCheck(args, WUYUN_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check wuyun [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
