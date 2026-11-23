/**
 * lib/reasoning/check.ts —— 輸出端的確定性檢查：溯因節有沒有標注
 *
 * 標注原本只靠提示詞要求；模型漏寫時沒有任何補救。這裡提供：
 *   · checkMarks()：找出缺標記的溯因節（小節按需取用，不要求逐節都寫），以及正文超過 ABDUCTION_MAX_LINES 行的溯因節
 *     （應期題每有一行「候選：」上限加一行，候選超過 MAX_CANDIDATES 行仍算過長）；
 *   · enforceMarks()：在缺標記的溯因節第一行前補上 UNCERTAINTY_MARK（不改動其他內容）。
 *
 * 只認 **【標題】** 這種小節標題（標題後允許跟「（僅供參考）」等說明）。
 * 溯因節的第一個非空行可以先是一行 ASSUMPTION_MARK 假設聲明，之後的第一行必須以 UNCERTAINTY_MARK 開頭。
 */
import { ABDUCTION_MAX_LINES, ASSUMPTION_MARK, CANDIDATE_MARK, CANDIDATE_MARK_SIMP, MAX_CANDIDATE_CHARS, MAX_CANDIDATES, UNCERTAINTY_MARK, UNCERTAINTY_MARK_SIMP, type SectionSpec } from './kinds';

const isMarked = (line: string) => line.trim().startsWith(UNCERTAINTY_MARK) || line.trim().startsWith(UNCERTAINTY_MARK_SIMP);

const isCandidate = (line: string) => line.startsWith(CANDIDATE_MARK) || line.startsWith(CANDIDATE_MARK_SIMP);

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

/** 溯因節正文裡應以標記開頭的那一行（跳過空行與假設聲明）；找不到返回 -1 */
function firstClaimLine(lines: string[], b: Block): number {
  for (let i = b.bodyStart; i < b.bodyEnd; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith(ASSUMPTION_MARK)) continue;
    return i;
  }
  return -1;
}

export interface MarkReport {
  /** 是溯因節，但第一行沒有以 UNCERTAINTY_MARK 開頭 */
  unmarkedAbduction: string[];
  /** 溯因節正文（不計空行、假設聲明行）超過 ABDUCTION_MAX_LINES 行（加上候選行數），或候選超過 MAX_CANDIDATES 行、某行候選超過 MAX_CANDIDATE_CHARS 字：多半又貼了訊號清單或推導過程 */
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
    const body = lines.slice(b.bodyStart, b.bodyEnd).map(l => l.trim()).filter(l => l && !l.startsWith(ASSUMPTION_MARK) && !/^依據|^依據|^```/.test(l));
    const candidates = body.filter(isCandidate).length;
    const longCandidate = body.some(l => isCandidate(l) && l.replace(/\s/g, '').length > MAX_CANDIDATE_CHARS);
    if (candidates > MAX_CANDIDATES || longCandidate || body.length > ABDUCTION_MAX_LINES + candidates) tooLongAbduction.push(s.title);
  }
  return { unmarkedAbduction, tooLongAbduction, ok: !unmarkedAbduction.length && !tooLongAbduction.length };
}

/** 給缺標記的溯因節補上標記；已標記的、非溯因的小節原樣保留 */
export function enforceMarks(text: string, sections: SectionSpec[]): string {
  const abductive = new Set(sections.filter(s => s.kind === 'abduction').map(s => s.title));
  const lines = text.split('\n');
  const inserts: { at: number; line?: string }[] = [];
  for (const b of splitBlocks(lines)) {
    if (!abductive.has(b.title)) continue;
    const i = firstClaimLine(lines, b);
    if (i >= 0 && isMarked(lines[i])) continue;
    if (i < 0) inserts.push({ at: b.bodyStart, line: `${UNCERTAINTY_MARK}本節屬於溯因推理。` });
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
