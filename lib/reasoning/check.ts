/**
 * lib/reasoning/check.ts —— 输出端的确定性检查：溯因节有没有标注
 *
 * 标注原本只靠提示词要求；模型漏写时没有任何补救。这里提供：
 *   · checkMarks()：找出缺标记的溯因节（小节按需取用，不要求逐节都写），以及正文超过 ABDUCTION_MAX_LINES 行的溯因节；
 *   · enforceMarks()：在缺标记的溯因节第一行前补上 UNCERTAINTY_MARK（不改动其他内容）。
 *
 * 只认 **【标题】** 这种小节标题（标题后允许跟「（仅供参考）」等说明）。
 * 溯因节的第一个非空行可以先是一行 ASSUMPTION_MARK 假设声明，之后的第一行必须以 UNCERTAINTY_MARK 开头。
 */
import { ABDUCTION_MAX_LINES, ASSUMPTION_MARK, UNCERTAINTY_MARK, UNCERTAINTY_MARK_TRAD, type SectionSpec } from './kinds';

const isMarked = (line: string) => line.trim().startsWith(UNCERTAINTY_MARK) || line.trim().startsWith(UNCERTAINTY_MARK_TRAD);

const HEADING = /^\s*\*\*【([^】]+)】\*\*.*$/;

interface Block { title: string; headingLine: number; bodyStart: number; bodyEnd: number }

function splitBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  lines.forEach((line, i) => {
    const m = line.match(HEADING);
    if (!m) return;
    if (blocks.length) blocks[blocks.length - 1].bodyEnd = i;
    blocks.push({ title: m[1].trim(), headingLine: i, bodyStart: i + 1, bodyEnd: lines.length });
  });
  return blocks;
}

/** 溯因节正文里应以标记开头的那一行（跳过空行与假设声明）；找不到返回 -1 */
function firstClaimLine(lines: string[], b: Block): number {
  for (let i = b.bodyStart; i < b.bodyEnd; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith(ASSUMPTION_MARK)) continue;
    return i;
  }
  return -1;
}

export interface MarkReport {
  /** 是溯因节，但第一行没有以 UNCERTAINTY_MARK 开头 */
  unmarkedAbduction: string[];
  /** 溯因节正文（不计空行、假设声明行）超过 ABDUCTION_MAX_LINES 行：多半又贴了讯号清单或推导过程 */
  tooLongAbduction: string[];
  ok: boolean;
}

export function checkMarks(text: string, sections: SectionSpec[]): MarkReport {
  const lines = text.split('\n');
  const blocks = splitBlocks(lines);
  const byTitle = new Map(blocks.map(b => [b.title, b]));
  const unmarkedAbduction: string[] = [];
  const tooLongAbduction: string[] = [];
  for (const s of sections) {
    const b = byTitle.get(s.title);
    if (!b || s.kind !== 'abduction') continue;
    const i = firstClaimLine(lines, b);
    if (i < 0 || !isMarked(lines[i])) unmarkedAbduction.push(s.title);
    const body = lines.slice(b.bodyStart, b.bodyEnd).map(l => l.trim()).filter(l => l && !l.startsWith(ASSUMPTION_MARK) && !/^依据|^依據|^```/.test(l));
    if (body.length > ABDUCTION_MAX_LINES) tooLongAbduction.push(s.title);
  }
  return { unmarkedAbduction, tooLongAbduction, ok: !unmarkedAbduction.length && !tooLongAbduction.length };
}

/** 给缺标记的溯因节补上标记；已标记的、非溯因的小节原样保留 */
export function enforceMarks(text: string, sections: SectionSpec[]): string {
  const abductive = new Set(sections.filter(s => s.kind === 'abduction').map(s => s.title));
  const lines = text.split('\n');
  const inserts: { at: number; line?: string }[] = [];
  for (const b of splitBlocks(lines)) {
    if (!abductive.has(b.title)) continue;
    const i = firstClaimLine(lines, b);
    if (i >= 0 && isMarked(lines[i])) continue;
    if (i < 0) inserts.push({ at: b.bodyStart, line: `${UNCERTAINTY_MARK}本节属于溯因推理。` });
    else inserts.push({ at: i });
  }
  for (const ins of inserts.reverse()) {
    if (ins.line !== undefined) lines.splice(ins.at, 0, ins.line);
    else {
      const indent = lines[ins.at].match(/^\s*/)![0];
      lines[ins.at] = indent + UNCERTAINTY_MARK + lines[ins.at].trimStart();
    }
  }
  return lines.join('\n');
}
