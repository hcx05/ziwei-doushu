/**
 * 擇日 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/zeri/scripts/zeri.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   day       某日的宜忌、建除、天神黃黑道、宿、九星、沖煞、吉神凶煞、時辰宜忌
 *   find      在一段日期裡篩出「宜某事且不忌」的日子（按日期先後，不評分）
 *   terms     通書宜忌用語全表；--for 白話 查常見對應
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
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
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? fail(`${name} 格式應為 YYYY-MM-DD，收到「${s}」`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function person(args: Args): Branch | undefined {
  const s = str(args.shengxiao);
  return s ? parseShengXiao(s) : undefined;
}

function cmdDay(args: Args) {
  const [y, m, d] = ymd(args._[1] ?? args.date, '日期');
  console.log('# 擇日資料（工具確定性輸出；北京時間）\n');
  console.log(buildDayDigest(dayInfo(y, m, d), person(args), !args['no-times']));
}

function cmdFind(args: Args) {
  const term = str(args.yi) ?? fail('缺少 --yi 通書用語（如 嫁娶、移徙、開市）；不確定用語時先用 terms --for 白話 查');
  if (!YI_JI_TERMS.includes(term)) {
    const alias = COMMON_ALIASES[term];
    fail(alias
      ? `「${term}」不是通書用語；常見對應為：${alias.join('、')}。請與提問者確認後用 --yi 指定其中一個`
      : `「${term}」不是通書用語，用 terms 查看全表`);
  }
  const from = ymd(args.from, '--from');
  const to = ymd(args.to, '--to');
  const p = person(args);
  const hits = findDays(from, to, term, p);
  const f = (a: number[]) => a.map((n, i) => (i ? String(n).padStart(2, '0') : n)).join('-');
  console.log('# 擇日篩選（工具確定性輸出；北京時間）\n');
  console.log(buildFindDigest(term, f(from), f(to), hits, p));
}

function cmdTerms(args: Args) {
  const q = str(args.for);
  if (q) {
    const alias = COMMON_ALIASES[q];
    if (YI_JI_TERMS.includes(q)) console.log(`「${q}」本身就是通書用語。`);
    if (alias) console.log(`「${q}」常見對應的通書用語：${alias.join('、')}（只是常見對應，請與提問者確認）`);
    if (!alias && !YI_JI_TERMS.includes(q)) console.log(`沒有收錄「${q}」的常見對應；請從下表挑選，並與提問者確認。\n\n${YI_JI_TERMS.join('、')}`);
    return;
  }
  console.log(`通書宜忌用語（${YI_JI_TERMS.length} 個）：\n${YI_JI_TERMS.join('、')}`);
  console.log(`\n常見白話對應：\n${Object.entries(COMMON_ALIASES).map(([k, v]) => `- ${k} → ${v.join('、')}`).join('\n')}`);
}

function cmdSections(args: Args) {
  const key = args._[1] ?? 'zeri';
  const keys = key === 'all' ? Object.keys(ZERI_SECTION_SETS) : [key];
  for (const k of keys) {
    const list = ZERI_SECTION_SETS[k] ?? fail(`未知小節集合「${k}」，可用：${Object.keys(ZERI_SECTION_SETS).join(' / ')}`);
    console.log(`## ${k}\n`);
    if (args.skeleton) console.log(renderSkeleton(list) + '\n');
    else {
      for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
      console.log('');
    }
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node zeri.mjs rules\`。`);
}

const HELP = `擇日 Skill 工具（日期均為北京時間的公曆日期）

  node zeri.mjs day 2026-12-01 [--shengxiao 馬] [--no-times]
  node zeri.mjs find --yi 嫁娶 --from 2026-12-01 --to 2027-02-28 [--shengxiao 馬]
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
