"""產生 lib/calendar/zh-trad.data.ts：外部函式庫（lunar-javascript、iztro）輸出字串的簡轉繁表。

倉庫原始碼一律繁體；這兩個函式庫只輸出簡體，程式在 lib/calendar/zh.ts 的邊界轉換。
表只收這兩個函式庫原始碼裡出現的中文字串（整串）與其中出現的單字，轉換規則與倉庫轉繁時相同
（scripts/i18n/s2t_rules.py：OpenCC s2tw 加術數用字覆寫，例如天干的「干」、「斗數」、「咸池」、「沖」）。

用法（需 pip install opencc）：python3 scripts/i18n/gen-zh-trad.py
"""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from s2t_rules import convert

srcs = ['node_modules/lunar-javascript/lunar.js']
srcs += glob.glob('node_modules/iztro/lib/i18n/locales/zh-CN/*.js')
srcs += glob.glob('node_modules/iztro/lib/i18n/locales/zh-CN/*.json')
lits = set()
for f in srcs:
    t = open(f, encoding='utf-8').read()
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"", t):
        s = m.group(1) or m.group(2) or ''
        if re.search('[一-鿿]', s) and '\\' not in s:
            lits.add(s)
phrases = {s: convert(s) for s in sorted(lits) if convert(s) != s}
chars = {}
for s in lits:
    for ch in s:
        if '一' <= ch <= '鿿':
            c = convert(ch)
            if c != ch:
                chars[ch] = c
out = ['// 自動產生，勿手改：python3 scripts/i18n/gen-zh-trad.py',
       '// 外部函式庫（lunar-javascript、iztro）輸出字串的簡轉繁表；用法見 lib/calendar/zh.ts。',
       'export const PHRASES: Record<string, string> = ' + json.dumps(phrases, ensure_ascii=False, indent=0) + ';',
       'export const CHARS: Record<string, string> = ' + json.dumps(dict(sorted(chars.items())), ensure_ascii=False, indent=0) + ';', '']
open('lib/calendar/zh-trad.data.ts', 'w', encoding='utf-8').write('\n'.join(out))
print(len(phrases), 'phrases', len(chars), 'chars')
