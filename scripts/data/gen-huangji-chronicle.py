#!/usr/bin/env python3
"""
從維基文庫《皇極經世書》（四庫全書本，公有領域）卷五上至卷六下「以運經世」取出逐年紀事，
產生 lib/systems/huangji/chronicle.data.ts。

    python3 -I scripts/data/gen-huangji-chronicle.py [已下載的 wikitext 目錄]

不給目錄時直接向 zh.wikisource.org 取 action=raw（只用標準函式庫）。
規則：
  · 「經世之X二千一百五十七」為世的標題（X 為辰，數字為世序）；
  · 其後每行以干支開頭，干支之後為該年紀事（無紀事則為空字串）；
  · 不以干支開頭的行，接到上一年的紀事後面；
  · {{SKchar|n}}（四庫本特殊字，維基文庫尚無對應字形）以「□」代替並計數；{{YL|…}} 保留文字。
年份由世序與干支推出（每世三十年，奇數世起甲子、偶數世起甲午），並逐行檢查干支連續。
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

VOLUMES = ['卷05上', '卷05下', '卷06上', '卷06中', '卷06下']
BASE = 'https://zh.wikisource.org/w/index.php?action=raw&title='
STEMS = '甲乙丙丁戊己庚辛壬癸'
BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
JIAZI = [STEMS[i % 10] + BRANCHES[i % 12] for i in range(60)]
# 四庫本常見的干支混寫：天干位置的「巳／已」為己、「戍」在地支位置為戌，「夘」為卯
STEM_VARIANT = {'巳': '己', '已': '己'}
BRANCH_VARIANT = {'夘': '卯', '己': '巳', '已': '巳', '戍': '戌', '戊': '戌'}
DIGITS = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}


def cn_num(s: str) -> int:
    total, cur = 0, 0
    for ch in s:
        if ch in DIGITS:
            cur = DIGITS[ch]
        elif ch == '十':
            total += (cur or 1) * 10; cur = 0
        elif ch == '百':
            total += (cur or 1) * 100; cur = 0
        elif ch == '千':
            total += (cur or 1) * 1000; cur = 0
    return total + cur


def fetch(vol: str, src_dir: str | None) -> str:
    if src_dir:
        with open(os.path.join(src_dir, f'{vol}.txt'), encoding='utf-8') as f:
            return f.read()
    url = BASE + urllib.parse.quote(f'皇極經世書_(四庫全書本)/{vol}')
    req = urllib.request.Request(url, headers={'User-Agent': 'classics-data-script/1.0 (offline text extraction)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8')


def clean(raw: str) -> tuple[list[str], int]:
    body = raw[raw.index('<poem>') + 6: raw.index('</poem>')]
    body = re.sub(r'\{\{SK anchor\|([^}]*)\}\}', r'\1', body)
    body = re.sub(r'\{\{SK notes\|([^}]*)\}\}', r'（\1）', body)
    body = re.sub(r'\{\{YL\|([^}]*)\}\}', r'\1', body)
    sk = len(re.findall(r'\{\{SKchar\|\d+\}\}', body))
    body = re.sub(r'\{\{SKchar\|\d+\}\}', '□', body)
    # 「<子部,術數類,…>」是維基文庫分段處，其後可能缺頁：換成標記，由主程序處理
    body = re.sub(r'<子部[^>]*>', '\n@@BREAK@@\n', body)
    body = re.sub(r'<[^>]+>', '', body)
    lines = [l.strip('　 \t') for l in body.split('\n')]
    return [l for l in lines if l], sk


def main() -> None:
    src_dir = sys.argv[1] if len(sys.argv) > 1 else None
    entries: list[dict] = []
    shi = None
    expect = None
    skchars = 0
    missing: list[str] = []
    typos: list[str] = []
    headers: list[str] = []
    gaps: list[str] = []
    lost = False
    pending_break = False
    for vol in VOLUMES:
        lines, sk = clean(fetch(vol, src_dir))
        skchars += sk
        for line in lines:
            if line == '@@BREAK@@':
                if shi is not None:
                    pending_break = True
                continue
            m = re.match(r'^經世之([子丑寅卯辰巳午未申酉戌亥已己])([一二三四五六七八九十百千]+)$', line)
            if m:
                num = cn_num(m.group(2))
                if lost:
                    gaps.append(f'世{shi}第{(expect % 30) + 1}年至世{num - 1}末')
                    lost = False
                elif shi is not None and num != shi + 1:
                    raise SystemExit(f'{vol} 世序不連續：{shi} 之後是 {num}')
                shi = num
                expect = 0 if shi % 2 == 1 else 30
                continue
            if shi is None or lost:
                continue
            if pending_break:
                # 分段後第一行：干支接得上就照常收錄；接不上表示缺頁，跳到下一個世標題
                pending_break = False
                g0 = STEM_VARIANT.get(line[:1], line[:1]) + BRANCH_VARIANT.get(line[1:2], line[1:2])
                if g0 in JIAZI and JIAZI.index(g0) != expect and (JIAZI.index(g0) - expect) % 60 > 3:
                    lost = True
                    continue
            gz = STEM_VARIANT.get(line[:1], line[:1]) + BRANCH_VARIANT.get(line[1:2], line[1:2])
            if gz in JIAZI:
                gap = (JIAZI.index(gz) - expect) % 60
                if gap and (gz[1] == JIAZI[expect][1] or gz[0] == JIAZI[expect][0]):
                    # 干或支只錯一字：原文干支字誤（如「己丑」應為乙丑、「乙巳」應為乙卯），按順序位置收錄並記下
                    typos.append(f'世{shi}「{gz}」應為{JIAZI[expect]}')
                    gap = 0
                    gz = JIAZI[expect]
                if gap and gap <= 3 and (expect % 30) + gap == 30:
                    # 跨入下一世卻缺了「經世之…」標題：補完本世缺行，世序加一
                    for _ in range(gap):
                        entries.append({'shi': shi, 'n': (expect % 30) + 1, 'gz': JIAZI[expect], 'text': '', 'missing': True})
                        missing.append(f'世{shi} {JIAZI[expect]}')
                        expect = (expect + 1) % 60
                    shi += 1
                    headers.append(f'世{shi}')
                    gap = 0
                if gap and gap <= 3 and (expect % 30) + gap < 30:
                    # 原文漏了一至三年的干支行：補上空行並標記 missing
                    for _ in range(gap):
                        entries.append({'shi': shi, 'n': (expect % 30) + 1, 'gz': JIAZI[expect], 'text': '', 'missing': True})
                        missing.append(f'世{shi} {JIAZI[expect]}')
                        expect = (expect + 1) % 60
                elif gap:
                    raise SystemExit(f'{vol} 世{shi} 干支不連續：預期 {JIAZI[expect]}，得到 {line[:20]}')
                year_in_shi = (expect % 30) + 1
                entries.append({'shi': shi, 'n': year_in_shi, 'gz': gz, 'text': line[2:]})
                expect = (expect + 1) % 60
            elif entries:
                entries[-1]['text'] += line
    with_text = sum(1 for e in entries if e['text'])
    out = [
        '/**',
        ' * 《皇極經世書》（四庫全書本）卷五上至卷六下「以運經世」逐年紀事 —— 由 scripts/data/gen-huangji-chronicle.py 產生，請勿手改。',
        ' * 來源：維基文庫（公有領域，PD-old）。□ 為四庫本特殊字、維基文庫尚無字形者。',
        f' * 共 {len(entries)} 年，其中 {with_text} 年有紀事；□ 共 {skchars} 處。',
        f' * 原文缺干支行、由程式補上空行（missing: true）者 {len(missing)} 處：{"、".join(missing) or "無"}。',
        f' * 原文干支字誤、按順序位置收錄者 {len(typos)} 處：{"；".join(typos) or "無"}。',
        f' * 原文缺「經世之…」標題、由程式依干支順序補上世序者 {len(headers)} 處：{"、".join(headers) or "無"}。',
        f' * 維基文庫轉錄缺頁（分段標記後到下一個世標題之間無法定年，整段不收）：{"、".join(gaps) or "無"}。',
        ' * shi：世序（經世之X 後的數字）；n：該年是本世第幾年（1–30）；gz：年干支；text：紀事原文（無則為空字串）。',
        ' */',
        'export interface ChronicleYear { shi: number; n: number; gz: string; text: string; missing?: boolean }',
        f'export const CHRONICLE: ChronicleYear[] = {json.dumps(entries, ensure_ascii=False)};',
        '',
    ]
    path = os.path.join(os.path.dirname(__file__), '../../lib/systems/huangji/chronicle.data.ts')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print(f'寫出 {len(entries)} 年（有紀事 {with_text} 年），世 {entries[0]["shi"]}–{entries[-1]["shi"]}，□ {skchars} 處；補空行 {len(missing)} 處：{missing}；干支字誤 {len(typos)} 處：{typos}；缺標題 {headers}；缺頁 {gaps}')


if __name__ == '__main__':
    main()
