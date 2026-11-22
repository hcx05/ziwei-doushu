/**
 * 古籍原典查詢庫 — 入口
 *
 * 只收原文：《紫微斗數全書》卷一至卷三（清刊本）、《紫微斗數》（續道藏本），取自維基文庫，
 * 由 scripts/classics/import-ziwei-wikisource.py 產生。2026-11-22 以前這裡的「全書」「全集」「骨髓賦」
 * 是上游專案的白話改寫（共 75 段，與通行本對不上），已移除。
 */

import type { Book, Paragraph, SearchHit } from './types';
import { ziWeiQuanShuText } from './data/quanshu-text.data';
import { ziWeiDaoZangText } from './data/daozang-text.data';

/** 所有已收錄古籍（原文） */
export const ALL_BOOKS: Book[] = [
  ziWeiQuanShuText,
  ziWeiDaoZangText,
];

/** 總段落數（用於首頁統計） */
export const TOTAL_PARAGRAPHS = ALL_BOOKS.reduce(
  (sum, b) => sum + b.chapters.reduce((s, c) => s + c.paragraphs.length, 0),
  0,
);

/** 按 slug 取書 */
export function getBookBySlug(slug: string): Book | null {
  return ALL_BOOKS.find(b => b.slug === slug) ?? null;
}

/** 按章節序號取章節 */
export function getChapter(bookSlug: string, chapterIdx: number) {
  const book = getBookBySlug(bookSlug);
  if (!book) return null;
  const chapter = book.chapters[chapterIdx];
  if (!chapter) return null;
  return { book, chapter, chapterIdx };
}

/** 按段落 id 取段落（含書與章節信息）*/
export function getParagraphById(id: string) {
  for (const book of ALL_BOOKS) {
    for (let i = 0; i < book.chapters.length; i++) {
      const ch = book.chapters[i];
      const p = ch.paragraphs.find(p => p.id === id);
      if (p) {
        return { book, chapter: ch, chapterIdx: i, paragraph: p };
      }
    }
  }
  return null;
}

/**
 * 全文搜索
 *
 * 簡單子字符串匹配（不分詞）；多個關鍵詞時，第一個須在段落裡，其餘在段落或章名裡即可
 */
export function searchClassics(query: string | string[], limit = 30): SearchHit[] {
  const terms = (Array.isArray(query) ? query : [query]).map(t => t.trim()).filter(Boolean);
  if (!terms.length) return [];
  const firstAlts = terms[0].split('|');

  const hits: SearchHit[] = [];
  for (const book of ALL_BOOKS) {
    for (const chapter of book.chapters) {
      for (const p of chapter.paragraphs) {
        const q = firstAlts.find(a => p.text.includes(a));
        if (!q) continue;
        const idx = p.text.indexOf(q);
        const has = (t: string) => t.split('|').some(a => p.text.includes(a) || chapter.title.includes(a));
        if (!terms.slice(1).every(has)) continue;

        // 提取上下文（前後各 40 字）
        const start = Math.max(0, idx - 40);
        const end = Math.min(p.text.length, idx + q.length + 40);
        const before = p.text.slice(start, idx);
        const matched = p.text.slice(idx, idx + q.length);
        const after = p.text.slice(idx + q.length, end);

        const snippet = (start > 0 ? '…' : '')
          + escapeHtml(before)
          + `<mark>${escapeHtml(matched)}</mark>`
          + escapeHtml(after)
          + (end < p.text.length ? '…' : '');

        hits.push({
          bookSlug: book.slug,
          bookTitle: book.title,
          chapterTitle: chapter.title,
          paragraphId: p.id,
          snippet,
          text: p.text,
        });

        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type { Book, Chapter, Paragraph, SearchHit } from './types';
