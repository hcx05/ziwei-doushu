"""
《周易》兩份獨立轉錄逐字比對（忽略標點）：iching-kit@0.1.0 與 @freizl/yijing@2.1.0（均為 MIT）。

  （另把 @freizl/yijing@2.1.0 解包到 /tmp/zy/pkgs/_freizl_yijing）
  python3 -I scripts/data/collate-zhouyi.py /tmp/zy

結果整理在 docs/zhouyi-collation.md。
"""
import json, re, sys
d = sys.argv[1]
a = json.load(open(d + '/pkgs/_freizl_yijing/package/zh-CN/64gua.json', encoding='utf8'))
js = open(d + '/pkgs/iching-kit/package/dist/data/classic.js', encoding='utf8').read()
js = js[js.index('export const HEXAGRAMS'):]
recs = re.findall(r'\{\s*id: (\d+),.*?name: "([^"]+)".*?lines: \[([^\]]+)\],\s*guaCi: "([^"]*)",\s*yaoCi: \[(.*?)\],\s*(?:yong: "([^"]*)",)?', js, re.S)
print('A', len(a), 'B', len(recs))
B = {}
for id_, name, lines, gc, yc, yong in recs:
    lines = ''.join(x.strip() for x in lines.split(','))
    yaos = re.findall(r'"([^"]*)"', yc)
    B[lines] = dict(id=int(id_), name=name, gc=gc, yc=yaos, yong=yong or None)
P = re.compile(r'[\s，。、；：！？“”‘’「」『』,.;:!?()（）]')
norm = lambda s: P.sub('', s)
orient = {'asis': 0, 'rev': 0}
for g in a:
    if g['id'] in B and B[g['id']]['name'].startswith(g['name'][0]): orient['asis'] += 1
    if g['id'][::-1] in B and B[g['id'][::-1]]['name'].startswith(g['name'][0]): orient['rev'] += 1
print('orientation', orient)
diffs = 0
for g in a:
    b = B.get(g['id']) or B.get(g['id'][::-1])
    if not b: print('missing', g['name']); diffs += 1; continue
    ga = norm(g['gua_ci']); gb = norm(b['gc'])
    # source A prefixes name + '：'; B prefixes name + '，'
    if ga != gb: print('卦辭', g['name'], '|', g['gua_ci'], '|', b['gc']); diffs += 1
    ya = g['yao_ci'][:6]; yb = b['yc']
    for i in range(6):
        if norm(ya[i]) != norm(yb[i]): print('爻辭', g['name'], i + 1, '|', ya[i], '|', yb[i]); diffs += 1
    yongA = g['yao_ci'][6] if len(g['yao_ci']) > 6 else None
    if (yongA and norm(yongA)) != (b['yong'] and norm(b['yong'])): print('用', g['name'], yongA, b['yong']); diffs += 1
print('diffs', diffs)
