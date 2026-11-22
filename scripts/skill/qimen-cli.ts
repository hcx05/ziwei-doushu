/**
 * 奇門遁甲 Skill 的命令行工具源碼 —— 打包後輸出到
 *   .claude/skills/qimen/scripts/qimen.mjs （單文件、只需 Node 18+，不必 npm install）
 *
 * 重新打包：npm run build:skill
 *
 * 子命令：
 *   pan       起局：--date/--time（當地時間，可加 --utc-offset）或 --now --utc-offset；
 *             也可直接給 --dun 陽 --ju 2 --day 壬申 --hour 丙午（照書或他人給的局覆核）
 *   sections  解讀小節結構與推理類型；--skeleton 給出溯因節已預填標記的骨架
 *   rules     推理分工規則全文
 *   check     檢查解讀草稿（--fix 自動補標記）
 */
import { Solar } from '../../lib/calendar/lunar';
import { BRANCHES, STEMS, type Stem } from '../../lib/systems/bazi/constants';
import { buildQimen, determineJu, tw, type Dun } from '../../lib/systems/qimen/engine';
import { buildQimenDigest } from '../../lib/systems/qimen/digest';
import { QIMEN_SECTION_SETS, QIMEN_VOCABULARY } from '../../lib/systems/qimen/tasks';
import { buildReasoningRules, renderSkeleton } from '../../lib/reasoning/rules';
import { ASSUMPTION_MARK, REASONING_LABEL, UNCERTAINTY_MARK } from '../../lib/reasoning/kinds';
import { clockBranch, fail, parseArgs, parseMoment, runCheck, str, type Args } from './common';

const GZ = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;

function cmdPan(args: Args) {
  const head: string[] = [];
  const assumptions: string[] = [];
  let dun: Dun, ju: number, dayGz: string, hourGz: string;
  if (args.ju !== undefined) {
    const d = str(args.dun) ?? fail('--dun 應為 陽 或 陰');
    dun = /^(陽|陽|yang)$/.test(d) ? '陽' : /^(陰|陰|yin)$/.test(d) ? '陰' : fail(`--dun 應為 陽 或 陰，收到「${d}」`);
    ju = Number(str(args.ju));
    if (!(Number.isInteger(ju) && ju >= 1 && ju <= 9)) fail('--ju 應為 1–9');
    dayGz = str(args.day) ?? fail('缺少 --day 日干支');
    hourGz = str(args.hour) ?? fail('缺少 --hour 時干支');
    if (!GZ.test(dayGz) || !GZ.test(hourGz)) fail('--day、--hour 應為干支，如 壬申、丙午');
    head.push('局由提問者直接給定，未經曆法換算');
  } else {
    const m = parseMoment(args);
    const off = m.utcOffset ?? 8;
    const late = m.hour === 23;
    const dd = new Date(Date.UTC(m.year, m.month - 1, m.day + (late ? 1 : 0)));
    dayGz = Solar.fromYmdHms(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), 12, 0, 0).getLunar().getEightChar().getDay();
    const hb = clockBranch(m.hour);
    hourGz = STEMS[(STEMS.indexOf(dayGz[0] as Stem) * 2 + hb) % 10] + BRANCHES[hb];
    const t = new Date(Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute) + (8 - off) * 3600_000);
    const r = determineJu({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours() }, dayGz);
    dun = r.dun; ju = r.ju;
    const pad = (n: number) => String(n).padStart(2, '0');
    head.push(`起局時間：${m.year}-${pad(m.month)}-${pad(m.day)} ${pad(m.hour)}:${pad(m.minute)}（UTC${off >= 0 ? '+' : ''}${off}）`);
    head.push(`拆補法：${tw(r.jieqi)}${r.yuan}，${r.dun}遁${r.ju}局（本工具採用）`);
    if (r.zhiRun) {
      const z = r.zhiRun;
      const how = z.run ? '閏奇' : z.lead > 0 ? `超神 ${z.lead} 日` : z.lead < 0 ? `接氣 ${-z.lead} 日` : '正授';
      head.push(`置閏法：${tw(z.jieqi)}${z.yuan}（${how}），${z.dun}遁${z.ju}局`);
      if (z.dun !== r.dun || z.ju !== r.ju) {
        assumptions.push(`${ASSUMPTION_MARK}定局採拆補法（節氣按交節時刻、元按當日符頭）；按置閏法（符頭配節氣、超神接氣）此時是${tw(z.jieqi)}${z.yuan}${z.dun}遁${z.ju}局，盤會不同。`);
      }
    }
    if (late) assumptions.push(`${ASSUMPTION_MARK}23 點後起局，日干支按次日（${dayGz}）、時為子時；也有人仍按當天，局與時干會不同。`);
    assumptions.push(`${ASSUMPTION_MARK}時辰用當地鐘錶時間，未做真太陽時校正。`);
  }
  const c = buildQimen(dun, ju, dayGz, hourGz);
  console.log('# 奇門遁甲（工具確定性輸出）\n');
  console.log(buildQimenDigest(c, head, assumptions));
  if (args.json) console.log('\n# 原始 JSON\n\n' + JSON.stringify(c));
}

function cmdSections(args: Args) {
  const list = QIMEN_SECTION_SETS[args._[1] ?? 'qimen'] ?? fail(`未知小節集合「${args._[1]}」，可用：${Object.keys(QIMEN_SECTION_SETS).join(' / ')}`);
  console.log('## qimen\n');
  if (args.skeleton) console.log(renderSkeleton(list) + '\n');
  else {
    for (const s of list) console.log(`- **【${s.title}】** ［${REASONING_LABEL[s.kind]}］${s.instruction}`);
    console.log('');
  }
  console.log(`溯因節可以下結論，但一律以「${UNCERTAINTY_MARK}」開頭，規則見 \`node qimen.mjs rules\`。`);
}

const HELP = `奇門遁甲 Skill 工具（時家轉盤；起局時間用問事者當下的當地時間，海外加 --utc-offset）

  node qimen.mjs pan --date 2026-11-21 --time 15:20
  node qimen.mjs pan --now --utc-offset 8
  node qimen.mjs pan --dun 陽 --ju 2 --day 壬申 --hour 丙午     直接給局覆核
  node qimen.mjs sections [qimen] [--skeleton]
  node qimen.mjs rules
  node qimen.mjs check qimen --file 草稿.md [--fix]`;

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'pan': cmdPan(args); break;
    case 'sections': cmdSections(args); break;
    case 'rules': console.log(buildReasoningRules(QIMEN_VOCABULARY)); break;
    case 'check': runCheck(args, QIMEN_SECTION_SETS[args._[1] ?? ''] ?? fail('用法：check qimen [--file 草稿.md] [--fix]')); break;
    default: console.log(HELP);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
