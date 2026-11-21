/**
 * 择日 Skill 的命令行工具源码 —— 打包后输出到
 *   .claude/skills/zeri/scripts/zeri.mjs （单文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   day       某日的宜忌、建除、天神黄黑道、宿、九星、冲煞、吉神凶煞、时辰宜忌
 *   find      在一段日期里筛出「宜某事且不忌」的日子（按日期先后，不评分）
 *   terms     通书宜忌用语全表；--for 白话 查常见对应
 *   sections  解读小节结构与推理类型；--skeleton 给出溯因节已预填标记的骨架
 *   rules     推理分工规则全文
 *   check     检查解读草稿（--fix 自动补标记）
 */
import { COMMON_ALIASES, YI_JI_TERMS, dayInfo, findDays, parseShengXiao } from '../../lib/systems/zeri/engine';
import { buildDayDigest, buildFindDigest } from '../../lib/systems/zeri/digest';
import { ZERI_SECTION_SETS, ZERI_VOCABULARY } from '../../lib/systems/zeri/tasks';
import type { Branch } from '../../lib/systems/bazi/constants';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { fail, parseArgs, runCheck, str, type Args } from './common';

function ymd(v: unknown, name: string): [number, number, number] {
  const s = str(v) ?? fail(`缺少 ${name} YYYY-MM-DD`);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`${name} 格式应为 YYYY-MM-DD，收到「${s}」`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function person(args: Args): Branch | undefined {
  const s = str(args.shengxiao);
  return s ? parseShengXiao(s) : undefined;
}

function cmdDay(args: Args) {
  const [y, m, d] = ymd(args._[1] ?? args.date, '日期');
  console.log('# 择日资料（工具确定性输出；北京时间）\n');
  console.log(buildDayDigest(dayInfo(y, m, d), person(args), !args['no-times']));
}

function cmdFind(args: Args) {
  const term = str(args.yi) ?? fail('缺少 --yi 通书用语（如 嫁娶、移徙、开市）；不确定用语时先用 terms --for 白话 查');
  if (!YI_JI_TERMS.includes(term)) {
    const alias = COMMON_ALIASES[term];
    fail(alias
      ? `「${term}」不是通书用语；常见对应为：${alias.join('、')}。请与提问者确认后用 --yi 指定其中一个`
      : `「${term}」不是通书用语，用 terms 查看全表`);
  }
  const from = ymd(args.from, '--from');
  const to = ymd(args.to, '--to');
  const p = person(args);
  const hits = findDays(from, to, term, p);
  const f = (a: number[]) => a.map((n, i) => (i ? String(n).padStart(2, '0') : n)).join('-');
  console.log('# 择日筛选（工具确定性输出；北京时间）\n');
  console.log(buildFindDigest(term, f(from), f(to), hits, p));
}

function cmdTerms(args: Args) {
  const q = str(args.for);
  if (q) {
    const alias = COMMON_ALIASES[q];
    if (YI_JI_TERMS.includes(q)) console.log(`「${q}」本身就是通书用语。`);
    if (alias) console.log(`「${q}」常见对应的通书用语：${alias.join('、')}（只是常见对应，请与提问者确认）`);
    if (!alias && !YI_JI_TERMS.includes(q)) console.log(`没有收录「${q}」的常见对应；请从下表挑选，并与提问者确认。\n\n${YI_JI_TERMS.join('、')}`);
    return;
  }
  console.log(`通书宜忌用语（${YI_JI_TERMS.length} 个）：\n${YI_JI_TERMS.join('、')}`);
  console.log(`\n常见白话对应：\n${Object.entries(COMMON_ALIASES).map(([k, v]) => `- ${k} → ${v.join('、')}`).join('\n')}`);
}

function cmdSections(args: Args) {
  const key = args._[1] ?? 'zeri';
  const keys = key === 'all' ? Object.keys(ZERI_SECTION_SETS) : [key];
  for (const k of keys) {
    const list = ZERI_SECTION_SETS[k] ?? fail(`未知小节集合「${k}」，可用：${Object.keys(ZERI_SECTION_SETS).join(' / ')}`);
    console.log(`## ${k}\n`);
    if (args.skeleton) console.log(renderSkeleton(list) + '\n');
    else {
      for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
      console.log('');
    }
  }
  console.log(`溯因节可以下结论，但一律以「${UNCERTAINTY_MARK}」开头，规则见 \`node zeri.mjs rules\`。`);
}

const HELP = `择日 Skill 工具（日期均为北京时间的公历日期）

  node zeri.mjs day 2026-12-01 [--shengxiao 马] [--no-times]
  node zeri.mjs find --yi 嫁娶 --from 2026-12-01 --to 2027-02-28 [--shengxiao 马]
  node zeri.mjs terms [--for 搬家]
  node zeri.mjs sections [zeri | zeri-day | all] [--skeleton]
  node zeri.mjs rules
  node zeri.mjs check zeri --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'day': cmdDay(args); break;
    case 'find': cmdFind(args); break;
    case 'terms': cmdTerms(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(ZERI_VOCABULARY)); break;
    case 'check': runCheck(args, ZERI_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check zeri|zeri-day [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
