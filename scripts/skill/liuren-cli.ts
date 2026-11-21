/**
 * 大六壬 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/liuren/scripts/liuren.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   ke        起課：--date/--time（當地時間，可加 --utc-offset）或 --now --utc-offset；
 *             也可直接給 --day 甲子 --hour 午 --jiang 亥（照書或他人給的課式覆核）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
 */
import { Solar } from 'lunar-javascript';
import { BRANCHES, type Branch } from '../../lib/systems/bazi/constants';
import { JIANG_NAME, QI_JIANG, buildLiuren } from '../../lib/systems/liuren/engine';
import { buildLiurenDigest } from '../../lib/systems/liuren/digest';
import { LIUREN_SECTION_SETS, LIUREN_VOCABULARY } from '../../lib/systems/liuren/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { clockBranch, fail, parseArgs, parseMoment, runCheck, str, type Args } from './common';

const branchArg = (v: unknown, name: string): Branch => {
  const s = str(v) ?? fail(`缺少 ${name}`);
  if (!(BRANCHES as readonly string[]).includes(s)) fail(`${name} 應為地支（子丑寅卯辰巳午未申酉戌亥），收到「${s}」`);
  return s as Branch;
};

function cmdKe(args: Args) {
  const assumptions: string[] = [];
  let dayGanZhi: string, hour: Branch, yueJiang: Branch;
  const lines: string[] = [];
  if (args.day !== undefined) {
    dayGanZhi = str(args.day) ?? fail('--day 應為日干支，如 甲子');
    hour = branchArg(args.hour, '--hour');
    yueJiang = branchArg(args.jiang, '--jiang');
    lines.push('- 課式由提問者直接給定（日干支、占時、月將），未經曆法換算');
  } else {
    const m = parseMoment(args);
    const off = m.utcOffset ?? 8;
    // 月將以中氣換，中氣時刻以東八區計
    const t = new Date(Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute) + (8 - off) * 3600_000);
    const bj = Solar.fromYmdHms(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), 0);
    const qi = bj.getLunar().getPrevQi(false);
    yueJiang = QI_JIANG[qi.getName()] ?? fail(`無法由中氣「${qi.getName()}」定月將`);
    hour = BRANCHES[clockBranch(m.hour)];
    const late = m.hour === 23;
    const dd = new Date(Date.UTC(m.year, m.month - 1, m.day + (late ? 1 : 0)));
    dayGanZhi = Solar.fromYmdHms(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), 12, 0, 0).getLunar().getEightChar().getDay();
    const pad = (n: number) => String(n).padStart(2, '0');
    lines.push(`- 起課時間：${m.year}-${pad(m.month)}-${pad(m.day)} ${pad(m.hour)}:${pad(m.minute)}（UTC${off >= 0 ? '+' : ''}${off}）`);
    lines.push(`- 月將：上一中氣為${qi.getName()}（${qi.getSolar().toYmdHms().slice(0, 16)} 東八區），月將${yueJiang}（${JIANG_NAME[yueJiang]}）`);
    if (late) assumptions.push(`${ASSUMPTION_MARK}23 點後起課，日干支按次日（${dayGanZhi}）計、占時為子；也有人仍按當天，四課會不同。`);
    assumptions.push(`${ASSUMPTION_MARK}占時用當地鐘錶時間的時辰，未做真太陽時校正；月將以中氣換將（${qi.getName()}後${JIANG_NAME[yueJiang]}），也有以太陽實際躔度或節換將的說法。`);
  }
  const c = buildLiuren({ dayGanZhi, hour, yueJiang });
  assumptions.push(`${ASSUMPTION_MARK}貴人用通行歌訣「甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，壬癸兔蛇藏，六辛逢馬虎」，前為晝貴、後為夜貴，卯至申時為晝；《六壬大全》正文未載起法，各家晝夜分法與壬癸、庚辛的配屬有異說，天將位置會因此不同。`);
  console.log('# 大六壬（工具確定性輸出）\n');
  for (const l of lines) console.log(l);
  if (lines.length) console.log('');
  console.log(buildLiurenDigest(c, assumptions));
  if (args.json) console.log('\n# 原始 JSON\n\n' + JSON.stringify(c));
}

function cmdSections(args: Args) {
  const list = LIUREN_SECTION_SETS[args._[1] ?? 'liuren'] ?? fail(`未知小節集合「${args._[1]}」，可用：${Object.keys(LIUREN_SECTION_SETS).join(' / ')}`);
  console.log('## liuren\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node liuren.mjs rules\`。`);
}

const HELP = `大六壬 Skill 工具（起課時間用問事者當下的當地時間；海外加 --utc-offset）

  node liuren.mjs ke --date 2026-11-21 --time 15:20
  node liuren.mjs ke --now --utc-offset 8
  node liuren.mjs ke --day 甲子 --hour 午 --jiang 亥      直接給課式覆核
  node liuren.mjs sections [liuren] [--skeleton]
  node liuren.mjs rules
  node liuren.mjs check liuren --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'ke': cmdKe(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(LIUREN_VOCABULARY)); break;
    case 'check': runCheck(args, LIUREN_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check liuren [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
