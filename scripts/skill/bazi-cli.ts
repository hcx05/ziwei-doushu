/**
 * 八字 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/bazi/scripts/bazi.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   chart     排八字：四柱、十神、藏干、月令與根氣、干支作用、大運、流年（確定性輸出）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿：溯因節是否以「僅供參考」標記開頭、小節是否齊全（--fix 自動補標記）
 */
import { computeBazi, type LateZishi } from '../../lib/systems/bazi/engine';
import { buildBaziDigest } from '../../lib/systems/bazi/digest';
import { BAZI_SECTION_SETS, BAZI_VOCABULARY } from '../../lib/systems/bazi/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { fail, parseArgs, parseBirthArgs, runCheck, str, type Args } from './common';

function cmdChart(args: Args) {
  const { form, notes } = parseBirthArgs(args);
  const z = str(args.zishi) ?? 'next-day';
  if (z !== 'next-day' && z !== 'same-day') fail('--zishi 只能是 next-day（晚子時按次日，默認）或 same-day（夜子時，日柱留在當天）');
  const yearArg = str(args.year);
  const liunianYear = yearArg ? Number(yearArg) : new Date().getFullYear();
  if (!Number.isInteger(liunianYear)) fail(`--year 不是年份：${yearArg}`);
  const chart = computeBazi({
    year: Number(form.year), month: Number(form.month), day: Number(form.day),
    clock: form.unknownTime ? null : { hour: Number(form.clockHour), minute: Number(form.clockMinute) },
    longitude: form.province ? form.longitude : undefined,
    gender: form.gender,
    lateZishi: z as LateZishi,
    liunianYear,
  });
  console.log('# 八字（排盤引擎確定性輸出）\n');
  if (notes.length) console.log(notes.map(n => `- ${n}`).join('\n') + '\n');
  console.log(buildBaziDigest(chart));
  if (args.json) {
    console.log('\n# 原始 JSON\n');
    console.log(JSON.stringify(chart));
  }
}

function cmdSections(args: Args) {
  const key = args._[1];
  const keys = !key || key === 'all' ? Object.keys(BAZI_SECTION_SETS) : [key];
  for (const k of keys) {
    const list = BAZI_SECTION_SETS[k] ?? fail(`未知小節集合「${k}」，可用：${Object.keys(BAZI_SECTION_SETS).join(' / ')} / all`);
    console.log(`## ${k}\n`);
    if (args.skeleton) console.log(renderSkeleton(list) + '\n');
    else {
      for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
      console.log('');
    }
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node bazi.mjs rules\`。`);
}

function cmdCheck(args: Args) {
  const key = args._[1] ?? fail(`用法：check <${Object.keys(BAZI_SECTION_SETS).join('|')}> [--file 草稿.md] [--fix]；草稿也可從標準輸入讀入`);
  const sections = BAZI_SECTION_SETS[key] ?? fail(`未知小節集合「${key}」`);
  runCheck(args, sections);
}

const HELP = `八字 Skill 工具

  node bazi.mjs chart --date 1990-06-15 --time 10:30 --gender 女 [--city 杭州 | --longitude 120.2] [--year 2026] [--zishi same-day]
  node bazi.mjs chart --date 1990-05-23 --lunar [--leap] --time 10:30 --gender 男
  node bazi.mjs chart --date 1990-06-15 --unknown-time --gender 女
  node bazi.mjs chart --date 1992-03-04 --time 23:10 --gender 男 --utc-offset -5 --longitude -74.0   （海外出生）
  node bazi.mjs sections [bazi|bazi-dayun|bazi-liunian|all] [--skeleton]
  node bazi.mjs rules
  node bazi.mjs check bazi --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'chart': cmdChart(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(BAZI_VOCABULARY)); break;
    case 'check': cmdCheck(args); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
