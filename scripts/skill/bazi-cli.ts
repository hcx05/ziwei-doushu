/**
 * 八字 Skill 的命令行工具源码 —— 打包后输出到
 *   .claude/skills/bazi/scripts/bazi.mjs （单文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   chart     排八字：四柱、十神、藏干、月令与根气、干支作用、大运、流年（确定性输出）
 *   sections  解读小节结构与推理类型；--skeleton 给出溯因节已预填标记的骨架
 *   rules     推理分工规则全文
 *   check     检查解读草稿：溯因节是否以「仅供参考」标记开头、小节是否齐全（--fix 自动补标记）
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
  if (z !== 'next-day' && z !== 'same-day') fail('--zishi 只能是 next-day（晚子时按次日，默认）或 same-day（夜子时，日柱留在当天）');
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
  console.log('# 八字（排盘引擎确定性输出）\n');
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
    const list = BAZI_SECTION_SETS[k] ?? fail(`未知小节集合「${k}」，可用：${Object.keys(BAZI_SECTION_SETS).join(' / ')} / all`);
    console.log(`## ${k}\n`);
    if (args.skeleton) console.log(renderSkeleton(list) + '\n');
    else {
      for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
      console.log('');
    }
  }
  console.log(`溯因节可以下结论，但一律以「${UNCERTAINTY_MARK}」开头，规则见 \`node bazi.mjs rules\`。`);
}

function cmdCheck(args: Args) {
  const key = args._[1] ?? fail(`用法：check <${Object.keys(BAZI_SECTION_SETS).join('|')}> [--file 草稿.md] [--fix]；草稿也可从标准输入读入`);
  const sections = BAZI_SECTION_SETS[key] ?? fail(`未知小节集合「${key}」`);
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
