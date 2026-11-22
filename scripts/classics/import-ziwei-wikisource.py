"""把維基文庫上的紫微斗數古籍原文整理成 lib/systems/ziwei/classics/data/*.data.ts。

來源（原文屬公有領域；維基文庫的錄入與排版依 CC BY-SA 4.0，出處見產物檔頭）：
  - 《紫微斗數全書》卷一至卷三（清刊本）  https://zh.wikisource.org/wiki/紫微斗數全書
  - 《紫微斗數》三卷（《萬曆續道藏》本，題陳摶） https://zh.wikisource.org/wiki/紫微斗數

維基文庫錄入簡繁混雜，這裡用倉庫的轉繁規則（scripts/i18n/s2t_rules.py，classical=True：保留「于」「征」「余」「云」等）
統一成繁體；不改字、不刪句、不補缺字（□ 照錄）。每一行（賦文一句、論述一段）是一個段落。
唯一的例外是 FIXES：維基文庫錄本自己做簡轉繁時留下的錯字（天干的「干」轉成「乾」、「咸池」轉成「鹹池」），逐條列出改回。

用法（需 pip install opencc；會連網下載）：[WIKI_CACHE=目錄] python3 scripts/classics/import-ziwei-wikisource.py
"""
import json, os, re, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'i18n'))
from s2t_rules import convert

# 維基文庫錄本的簡轉繁錯字（不是版本異文）：天干、若干的「干」被轉成「乾」；星名「咸池」被轉成「鹹池」
FIXES = [('若乾', '若干'), ('十乾', '十干'), ('鹹池', '咸池')]

UA = {'User-Agent': 'chinese-divination-skills classics importer (one-off)'}
OUT = 'lib/systems/ziwei/classics/data'

CACHE = os.environ.get('WIKI_CACHE')  # 可選：下載過的原始 wikitext 目錄，避免重複請求被限速

def fetch(title):
    cached = CACHE and os.path.join(CACHE, title.replace('/', '_') + '.wiki')
    if cached and os.path.exists(cached):
        return open(cached, encoding='utf-8').read()
    url = 'https://zh.wikisource.org/w/index.php?title=' + urllib.parse.quote(title) + '&action=raw'
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        text = r.read().decode('utf-8')
    time.sleep(3)  # 維基媒體限速
    if cached:
        os.makedirs(CACHE, exist_ok=True)
        open(cached, 'w', encoding='utf-8').write(text)
    return text

def clean(line):
    line = re.sub(r'\{\{YL\|([^}|]*)\}\}', r'\1', line)
    line = re.sub(r'\{\{[^{}]*\}\}', '', line)
    line = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', line)
    line = re.sub(r'</?(poem|onlyinclude|nowiki|br|center|div|span)[^>]*>', '', line)
    line = re.sub(r'<ref[^>]*>.*?</ref>', '', line)
    return line.replace('　', ' ').strip()

def parse(raw, vol, slug, dropped):
    chapters, cur = [], None
    for line in raw.split('\n'):
        m = re.match(r'^(=+)\s*(.*?)\s*=+\s*$', line)
        if m:
            level, title = len(m.group(1)), convert(clean(m.group(2)), classical=True)
            if level <= 2:
                continue  # 卷名
            cur = {'title': f'{vol}·{title}', 'paragraphs': [title] if slug == 'dz' else []}
            chapters.append(cur)
            continue
        text = clean(line)
        if not text or text.startswith('{{') or text.startswith('}}'):
            continue
        if cur is None:
            cur = {'title': vol, 'paragraphs': []}
            chapters.append(cur)
        text = convert(text, classical=True)
        for a, b in FIXES:
            text = text.replace(a, b)
        cur['paragraphs'].append(text)
    out = []
    for ci, ch in enumerate(chapters):
        if not ch['paragraphs']:
            dropped.append(ch['title']); continue
        out.append({'title': ch['title'], 'paragraphs': [
            {'id': f'{slug}-{vol}-{ci + 1}-{pi + 1}', 'idx': pi + 1, 'text': t} for pi, t in enumerate(ch['paragraphs'])]})
    return out

def split_daozang(raw):
    """道藏本以「==紫微斗數卷之一==」分卷，卷內以單獨一行、以「論」「起」「安」開頭的短行為小標題（論次序、起紫微例、安命例……）；標題同時保留為該章第一段，檢索得到。"""
    vols = re.split(r'^==\s*(紫微斗數卷之[一二三])\s*==\s*$', raw, flags=re.M)
    res = []
    for i in range(1, len(vols), 2):
        body = re.sub(r'^\s*((?:論|起|安)[^\s。，；：、！？「」○|{}=<>]{1,7})\s*$', r'===\1===', vols[i + 1], flags=re.M)
        res.append((vols[i].replace('紫微斗數', ''), body))
    return res

def emit(name, const, book):
    words = sum(len(p['text']) for c in book['chapters'] for p in c['paragraphs'])
    book['wordCount'] = words
    src = book.pop('_source')
    body = json.dumps(book, ensure_ascii=False, indent=1)
    with open(f'{OUT}/{name}', 'w', encoding='utf-8') as f:
        f.write(f'// 自動產生，勿手改：python3 scripts/classics/import-ziwei-wikisource.py\n'
                f'// 原文出處：{src}\n'
                f'// 原文屬公有領域；維基文庫的錄入與排版依 CC BY-SA 4.0（https://creativecommons.org/licenses/by-sa/4.0/）。\n'
                f'// 只做簡轉繁（scripts/i18n/s2t_rules.py，古籍模式），不改字、不刪句；□ 為底本缺字。\n'
                f"import type {{ Book }} from '../types';\n\n"
                f'export const {const}: Book = {body};\n')
    print(name, len(book['chapters']), 'chapters', words, 'chars')

def main():
    dropped = []
    chapters = []
    for vol in ['卷一', '卷二', '卷三']:
        chapters += parse(fetch(f'紫微斗數全書/{vol}'), vol, 'qs', dropped)
    emit('quanshu-text.data.ts', 'ziWeiQuanShuText', {
        'title': '紫微斗數全書', 'slug': 'quanshu', 'dynasty': '明清', 'author': '題陳摶撰、羅洪先序',
        'intro': '通行的《紫微斗數全書》（清刊本）卷一至卷三：太微賦、形性賦、諸星問答論、骨髓賦、女命骨髓賦、十二宮諸星得地合格訣、各宮諸星吉凶、論大小限等。',
        'chapters': chapters, '_source': 'https://zh.wikisource.org/wiki/紫微斗數全書（卷一至卷三）'})
    chapters = []
    for vol, body in split_daozang(fetch('紫微斗數')):
        chapters += parse(body, vol, 'dz', dropped)
    emit('daozang-text.data.ts', 'ziWeiDaoZangText', {
        'title': '紫微斗數（續道藏本）', 'slug': 'daozang', 'dynasty': '明', 'author': '題陳摶',
        'intro': '《萬曆續道藏》收錄的《紫微斗數》三卷，早於清刊《全書》的版本。',
        'chapters': chapters, '_source': 'https://zh.wikisource.org/wiki/紫微斗數（萬曆續道藏本）'})
    if dropped: print('空章節略去：', dropped)

if __name__ == '__main__':
    main()
