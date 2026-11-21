# 翻修計畫：從「紫微斗數」擴充為「多體系推演」，並全面落實推理分工

> 狀態：**P0、P1 八字、P2 六爻已完成**（2026-11-21）；P1 的子平古籍待補。P3 起尚未開工。
> 各階段開工前都還有「待決事項」需要專案負責人拍板（見第七節），未列在「決策紀錄」的事項都還沒決定。

## 決策紀錄

| 日期 | 決策 | 決定者 | 影響 |
|---|---|---|---|
| 2026-11-21 | 批准本計畫，從 P0 開工（D1） | 負責人 | — |
| 2026-11-21 | **網站整個移除**，只保留排盤引擎與 Claude Skill（D3） | 負責人 | 刪除 `app/`、`components/`、`/api/interpret` 與只服務網站的 lib；P6 取消；4.2 的網站端補救不再需要 |
| 2026-11-21 | 預測範圍不限個人，世局、年景也算 | 負責人 | P4 實作時解除 SKILL.md「國運不做」 |
| 2026-11-21 | P0 合入 main，繼續 P1 八字 | 負責人 | — |
| 2026-11-21 | P1 合入 main，繼續 P2 六爻 | 負責人 | — |
| 2026-11-21 | D2 Skill 形態：每個體系一個 skill，共用 `lib/` 與 `scripts/skill/common.ts`（依建議執行，可逆） | Claude（依計畫建議，未另行詢問） | 新增 `.claude/skills/bazi/`；每個 skill 目錄各自打包、可單獨拷走 |


---

## 一、目標與原則

1. **補齊預測體系**：在現有紫微斗數與小六壬之外，按「適合大語言模型」的標準加入下列體系，範圍不限個人命運，世局、年景也算。
   - 八字
   - 六爻（附周易經文）
   - 五運六氣
   - 擇日
   - 太乙神數
   - 皇極經世
   - （可選）梅花易數、大六壬、奇門遁甲
2. **推理分工（最高原則，所有體系通用）**：
   - 排盤、起卦、起局、查表：由**程式工具確定性計算**，模型不心算。
   - **演繹**（已知盤面加規則，推出結論）與**歸納**（整理已出現的事實）：模型照規則寫，並註明依據。
   - **溯因**（在多個訊號間取捨、推測具體事件、反推原因、把預言對應到現實）：**可以做，但必須標註**。開頭使用 `⚠ 僅供參考（模型在此類推理有能力限制）：`，接著列出正反兩方的訊號，並給出另一種同樣說得通的解讀。
   - **工具做不到的，不做。** 加上「僅供參考」也不能成為硬做的理由。
3. **前提不變**：假設各體系的規則成立，不討論真偽，也不加「僅供娛樂」這類話術。

### 依據與可信度

| 主張 | 來源 | 可信度 |
|---|---|---|
| 大語言模型擅長歸納、演繹進步很快，但缺乏溯因（生成新解釋性假說）的機制 | Google DeepMind 的 Tom Zahavy 所寫的立場論文〈LLMs can't jump〉，存於 PhilSci-Archive（28024） | **二手來源互相佐證，未讀到原文**：本環境無法連上 philsci-archive.pitt.edu。注意這是**立場論文（論證），不是實驗研究**；而且它的說法是「演繹快速進步中」，不是「演繹已經很強」 |
| 大語言模型在簡單情境能做歸納、溯因，但在複雜世界模型與高品質假說上吃力 | Liu et al., *An Incomplete Loop*（arXiv 2404.03028） | 獨立的實驗研究，可佐證方向 |
| 溯因推理在大語言模型上仍屬早期研究 | *Wiring the 'Why'* 綜述（arXiv 2604.08016） | 綜述，佐證方向 |

> 結論：「溯因必須標註」這條設計有多個獨立來源支持方向，可以作為產品原則；但它不是「已證明模型溯因必錯」，所以我們的做法是**標註並保留結論**，不是禁止溯因。這與倉庫現行設計一致。

---

## 二、現況盤點（已核實）

| 項目 | 現況 | 位置 |
|---|---|---|
| 推理分工 | ✅ 已實作，**但寫死在紫微斗數**。內容包括：`ReasoningKind`、`UNCERTAINTY_MARK`、`ASSUMPTION_MARK`、`REASONING_RULES`，以及每個小節標記推理類型 | `lib/ai/tasks.ts` |
| 標註的保證方式 | ⚠️ **只靠提示詞**。前端在模型輸出有標記時會渲染（`components/InsightPanel.tsx:57`），但模型**漏寫標記時沒有任何程式補救** | `app/api/interpret/route.ts:210` |
| 回歸測試 | ✅ 會檢查溯因小節的提示詞是否要求標記 | `scripts/regression/ai-reasoning-split.test.ts` |
| Skill | 單一 skill，工具打包成 `ziwei.mjs`。**只需 Node 18，不必 npm install** | `.claude/skills/ziwei-doushu/`、`scripts/skill/build.mjs` |
| 範圍邊界 | SKILL.md 第五節明文寫「國運不做」 | `.claude/skills/ziwei-doushu/SKILL.md` |
| 曆法依賴 | `lunar-javascript@1.7.3`。已在本地確認有以下 API：`getEightChar`、`getYun`、`getDaYun`（八字與大運）；`getDayYi`、`getDayJi`、`getTimeYi`、`getDayJiShen`、`getDayXiongSha`、`getZhiXing`、`getXiu`、`getNineStar`（擇日相關） | `package.json` |
| 易經資料 | `lib/nihai/tianji.ts` 有 64 卦資料，但 `niInterpretation` 欄位**沒有出處連結**，無法確認是否為倪師原話 | `lib/nihai/tianji.ts:359` |

---

## 三、可參考的開源實作與授權（已查證）

本倉庫是 **MIT** 授權，skill 又要求**純 Node、單一檔案**，因此：

| 套件 | 涵蓋 | 語言 | 授權 | 處置 |
|---|---|---|---|---|
| `lunar-javascript` | 八字、大運、擇日宜忌、神煞、建除十二值星、二十八宿 | JS | MIT（已在用） | **直接使用** |
| `najia`（bopo/najia） | 六爻納甲 | Python | MIT | **用 TypeScript 移植並註明出處**；在開發階段當對照組產生測試資料 |
| `kintaiyi`（kentang2017） | 太乙神數 | Python | MIT | 同上。注意：專案很小，測試情況需要先審查 |
| `kinliuren`、`kinqimen` | 大六壬、奇門遁甲 | Python | MIT | 可選階段再評估 |
| `iching-shifa` | 六爻、大衍筮法 | TS | **GPL-3.0** | ❌ 不引入程式碼，與 MIT 衝突；最多只拿來核對輸出結果 |
| `mingyu-core` | 綜合排盤 | TS | **AGPL-3.0** | ❌ 同上 |

> 以上 Python 套件只在開發時拿來產生對照答案，產出的 JSON 測試資料會提交進倉庫；CI 與 skill 都**不依賴 Python**。

---

## 四、架構翻修（Phase 0，其他階段的地基）

### 4.1 抽出與體系無關的「推理層」

```
lib/reasoning/
  kinds.ts        ReasoningKind、UNCERTAINTY_MARK、ASSUMPTION_MARK（從 lib/ai/tasks.ts 移出並重新匯出，維持相容）
  rules.ts        buildReasoningRules(premise)：前提那句話依體系替換，其餘規則共用
  enforce.ts      【新增】輸出端的確定性補救（見 4.2）
  registry.ts     體系註冊表：{ id, 名稱, premise, tasks, 溯因重災區清單, 不做清單 }
lib/systems/
  ziwei/          原 lib/ziwei（先建立轉接層，不搬動檔案，避免破壞既有引用）
  bazi/ liuyao/ wuyun/ zeri/ taiyi/ huangji/ ...
```

### 4.2 新增：標註不再只靠提示詞

- `enforce.ts` 依任務定義的小節類型檢查模型輸出：
  - 若某個「溯因」小節的第一行不是 `UNCERTAINTY_MARK`，**由程式自動補上**，並記錄一筆遙測（只記次數，不記內容）。
- ~~網站端事後補救~~：網站已移除，不再需要。
- Skill：由於模型直接回覆使用者，無法事後改寫，因此改為：
  1. `sections <集合> --skeleton` 輸出逐節骨架，溯因節預先填好標記開頭；✅
  2. `check <集合> [--fix]`：檢查草稿的溯因節是否標註、小節是否齊全；SKILL.md 規定按小節作答時回答前必做。✅
- **驗收**：新增回歸測試。拿缺少標記的溯因輸出餵給 `enforce()`，必須被補上；演繹節則不得被誤加。

### 4.3 每個體系都要先填的「推理分類表」

| 體系 | 演繹（照規則寫） | 溯因（必標註） |
|---|---|---|
| 紫微斗數 | 星曜、四化落宮的象意 | 命格定性、建議、具體事件、定時辰（現有） |
| 八字 | 十神、旺衰計分、刑沖合會、大運干支 | **用神取捨**（扶抑、調候、格局三派會衝突）、格局高低、具體事件 |
| 六爻 | 裝卦、六親、世應、動變、旬空月破 | **用神有多個候選時的取捨**、應期、把卦象對應到具體人事 |
| 五運六氣 | 某年的歲運、司天、在泉、主客氣（純查表） | 推測具體疾病流行、具體氣候事件 |
| 擇日 | 某日的宜忌、值星、神煞 | 多個「宜」日之間的取捨（若規則有優先序就按規則；沒有就標註） |
| 太乙神數 | 起局、主客算、掩迫囚擊等格局 | **把格局對應到現實國家、政局、事件**（全部視為溯因） |
| 皇極經世 | 某年屬第幾元、會、運、世，以及配卦 | 對時代特徵的任何詮釋 |
| 周易經文 | 原文引用 | 卦辭、爻辭套用到所問事情上 |

> 世局類多一條規則：**事後附會**（拿已發生的事回頭對應預言）一律視為溯因。另外不點名預測在世特定人物的生死、健康，這條比照現行「健康不診斷」的安全底線。

### 4.4 Skill 形態

- 共用一個打包好的 CLI（`divine.mjs`），子命令依體系分開，例如 `bazi`、`liuyao`、`wuyun`。
- `ziwei.mjs` 保留為相容入口。
- SKILL.md 的切分方式待決（見第七節 D2）。

**Phase 0 驗收條件**：

- `npm test` 和 `npm run typecheck` 全綠；
- 紫微斗數的輸出逐字不變（以現有回歸測試為準）；
- 新增 `enforce` 測試；
- 每個註冊的體系都必須有推理分類表，否則測試失敗。

---

### P0 完成紀錄

- 新增 `lib/reasoning/`：`kinds.ts`（推理類型與標記）、`rules.ts`（`buildReasoningRules` 依體系換用語、`renderSections`、`renderSkeleton`）、`check.ts`（`checkMarks` / `enforceMarks`）、`registry.ts`（體系介面）。
- 新增 `lib/systems/index.ts`：登記紫微斗數、小六壬兩個體系，包括規則用語、小節集合、溯因重災區、不做清單。
- `lib/ai/tasks.ts` 改用通用層；移除只給網站用的 `parseTask`。
- CLI 新增 `check`、`sections --skeleton`、`rules <體系>`。
- 驗收：
  - `npm test`、`npm run typecheck` 全綠；
  - 新增 `scripts/regression/reasoning-registry.test.ts`；
  - 新舊打包產物在 9 條紫微和小六壬命令上的輸出**逐字相同**，包括 chart、sections、rules、流月、流日、小六壬、原話、古籍。

### P1 完成紀錄

- `lib/systems/bazi/`：
  - `constants.ts`：干支、藏干（人元司令次序）、十神、合沖刑害的基礎表；
  - `engine.ts`：
    - 年柱、月柱以標準時間對節氣，日柱、時柱用真太陽時；
    - 晚子時有兩種口徑；
    - 大運、流年；
    - 旺相休囚死、通根、五行與十神計數；
    - 貼近節氣、晚子時、時辰不詳都會輸出 `⚠ 假設：` 聲明；
  - `digest.ts`：給模型讀的摘要；
  - `tasks.ts`：小節結構。日主強弱、格局與用神一律列為溯因節，要求分列扶抑、調候、格局三法。
- `.claude/skills/bazi/`：SKILL.md 與打包工具 `bazi.mjs`，子命令為 chart、sections、rules、check。
- `scripts/skill/common.ts`：抽出兩個 CLI 共用的參數與出生資料解析；紫微輸出經比對逐字不變。
- 驗收：
  - `bazi-engine.test.ts` 用與 lunar-javascript 無關的獨立演算法交叉校驗：日柱用儒略日，時柱用五鼠遁，年月柱用 Meeus 太陽黃經；
  - 4000 個隨機時刻的日柱、時柱，以及其中 3980 個的年柱、月柱（節氣前後 90 分鐘內跳過）全部一致；
  - 1901–2099 年立春時刻最大差 11.3 分鐘；
  - 十神與藏干表和 lunar-javascript 逐項一致。藏干「巳」的次序因此改為丙庚戊。
- 測試抓到並修正：引擎原本接受不存在的日期（1990-02-30），現已拒絕。
- **未完成**：《子平真詮》《滴天髓》《窮通寶鑑》原文。本環境的網路政策擋掉 zh.wikisource.org 和 ctext.org；在收錄前，SKILL.md 明文禁止憑記憶引用原文。
- **觀察（未改）**：紫微引擎的「節氣四柱」以時辰中點近似時刻（`lib/ziwei/algorithm.ts:236`）；出生在交節前後一小時內時，可能和八字工具的精確結果不同。

### P2 完成紀錄

- **《周易》經文**：`lib/systems/liuyao/zhouyi.data.ts`，共 64 卦，含卦辭、384 條爻辭、用九、用六。
  - 來源：iching-kit@0.1.0（MIT）。產生腳本是 `scripts/data/gen-zhouyi.py`，只把套件當資料讀，不執行。
  - 校勘：與另一份獨立轉錄 @freizl/yijing@2.1.0 逐字比對，差異 42 處，記在 `docs/zhouyi-collation.md`：
    - 對照本錯誤 12 處；
    - 異體字 22 處；
    - 格式 6 處；
    - 版本異文 2 處（革卦「己日 / 巳日」）。
  - 原 `tianji.ts` 裡沒有出處的「倪師解讀」不沿用。
- **`lib/systems/liuyao/`**：
  - 三種起卦：手動輸入、工具代擲、梅花時間起卦；
  - 裝卦：八宮世應、納甲、六親、六神、伏神，變爻的回頭生剋、進退神、反吟伏吟、化空化破；
  - 月建（以東八區時刻對節氣）、日辰（當地日期，23 點起算次日並聲明）、旬空、月破、日沖；
  - 依朱熹《易學啟蒙》占法決定該看哪幾條經文；
  - 取用神參考表（問事類別 → 用神）。
- **推理分工**：裝卦與取用神屬演繹；用神兩現的取捨、斷吉凶、應期、把經文套到所問之事，一律屬溯因。
- **`.claude/skills/liuyao/`**：SKILL.md 與 `liuyao.mjs`，子命令為 cast、gua、sections、rules、check。
- **驗收**：
  - 八宮表與手寫的京房八宮六十四卦逐卦一致，世爻位置正確；
  - 384 條爻題（初九……上六）與卦象陰陽一致；
  - 教科書例逐爻比對：天風姤伏甲寅財、水火既濟伏戊午財；
  - 日辰以儒略日獨立驗算；
  - 海外時區的月建換算正確。
- **未完成**：《增刪卜易》《卜筮正宗》原文（同樣受網路政策限制）。

## 五、分階段實作

每個體系都照同一個流程：**典籍與規則整理 → 確定性工具 → 用經典例題與對照組寫回歸測試 → 任務小節（標好推理類型）→ CLI 子命令 → SKILL 說明**。

| 階段 | 內容 | 依賴 | 主要風險 | 驗收 |
|---|---|---|---|---|
| **P0 推理層** ✅ | 第四節全部 | — | 搬動時破壞紫微 | 見上；已驗收（見下） |
| **P1 八字** ✅（古籍待補） | 以 `lunar-javascript` 排四柱與大運；以子時換日、節氣交界為重點測試；典籍收《子平真詮》《滴天髓》《窮通寶鑑》（公有領域）進 `lib/classics` | P0 | 用神流派衝突 | 立春、節氣交界、晚子時、真太陽時的邊界測試；書中例造逐柱比對；用神節一律要求標記 |
| **P2 六爻＋周易** ✅ | 起卦（時間、數字、手動輸入硬幣結果）→ 納甲裝卦（移植 najia）；附周易卦辭、爻辭原文；64 卦資料改由公有領域《周易》原文重建（原 `lib/nihai/tianji.ts` 中無出處的「倪師解讀」已隨網站移除，不沿用） | P0 | 移植錯誤 | 與 najia 對照 64 卦乘以動爻組合；《增刪卜易》例卦逐項比對 |
| **P3 五運六氣＋擇日** | 五運六氣：《素問》運氣七篇查表。擇日：包裝 `lunar-javascript` 的宜忌與神煞，並對照《協紀辨方書》的口徑 | P0 | 擇日流派差異 | 以《素問》原文表格驗算 60 甲子；擇日抽樣對照通勝 |
| **P4 世局：太乙＋皇極** | 太乙：移植 kintaiyi 的年計、月計。皇極：元會運世計算與配卦。**同時修改 SKILL.md 第五節，解除「國運不做」**（範圍調整已由負責人在對話中表示同意，實作時仍要在 PR 中標明） | P0 | 小眾實作的正確性、對現實事件的附會 | 用《太乙金鏡式經》的例局驗算；皇極用邵雍原書年表抽驗；所有涉及現實對應的小節都是溯因 |
| **P5（可選）** | 梅花易數 → 大六壬 → 奇門遁甲 | P0、P2 | 奇門有置閏與拆補兩派 | 各自另開決策 |
| ~~P6 網站~~ | 已取消：網站移除 | — | — | — |

> 順序理由：P1 與 P3 主要包裝已在用、已驗證的 `lunar-javascript`，風險最低；P2 是補足「問事」最有價值的一塊；P4 依賴移植小眾套件，又涉及範圍調整，放在後面。

---

## 六、跨階段的品質要求

- **不編**：典籍與倪師原話只能由工具查到後逐字引用；查不到就不引。
- **假設要標**：時辰不詳、子時換日、節氣口徑、流派選擇，都使用 `⚠ 假設：` 標註。
- **skill 打包檢查**：沿用 `skill-bundle.test.ts`，改成檢查 `divine.mjs` 是否過期。
- **授權**：移植 MIT 程式碼時，在檔案開頭註明來源與原授權；GPL 和 AGPL 的程式碼不進倉庫。

---

## 七、待決事項（需要負責人拍板，按需要的時間點排列）

| 編號 | 決策 | 何時需要 | 建議 |
|---|---|---|---|
| D1 | ~~是否批准本計畫並從 P0 開工~~ | — | ✅ 已批准 |
| D2 | ~~Skill 形態~~ | — | ✅ 每個體系一個 skill（見決策紀錄） |
| D3 | ~~網站是否跟進~~ | — | ✅ 網站移除 |
| D4 | 品牌定位：繼續以「倪海廈《天紀》體系」為主軸，還是改為中性的多體系平台 | P2 前 | 待討論。新體系大多不是倪師的教材，掛他的名會誤導 |
| D5 | 奇門遁甲採置閏法還是拆補法 | P5 前 | 屆時再研究 |

---

## 參考來源

- Tom Zahavy（Google DeepMind），〈LLMs can't jump〉，PhilSci-Archive 28024：https://philsci-archive.pitt.edu/28024/ （本環境無法連線，內容據二手報導：https://wccftech.com/google-deepmind-paper-llms-cannot-replace-human-genius/ 、https://hackernoon.com/llms-cant-jump-and-they-shouldnt-have-to ）
- *An Incomplete Loop: Deductive, Inductive, and Abductive Reasoning in Language Models*：https://arxiv.org/abs/2404.03028
- *Wiring the 'Why': A Unified Taxonomy and Survey of Abductive Reasoning in LLMs*：https://arxiv.org/pdf/2604.08016
- najia：https://pypi.org/project/najia/ ；kintaiyi：https://pypi.org/project/kintaiyi ；kinqimen：https://pypi.org/project/kinqimen/ ；kinliuren：https://repos.ecosyste.ms/hosts/GitHub/topics/liuren
- iching-shifa（GPL-3.0）、mingyu-core（AGPL-3.0）：授權資訊取自 npm registry
