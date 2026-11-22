/**
 * 六爻 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/liuyao/scripts/liuyao.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   cast      起卦並裝卦：--yao 輸入問卜者親手擲錢的結果、--time-cast 時間起卦
 *             （不提供電腦隨機數代擲：隨機數不是問卜者親手搖卦，傳統上不成卦）
 *   gua       查某一卦的《周易》卦辭、爻辭原文
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿：溯因節是否以「僅供參考」標記開頭、小節是否齊全（--fix 自動補標記）
 */
import { Solar } from '../../lib/calendar/lunar';
import { buildLiuyao, parseYaoDigits, timeCast, type YaoValue } from '../../lib/systems/liuyao/engine';
import { buildLiuyaoDigest } from '../../lib/systems/liuyao/digest';
import { LIUYAO_SECTION_SETS, LIUYAO_VOCABULARY } from '../../lib/systems/liuyao/tasks';
import { ZHOUYI } from '../../lib/systems/liuyao/zhouyi.data';
import { BRANCHES } from '../../lib/systems/bazi/constants';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { clockBranch, fail, parseArgs, parseMoment, runCheck, str, type Args } from './common';


function cmdCast(args: Args) {
  const moment = parseMoment(args);
  if (args.toss) fail('不提供電腦隨機代擲：隨機數不是問卜者親手搖卦，傳統上不成卦。請問卜者自己擲三枚銅錢六次後用 --yao 輸入，或改用 --time-cast 時間起卦。');
  const modes = [args.yao !== undefined, !!args['time-cast']].filter(Boolean).length;
  if (modes !== 1) fail('起卦方法二選一：--yao 六位數字（問卜者親手擲錢，自下而上，6 老陰 7 少陽 8 少陰 9 老陽）、--time-cast（時間起卦）');
  let values: YaoValue[];
  let method: string;
  const extra: string[] = [];
  if (args.yao !== undefined) {
    values = parseYaoDigits(String(args.yao));
    method = '問卜者自行擲錢，手動輸入';
  } else {
    const lunar = Solar.fromYmd(moment.year, moment.month, moment.day).getLunar() as unknown as {
      getYearZhi(): string; getMonth(): number; getDay(): number;
    };
    const yb = BRANCHES.indexOf(lunar.getYearZhi() as (typeof BRANCHES)[number]);
    const lm = Math.abs(lunar.getMonth());
    const hb = clockBranch(moment.hour);
    const t = timeCast(yb, lm, lunar.getDay(), hb);
    values = t.values;
    method = '時間起卦（梅花易數法：年支數＋農曆月日定上卦，加時支數定下卦與動爻）';
    extra.push(t.detail);
    if (lunar.getMonth() < 0) extra.push('閏月按月份數字計');
    if (moment.hour === 23) extra.push(`${ASSUMPTION_MARK}23 點起卦：時間起卦仍按當天農曆日與子時計；有人按次日計，卦會不同。`);
  }
  const chart = buildLiuyao(values, moment, method);
  console.log('# 六爻（工具確定性輸出）\n');
  for (const e of extra) console.log(`- ${e}`);
  if (extra.length) console.log('');
  console.log(buildLiuyaoDigest(chart));
  if (args.json) {
    console.log('\n# 原始 JSON\n');
    console.log(JSON.stringify(chart));
  }
}

function cmdGua(args: Args) {
  const q = args._[1] ?? fail('用法：gua <卦名或卦序>，如 gua 乾、gua 水雷屯、gua 3');
  const h = ZHOUYI.find(x => x.name === q || x.fullName === q || String(x.no) === q) ?? fail(`找不到卦「${q}」`);
  console.log(`# ${h.fullName}（第${h.no}卦，上${h.upper}下${h.lower}）\n`);
  console.log(`卦辭：「${h.guaCi}」`);
  h.yaoCi.forEach(y => console.log(`- 「${y}」`));
  if (h.yong) console.log(`- 「${h.yong}」`);
  console.log('\n（《周易》原文，校勘見倉庫 docs/zhouyi-collation.md）');
}

function cmdSections(args: Args) {
  const key = args._[1] ?? 'liuyao';
  const list = LIUYAO_SECTION_SETS[key === 'all' ? 'liuyao' : key] ?? fail(`未知小節集合「${key}」，可用：${Object.keys(LIUYAO_SECTION_SETS).join(' / ')}`);
  console.log('## liuyao\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node liuyao.mjs rules\`。`);
}

function cmdCheck(args: Args) {
  const key = args._[1] ?? fail('用法：check liuyao [--file 草稿.md] [--fix]；草稿也可從標準輸入讀入');
  runCheck(args, LIUYAO_SECTION_SETS[key] ?? fail(`未知小節集合「${key}」`));
}

const HELP = `六爻 Skill 工具

  node liuyao.mjs cast --yao 789867 --date 2026-11-21 --time 15:20        （自下而上六爻：6 老陰 7 少陽 8 少陰 9 老陽）
  node liuyao.mjs cast --time-cast --date 2026-11-21 --time 15:20         （時間起卦）
  node liuyao.mjs gua 乾 | gua 水雷屯 | gua 3
  node liuyao.mjs sections [liuyao] [--skeleton]
  node liuyao.mjs rules
  node liuyao.mjs check liuyao --file 草稿.md [--fix]

起卦時間一律用問卜者「起卦當下的當地時間」；海外加 --utc-offset。`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'cast': cmdCast(args); break;
    case 'gua': cmdGua(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(LIUYAO_VOCABULARY)); break;
    case 'check': cmdCheck(args); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
