/**
 * lib/systems/taiyi/digest.ts —— 太乙歲計 → 給模型讀的文本摘要（只放工具算出的事實）
 */
import { ASSUMPTION_MARK } from '@/lib/reasoning/kinds';
import { GONG_NAME, isZheng, posLabel, type TaiyiYear } from './engine';

const gong = (g: number) => `${g}宮（${GONG_NAME[g]}）`;

export function buildTaiyiDigest(t: TaiyiYear): string {
  const L: string[] = [];
  L.push(`${ASSUMPTION_MARK}歲計以公曆年對應該年干支（約自立春起）；歲首取冬至、立春或正月朔各家不一，年初一兩個月的歸屬可能不同。`);
  L.push(`${ASSUMPTION_MARK}積年採《太乙金鏡式經》（開元十二年甲子積 1,937,281）；《太乙統宗寶鑑》等書積年數不同，局數與諸神位置可能不同。`);
  L.push('');
  L.push('【積年與局】');
  L.push(`${t.label}，太歲${t.taiSui}；上元積年 ${t.jiNian.toLocaleString('en-US')} 算`);
  L.push(`入第${t.ji}紀第${t.jiYear}年，${t.yuan}；陽遁第${t.ju}局`);
  L.push('', '【太乙與二目】');
  L.push(`太乙：${gong(t.taiyi.gong)}，入宮第${t.taiyi.yearInGong}年（${t.taiyi.li}）`);
  L.push(`文昌（天目、主目）：${posLabel(t.tianMu)}${isZheng(t.tianMu) ? '，正宮' : '，間神'}`);
  L.push(`計神：${t.jiShen}；合神：${t.heShen}`);
  L.push(`始擊（客目）：${posLabel(t.shiJi)}${isZheng(t.shiJi) ? '，正宮' : '，間神'}（以計神加和德，視文昌所臨）`);
  L.push('', '【主客算與將】');
  L.push(`主算 ${t.zhu.suan}：主大將 ${gong(t.zhu.general)}，主參將 ${gong(t.zhu.deputy)}`);
  L.push(`客算 ${t.ke.suan}：客大將 ${gong(t.ke.general)}，客參將 ${gong(t.ke.deputy)}`);
  L.push('', '【格局】（只判本書有明確定義、可由宮位直接判定者：掩、囚、格；間神不歸宮）');
  L.push(t.patterns.length ? t.patterns.map(p => `- ${p}`).join('\n') : '- 無掩、囚、格');
  L.push('（迫、擊、關、挾、四郭固杜、三門五將等未計算。）');
  L.push('', '【三基、五福、大遊】');
  L.push(`君基：${t.junJi.bang}邦（入邦第${t.junJi.yearInBang}年）；臣基：${t.chenJi.bang}邦；民基：${t.minJi.bang}邦`);
  L.push(`五福：${t.wuFu.gong}，${t.wuFu.place}，入宮第${t.wuFu.yearInGong}年（四十五年一移）`);
  L.push(`大遊太乙：${gong(t.daYou.gong)}，入宮第${t.daYou.yearInGong}年（三十六年一移，${t.daYou.li}）`);
  L.push('', '（以上均按《太乙金鏡式經》算法計算。書中占驗文字尚未收入工具，不得憑記憶引用。）');
  return L.join('\n');
}
