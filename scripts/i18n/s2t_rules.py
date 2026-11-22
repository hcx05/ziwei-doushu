"""倉庫簡轉繁規則：OpenCC s2tw，再按術數用字逐字覆寫。

用於一次性把倉庫轉成繁體（2026-11），也用於 gen-zh-trad.py 產生函式庫字串對照表。
convert(text, classical=True) 用於古籍原文：保留「于」「征」「余」「云」、「后以」。
"""
import opencc  # pip install opencc
_cc = opencc.OpenCC('s2tw')
KEEP = set('占凶丑斗咸克板表面注升布岳蒙胡台沖')
STEM_PREV = set('天年月日时時宫宮藏遁飞飛伏寄同十某本柱两兩甲乙丙丁戊己庚辛壬癸各此该該其限生原地盘盤')
STEM_NEXT = set('支上加在克寄四遁宫宮位为為属屬合冲沖神')
QIAN_NEXT2 = {'干净','干燥','干枯','干脆','干旱','干杯','干涸','干瘪','干干','干爽'}
QIAN_PREV2 = {'擦干','晒干','枯干','烘干','风干','瘦干','干干','吹干','烤干'}
GAN_NEXT2 = {'干嘛','干什','干掉','干到','干了','干起','干公','干武','干自','干某','干部','干活','干事','干吗','干这','干那','干得','干过','干下','干么','干啥','干坏','干大','干出','干完','干一','干脆','干副','干军','干班','干局','干老','干将','干职','干小','干上','干参','干少'}
GAN_PREV2 = {'能干','精干','骨干','树干','主干','才干','苦干','实干','不干','越干','就干','在干','去干','会干','要干','肯干','想干','敢干','没干','还干','人干','你干','我干','他干','她干','来干','都干','也干','再干'}
CHONG_NEXT2 = {'冲突','冲动','冲击','冲刺','冲劲','冲进','冲出','冲回','冲上','冲下','冲向','冲浪','冲撞','冲锋','冲头','冲昏','冲过'}
YUN_PREV = set('古书書经經诗詩传傳又史子曰亦记記')
def convert(t, classical=False):
    o = _cc.convert(t)
    if len(o) != len(t):
        raise ValueError('length mismatch')
    out = list(o)
    n = len(t)
    for i, ch in enumerate(t):
        if ch in KEEP:
            out[i] = ch
            if ch == '板' and t[i-1:i+1] == '老板': out[i] = '闆'
            continue
        p = t[i-1] if i > 0 else ''
        nx = t[i+1] if i+1 < n else ''
        if ch == '干':
            j = i
            while j > 0 and t[j-1] == '干': j -= 1
            k = i
            while k < n and t[k] == '干': k += 1
            run_next = t[k] if k < n else ''
            if t[i:i+2] == '干涉': out[i] = '干'
            elif t[i:i+2] in ('干嘛', '干吗') or (k - j >= 2 and run_next in '武法律。'): out[i] = '幹'
            elif t[i:i+2] == '干支' or p in STEM_PREV: out[i] = '干'
            elif t[i:i+2] in QIAN_NEXT2 or t[i-1:i+1] in QIAN_PREV2: out[i] = '乾'
            elif t[i:i+2] in GAN_NEXT2 or t[i-1:i+1] in GAN_PREV2: out[i] = '幹'
            else: out[i] = '干'
        elif ch == '冲':
            out[i] = '衝' if (t[i:i+2] in CHONG_NEXT2 or t[i-3:i+1] == '首当其冲') else '沖'
        elif ch == '云':
            if p in YUN_PREV or nx in '：:"“「云' or classical: out[i] = '云'
        elif ch == '后' and classical and nx == '以':
            out[i] = '后'
        elif ch in '于征余' and classical:
            out[i] = ch
        elif ch == '只':
            out[i] = '隻' if (p in '一两兩二三四五六七八九十几幾每这這那哪' and nx not in '有要能好是会會改影拿向在不') else '只'
        elif ch == '当': out[i] = '當'
        elif ch == '荫': out[i] = '蔭'
        elif ch == '毁': out[i] = '毀'
        elif ch in '并幷':
            out[i] = '併' if o[i] == '併' else '並'
    return ''.join(out)
