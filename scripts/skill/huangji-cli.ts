/**
 * 皇極經世 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/huangji/scripts/huangji.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   year      某年在元會運世中的位置，以及《皇極經世》「以運經世」原文（若在收錄範圍）
 *   search    在「以運經世」原文中搜尋關鍵字（列出定年後的條目）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
 */
import { CHRONICLE_RANGE, locate, searchChronicle } from '../../lib/systems/huangji/engine';
import { buildHuangjiDigest } from '../../lib/systems/huangji/digest';
import { HUANGJI_SECTION_SETS, HUANGJI_VOCABULARY } from '../../lib/systems/huangji/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { fail, parseArgs, runCheck, str, type Args } from './common';

function cmdYear(args: Args) {
  const s = str(args._[1]) ?? str(args.year) ?? fail('用法：year <年份>，公元前用負數（如 -2357）');
  if (!/^-?\d{1,5}$/.test(s) || Number(s) === 0) fail(`年份應為非零整數，公元前用負數，收到「${s}」`);
  console.log('# 皇極經世（工具確定性輸出）\n');
  console.log(buildHuangjiDigest(locate(Number(s))));
}

function cmdSearch(args: Args) {
  const k = str(args._[1]) ?? fail('用法：search <關鍵字>（原文為繁體／四庫本用字，如「改元」「秦」）');
  const limit = Number(str(args.limit) ?? 30);
  const hits = searchChronicle(k, Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 30);
  console.log(`# 「以運經世」原文搜尋：${k}（範圍 ${CHRONICLE_RANGE.from}至${CHRONICLE_RANGE.to}）\n`);
  if (!hits.length) { console.log('沒有找到。原文為四庫本用字（如「㑹」「嵗」），可換字再試。'); return; }
  for (const h of hits) console.log(`- ${h.position.label}（${h.position.ganZhi}，${h.position.shi.label}第${h.position.shi.no}世）：「${h.text}」`);
  if (hits.length >= limit) console.log(`\n（只列前 ${hits.length} 條，可加 --limit）`);
}

function cmdSections(args: Args) {
  const list = HUANGJI_SECTION_SETS[args._[1] ?? 'huangji'] ?? fail(`未知小節集合「${args._[1]}」，可用：${Object.keys(HUANGJI_SECTION_SETS).join(' / ')}`);
  console.log('## huangji\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node huangji.mjs rules\`。`);
}

const HELP = `皇極經世 Skill 工具（年份可為負數表示公元前）

  node huangji.mjs year 2026
  node huangji.mjs year -2357
  node huangji.mjs search 改元貞觀 [--limit 30]
  node huangji.mjs sections [huangji] [--skeleton]
  node huangji.mjs rules
  node huangji.mjs check huangji --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'year': cmdYear(args); break;
    case 'search': cmdSearch(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(HUANGJI_VOCABULARY)); break;
    case 'check': runCheck(args, HUANGJI_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check huangji [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
