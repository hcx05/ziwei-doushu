#!/usr/bin/env python3
"""
產生 lib/systems/meihua/text.data.ts：《梅花易數》卷二「體用生克篇之二」十八類占法、
卷二「體用總訣」中「某卦生體／克體」八條，以及卷一「八卦萬物屬類（並為上卦）」。

來源：維基文庫《梅花易數》（[[梅花易數/卷一]]、[[梅花易數/卷二]]），古籍原文屬公有領域。
只做抽取，不改一字（僅去掉 wiki 標記與全形空白）。

用法：
  python3 -I scripts/data/gen-meihua-text.py <已下載的目錄>   # 目錄內有 梅花易數__卷一.txt、梅花易數__卷二.txt（wiki 原始碼）
  python3 -I scripts/data/gen-meihua-text.py                  # 直接向 zh.wikisource.org 取 action=raw
"""
import json, os, re, sys, urllib.parse, urllib.request

UA = {'User-Agent': 'classics-data-script/1.0 (offline text extraction)'}

def load(vol, d):
    if d:
        return open(os.path.join(d, f'梅花易數__{vol}.txt'), encoding='utf8').read()
    url = 'https://zh.wikisource.org/w/index.php?action=raw&title=' + urllib.parse.quote(f'梅花易數/{vol}')
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read().decode('utf8')

def sections(text):
    """=== 標題 === 之後到下一個標題之前的正文"""
    out, cur, buf = {}, None, []
    for line in text.split('\n'):
        m = re.match(r'^(=+)\s*(.+?)\s*\1\s*$', line)
        if m:
            if cur: out[cur] = buf
            cur, buf = m.group(2), []
        elif cur:
            s = line.replace('　', '').strip()
            if s: buf.append(s)
    if cur: out[cur] = buf
    return out

def main():
    d = sys.argv[1] if len(sys.argv) > 1 else None
    v1, v2 = sections(load('卷一', d)), sections(load('卷二', d))
    topics = []
    for title, body in v2.items():
        m = re.match(r'^(.+?)占第(.+)$', title)
        if m:
            topics.append({'topic': m.group(1), 'title': title, 'text': '\n'.join(body)})
    assert len(topics) == 18, f'十八類占法應有 18 條，得 {len(topics)}'
    zong = v2['體用總訣']
    sheng = {}
    ke = {}
    for para in zong:
        m = re.match(r'^(乾|坤|震|巽|坎|離|艮|兌)卦?(生體|克體)', para)
        if m:
            (sheng if m.group(2) == '生體' else ke)[m.group(1)] = para
        elif para.startswith('又看卦中有克體之卦者'):
            m2 = re.search(r'如(乾)卦克體(.+)$', para)
            ke['乾'] = '乾卦克體' + m2.group(2)
        elif para.startswith('處家') and '巽' in ke:
            ke['巽'] += para
    assert len(sheng) == 8 and len(ke) == 8, (len(sheng), len(ke))
    wanwu = {}
    for para in v1['八卦萬物屬類（並為上卦）']:
        m = re.match(r'^(乾|坤|震|巽|坎|離|艮|兌)：(.+)$', para)
        if m: wanwu[m.group(1)] = m.group(2)
    assert len(wanwu) == 8
    out = os.path.join(os.path.dirname(__file__), '../../lib/systems/meihua/text.data.ts')
    with open(out, 'w', encoding='utf8') as f:
        f.write('/**\n * lib/systems/meihua/text.data.ts —— 《梅花易數》原文摘錄（由 scripts/data/gen-meihua-text.py 產生，勿手改）\n'
                ' *\n * 來源：維基文庫《梅花易數》卷一、卷二；古籍原文屬公有領域。只抽取、不改字。\n */\n')
        f.write('export interface MeihuaTopic { topic: string; title: string; text: string }\n\n')
        f.write('/** 卷二「體用生克篇之二」十八類占法 */\n')
        f.write('export const MEIHUA_TOPICS: MeihuaTopic[] = ' + json.dumps(topics, ensure_ascii=False, indent=1) + ';\n\n')
        f.write('/** 卷二「體用總訣」：某卦生體、某卦克體（鍵為繁體卦名） */\n')
        f.write('export const SHENG_TI: Record<string, string> = ' + json.dumps(sheng, ensure_ascii=False, indent=1) + ';\n')
        f.write('export const KE_TI: Record<string, string> = ' + json.dumps(ke, ensure_ascii=False, indent=1) + ';\n\n')
        f.write('/** 卷一「八卦萬物屬類（並為上卦）」 */\n')
        f.write('export const WANWU: Record<string, string> = ' + json.dumps(wanwu, ensure_ascii=False, indent=1) + ';\n')
    print('wrote', os.path.normpath(out), len(topics), 'topics')

main()
