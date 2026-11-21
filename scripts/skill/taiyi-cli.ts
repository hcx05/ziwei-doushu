/**
 * 太乙神數 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/taiyi/scripts/taiyi.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   year      某年的歲計局（積年、局、太乙、文昌、始擊、主客算與將、掩囚格、三基五福大遊）
 *   table     一段年份的歲計對照表
 *   ju        陽局 1–72 某局的局面（不涉年份）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
 */
import { GOD_NAME, GONG_NAME, computeTaiyiYear, yangJu } from '../../lib/systems/taiyi/engine';
import { buildTaiyiDigest } from '../../lib/systems/taiyi/digest';
import { TAIYI_SECTION_SETS, TAIYI_VOCABULARY } from '../../lib/systems/taiyi/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { fail, parseArgs, runCheck, str, type Args } from './common';

/** 年份參數：允許負數表示公元前（-221 = 公元前 221 年） */
function yearArg(v: unknown, name: string): number {
  const s = str(v) ?? fail(`缺少 ${name}`);
  if (!/^-?\d{1,4}$/.test(s) || Number(s) === 0) fail(`${name} 應為非零整數年份，公元前用負數（如 -221），收到「${s}」`);
  return Number(s);
}

function cmdYear(args: Args) {
  const y = yearArg(args._[1] ?? args.year, '年份（如 year 2026）');
  console.log('# 太乙歲計（工具確定性輸出）\n');
  console.log(buildTaiyiDigest(computeTaiyiYear(y)));
}

function cmdTable(args: Args) {
  const from = yearArg(args.from, '--from'), to = yearArg(args.to, '--to');
  if (to < from) fail('--to 不能早於 --from');
  if (to - from > 72) fail('一次最多列 73 年');
  console.log('# 太乙歲計年表（工具確定性輸出）\n');
  console.log('| 年 | 太歲 | 局 | 太乙 | 文昌 | 始擊 | 主算 | 客算 | 掩囚格 |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (let y = from; y <= to; y++) {
    if (y === 0) continue;
    const t = computeTaiyiYear(y);
    console.log(`| ${y} | ${t.taiSui} | ${t.ju} | ${t.taiyi.gong}${GONG_NAME[t.taiyi.gong]} | ${GOD_NAME[t.tianMu]} | ${GOD_NAME[t.shiJi]} | ${t.zhu.suan} | ${t.ke.suan} | ${t.patterns.map(p => p.split('：')[0]).join('、') || '—'} |`);
  }
}

function cmdJu(args: Args) {
  const n = Number(str(args._[1]) ?? fail('用法：ju <1–72>'));
  const j = yangJu(n);
  console.log(`# 陽遁第${j.ju}局\n`);
  console.log(`太乙 ${j.taiyi.gong}宮（${GONG_NAME[j.taiyi.gong]}）入宮第${j.taiyi.yearInGong}年；文昌 ${GOD_NAME[j.tianMu]}（${j.tianMu}）；計神 ${j.jiShen}；始擊 ${GOD_NAME[j.shiJi]}（${j.shiJi}）`);
  console.log(`主算 ${j.zhu.suan}（大將 ${j.zhu.general}、參將 ${j.zhu.deputy}）；客算 ${j.ke.suan}（大將 ${j.ke.general}、參將 ${j.ke.deputy}）`);
}

function cmdSections(args: Args) {
  const list = TAIYI_SECTION_SETS[args._[1] ?? 'taiyi'] ?? fail(`未知小節集合「${args._[1]}」，可用：${Object.keys(TAIYI_SECTION_SETS).join(' / ')}`);
  console.log('## taiyi\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node taiyi.mjs rules\`。`);
}

const HELP = `太乙神數 Skill 工具（歲計；年份可為負數表示公元前）

  node taiyi.mjs year 2026
  node taiyi.mjs table --from 2020 --to 2030
  node taiyi.mjs ju 49
  node taiyi.mjs sections [taiyi] [--skeleton]
  node taiyi.mjs rules
  node taiyi.mjs check taiyi --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'year': cmdYear(args); break;
    case 'table': cmdTable(args); break;
    case 'ju': cmdJu(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(TAIYI_VOCABULARY)); break;
    case 'check': runCheck(args, TAIYI_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check taiyi [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
