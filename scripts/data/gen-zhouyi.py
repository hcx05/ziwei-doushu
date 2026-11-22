"""
從 npm 包 iching-kit@0.1.0（MIT）抽出《周易》經文，生成 lib/systems/liuyao/zhouyi.data.ts。

  mkdir -p /tmp/zy/pkgs/iching-kit && (cd /tmp/zy/pkgs/iching-kit && npm pack iching-kit@0.1.0 && tar xzf iching-kit-0.1.0.tgz)
  python3 -I scripts/data/gen-zhouyi.py /tmp/zy lib/systems/liuyao/zhouyi.data.ts

只把包當數據讀（正則解析），不執行包內任何代碼。卦名與上下卦按卦象自檢。
"""
import json, re, sys
d, out = sys.argv[1], sys.argv[2]
js = open(d + '/pkgs/iching-kit/package/dist/data/classic.js', encoding='utf8').read()
js = js[js.index('export const HEXAGRAMS'):]
recs = re.findall(r'\{\s*id: (\d+),.*?name: "([^"]+)".*?lines: \[([^\]]+)\],\s*guaCi: "([^"]*)",\s*yaoCi: \[(.*?)\],\s*(?:yong: "([^"]*)",)?', js, re.S)
assert len(recs) == 64
TRI = {'111': '乾', '110': '兌', '101': '離', '100': '震', '011': '巽', '010': '坎', '001': '艮', '000': '坤'}  # bottom-up
NAT = {'乾': '天', '兌': '澤', '離': '火', '震': '雷', '巽': '風', '坎': '水', '艮': '山', '坤': '地'}
rows = []
for id_, full, lines, gc, yc, yong in recs:
    lines = ''.join(x.strip() for x in lines.split(','))
    lower, upper = TRI[lines[:3]], TRI[lines[3:]]
    if '為' in full:
        short = full[0]
        assert upper == lower == short and full == short + '為' + NAT[short], full
    else:
        assert full[0] == NAT[upper] and full[1] == NAT[lower], (full, upper, lower)
        short = full[2:]
    yaos = re.findall(r'"([^"]*)"', yc)
    assert len(yaos) == 6
    for s in [gc, yong or ''] + yaos:
        assert not re.search(r'[A-Za-z<>{}$`\\]', s), s  # 只應是經文
    rows.append(dict(no=int(id_), name=short, fullName=full, upper=upper, lower=lower, lines=lines, guaCi=gc, yaoCi=yaos, **({'yong': yong} if yong else {})))
rows.sort(key=lambda r: r['no'])
assert [r['no'] for r in rows] == list(range(1, 65))
assert len({r['lines'] for r in rows}) == 64
body = ',\n'.join('  ' + json.dumps(r, ensure_ascii=False) for r in rows)
open(out, 'w', encoding='utf8').write('''/**
 * lib/systems/liuyao/zhouyi.data.ts —— 《周易》六十四卦卦辭、爻辭（含乾坤用九、用六），文王卦序
 *
 * 經文屬公有領域。本文件由 scripts/skill/gen-zhouyi.py 從 npm 包 iching-kit@0.1.0（MIT，
 * https://github.com/Ann1949/iching-kit）的 dist/data/classic.js 抽出，未改動經文一字。
 * lines 為自下而上的陰陽（1 陽 0 陰）；卦名與上下卦已按卦象自檢。
 *
 * 校勘：與另一份獨立轉錄（npm 包 @freizl/yijing@2.1.0，MIT）逐字比對（忽略標點）。
 * 差異 42 處，見 docs/zhouyi-collation.md：絕大多數為該轉錄本身的錯誤或異體字，
 * 僅「革」卦「己日 / 巳日」屬歷代版本異文，本文件取「己日」。
 */
export interface ZhouyiHexagram {
  /** 文王卦序 1–64 */
  no: number;
  name: string;
  fullName: string;
  upper: string;
  lower: string;
  /** 自下而上，1 陽 0 陰 */
  lines: string;
  guaCi: string;
  yaoCi: string[];
  /** 乾「用九」、坤「用六」 */
  yong?: string;
}

export const ZHOUYI: ZhouyiHexagram[] = [
''' + body + '''
];
''')
print('ok', len(rows))
