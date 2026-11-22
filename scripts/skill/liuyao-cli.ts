/**
 * 六爻 Skill 的命令行工具源码 —— 打包后输出到
 *   .claude/skills/liuyao/scripts/liuyao.mjs （单文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   cast      起卦并装卦：--yao 输入问卜者亲手掷钱的结果、--time-cast 时间起卦
 *             （不提供电脑随机数代掷：随机数不是问卜者亲手摇卦，传统上不成卦）
 *   gua       查某一卦的《周易》卦辞、爻辞原文
 *   sections  解读小节结构与推理类型；--skeleton 给出溯因节已预填标记的骨架
 *   rules     推理分工规则全文
 *   check     检查解读草稿：溯因节是否以「仅供参考」标记开头、小节是否齐全（--fix 自动补标记）
 */
import { Solar } from 'lunar-javascript';
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
  if (args.toss) fail('不提供电脑随机代掷：随机数不是问卜者亲手摇卦，传统上不成卦。请问卜者自己掷三枚铜钱六次后用 --yao 输入，或改用 --time-cast 时间起卦。');
  const modes = [args.yao !== undefined, !!args['time-cast']].filter(Boolean).length;
  if (modes !== 1) fail('起卦方法二选一：--yao 六位数字（问卜者亲手掷钱，自下而上，6 老阴 7 少阳 8 少阴 9 老阳）、--time-cast（时间起卦）');
  let values: YaoValue[];
  let method: string;
  const extra: string[] = [];
  if (args.yao !== undefined) {
    values = parseYaoDigits(String(args.yao));
    method = '问卜者自行掷钱，手动输入';
  } else {
    const lunar = Solar.fromYmd(moment.year, moment.month, moment.day).getLunar() as unknown as {
      getYearZhi(): string; getMonth(): number; getDay(): number;
    };
    const yb = BRANCHES.indexOf(lunar.getYearZhi() as (typeof BRANCHES)[number]);
    const lm = Math.abs(lunar.getMonth());
    const hb = clockBranch(moment.hour);
    const t = timeCast(yb, lm, lunar.getDay(), hb);
    values = t.values;
    method = '时间起卦（梅花易数法：年支数＋农历月日定上卦，加时支数定下卦与动爻）';
    extra.push(t.detail);
    if (lunar.getMonth() < 0) extra.push('闰月按月份数字计');
    if (moment.hour === 23) extra.push(`${ASSUMPTION_MARK}23 点起卦：时间起卦仍按当天农历日与子时计；有人按次日计，卦会不同。`);
  }
  const chart = buildLiuyao(values, moment, method);
  console.log('# 六爻（工具确定性输出）\n');
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
  console.log(`卦辞：「${h.guaCi}」`);
  h.yaoCi.forEach(y => console.log(`- 「${y}」`));
  if (h.yong) console.log(`- 「${h.yong}」`);
  console.log('\n（《周易》原文，校勘见仓库 docs/zhouyi-collation.md）');
}

function cmdSections(args: Args) {
  const key = args._[1] ?? 'liuyao';
  const list = LIUYAO_SECTION_SETS[key === 'all' ? 'liuyao' : key] ?? fail(`未知小节集合「${key}」，可用：${Object.keys(LIUYAO_SECTION_SETS).join(' / ')}`);
  console.log('## liuyao\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因节可以下结论，但一律以「${UNCERTAINTY_MARK}」开头，规则见 \`node liuyao.mjs rules\`。`);
}

function cmdCheck(args: Args) {
  const key = args._[1] ?? fail('用法：check liuyao [--file 草稿.md] [--fix]；草稿也可从标准输入读入');
  runCheck(args, LIUYAO_SECTION_SETS[key] ?? fail(`未知小节集合「${key}」`));
}

const HELP = `六爻 Skill 工具

  node liuyao.mjs cast --yao 789867 --date 2026-11-21 --time 15:20        （自下而上六爻：6 老阴 7 少阳 8 少阴 9 老阳）
  node liuyao.mjs cast --time-cast --date 2026-11-21 --time 15:20         （时间起卦）
  node liuyao.mjs gua 乾 | gua 水雷屯 | gua 3
  node liuyao.mjs sections [liuyao] [--skeleton]
  node liuyao.mjs rules
  node liuyao.mjs check liuyao --file 草稿.md [--fix]

起卦时间一律用问卜者「起卦当下的当地时间」；海外加 --utc-offset。`;

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
