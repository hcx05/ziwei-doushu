#!/usr/bin/env python3
"""
從維基文庫《太乙金鏡式經》（四庫全書本，公有領域）卷三「陽局天目地目計神主客大小將立成」
取出七十二局的 太乙宮、天目、主算、客目（始擊）、客算、計神，寫成回歸測試用的 fixture：
    scripts/regression/fixtures/taiyi-licheng.json

    python3 -I scripts/data/parse-taiyi-licheng.py [已下載的卷三 wikitext 檔]

不給檔案時直接向 zh.wikisource.org 取 action=raw（只用標準函式庫）。
原文字誤照錄（例：局四十一的計神寫作「戊」，收為戌並在 notes 記下），不在此修正數值；
與算法不符之處由回歸測試列出，記在 docs/taiyi-collation.md。
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

URL = 'https://zh.wikisource.org/w/index.php?action=raw&title=' + urllib.parse.quote('太乙金鏡式經_(四庫全書本)/卷03')
NAMES = '武徳|太蔟|隂主|隂徳|大義|地主|陽徳|和徳|呂申|呂申|髙叢|太陽|大炅|太炅|大神|太神|大威|天道|大武'
NORMAL = {'武徳': '武德', '太蔟': '太簇', '隂主': '陰主', '隂徳': '陰德', '陽徳': '陽德', '和徳': '和德', '呂申': '呂申',
          '髙叢': '高叢', '太炅': '大炅', '太神': '大神'}
CN = '[一二三四五六七八九十百]+'


def cn(x: str) -> int:
    d = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}
    if x == '十':
        return 10
    if '十' in x:
        a, _, b = x.partition('十')
        return (d[a] if a else 1) * 10 + (d[b] if b else 0)
    return d[x]


def main() -> None:
    if len(sys.argv) > 1:
        raw = open(sys.argv[1], encoding='utf-8').read()
    else:
        req = urllib.request.Request(URL, headers={'User-Agent': 'classics-data-script/1.0 (offline text extraction)'})
        raw = urllib.request.urlopen(req, timeout=60).read().decode('utf-8')
    s = re.sub(r'\{\{SK anchor\|([^}]*)\}\}', r'\1', raw)
    s = re.sub(r'\{\{SK notes\|([^}]*)\}\}', '', s)
    s = re.sub(r'〔[^〕]*〕', '', s)
    a = s.index('陽局天目地目計神主客大小將立成')
    b = s.index('隂局天目地目計神主客大小將立成')
    t = s[a:b]
    t = t[t.index('計神') + 2:]
    t = re.sub(r'[　\s]+', ' ', t)
    pat = re.compile(
        rf'({CN})\s*([一二三四六七八九])\s*乾?\s*({NAMES})\s*({CN})'
        rf'(?:\s*[一二三四五六七八九]+[乾坤艮巽]?\s*[一二三四五六七八九]?[乾坤艮巽]?)?\s*({NAMES})\s*({CN})'
        rf'(?:\s*[一二三四五六七八九][乾坤艮巽]?\s*[一二三四五六七八九]?)?\s*([子丑寅卯夘辰巳午未申酉戌亥戊])')
    rows, notes = [], []
    for m in pat.finditer(t):
        js = m[7].replace('夘', '卯')
        if js == '戊':
            notes.append(f'局{cn(m[1])}：計神原文作「戊」，收為戌')
            js = '戌'
        rows.append({'ju': cn(m[1]), 'gong': cn(m[2]), 'tianMu': NORMAL.get(m[3], m[3]), 'zhuSuan': cn(m[4]),
                     'keMu': NORMAL.get(m[5], m[5]), 'keSuan': cn(m[6]), 'jiShen': js})
    if [r['ju'] for r in rows] != list(range(1, 73)):
        raise SystemExit(f'解析不完整：{[r["ju"] for r in rows]}')
    out = {'source': '《太乙金鏡式經》（四庫全書本）卷三，維基文庫', 'notes': notes, 'rows': rows}
    path = os.path.join(os.path.dirname(__file__), '../regression/fixtures/taiyi-licheng.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'寫出 {len(rows)} 局；{notes}')


if __name__ == '__main__':
    main()
