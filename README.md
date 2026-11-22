<div align="center">

# 中國術數 · Claude Skills

### 十種古代術數，各自一個 Claude Skill：排盤由程序算，解讀按推理類型分工

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)

**中文** · [English](./README.en.md)

</div>

本倉庫收錄十種規則明確、有古籍可依的中國術數，每種做成一個 Claude Skill。排盤、起卦、起局、查表都由打包好的程序確定性計算，模型不心算；Claude 根據工具輸出回答用戶所問。各體系地位相同，沒有主次之分。

## 一、收錄的體系

按用途分四類。同一類裡的體系各自獨立，沒有先後。

| 用途 | 體系 | Skill | 依據 | 核對 |
|---|---|---|---|---|
| **命理**（個人出生資料） | 八字 | [`bazi`](./.claude/skills/bazi/SKILL.md) | 子平法：十神、藏干、月令旺衰、合沖刑害、大運流年 | 四柱另以獨立算法（儒略日、Meeus 太陽黃經）交叉校驗 |
| | 紫微斗數 | [`ziwei-doushu`](./.claude/skills/ziwei-doushu/SKILL.md) | 倪海廈《天紀》體系：十二宮、四化、大限流年流月流日 | 768 盤排盤鐵律迴歸；詳見 [`docs/ziwei.md`](./docs/ziwei.md) |
| **問事占卜** | 六爻 | [`liuyao`](./.claude/skills/liuyao/SKILL.md) | 納甲筮法，附《周易》卦辭爻辭 | [`docs/zhouyi-collation.md`](./docs/zhouyi-collation.md) |
| | 梅花易數 | [`meihua`](./.claude/skills/meihua/SKILL.md) | 《梅花易數》體用法，四種起卦法 | 書中十三個占例逐一吻合，見 [`docs/meihua-liuren-collation.md`](./docs/meihua-liuren-collation.md) |
| | 大六壬 | [`liuren`](./.claude/skills/liuren/SKILL.md) | 《六壬大全》九宗門：四課三傳、天將 | 七百二十課與原書昴星、別責、井欄逐課吻合，同上文檔 |
| | 奇門遁甲 | [`qimen`](./.claude/skills/qimen/SKILL.md) | 《遁甲演義》時家轉盤，拆補法定局並列置閏法 | 兩個完整排盤例、二十條格局算例吻合，見 [`docs/qimen-collation.md`](./docs/qimen-collation.md) |
| | 小六壬 | 在 `ziwei-doushu` 內 | 大安、留連、速喜、赤口、小吉、空亡 | 迴歸測試 |
| **擇日** | 擇日 | [`zeri`](./.claude/skills/zeri/SKILL.md) | 通書、黃曆（《協紀辨方書》體系）：宜忌、建除、黃道、沖煞 | 迴歸測試 |
| **世局年景** | 太乙神數 | [`taiyi`](./.claude/skills/taiyi/SKILL.md) | 《太乙金鏡式經》歲計 | 七十二局對照原書「陽局立成」，見 [`docs/taiyi-collation.md`](./docs/taiyi-collation.md) |
| | 皇極經世 | [`huangji`](./.claude/skills/huangji/SKILL.md) | 邵雍元會運世，附「以運經世」逐年原文 | 原文逐年收錄（公元前 2367 年至公元 963 年） |
| | 五運六氣 | [`wuyun-liuqi`](./.claude/skills/wuyun-liuqi/SKILL.md) | 《素問》運氣七篇：歲運、司天在泉、客主加臨 | 六十甲子對照《六元正紀大論》 |

**不收錄**：面相、測字、風水這類靠觀察或現場判斷、規則無法寫成程序的術數。

## 二、推理分工

依據 Tom Zahavy《LLMs Can't Jump》（2026）的觀點：大語言模型擅長**演繹**與**歸納**，**溯因**（從現象跳到最佳解釋）有根本限制。在「假設該體系規則成立」的前提下，所有 skill 共用同一套規則（`lib/reasoning/`）：

| 推理 | 例子 | 做法 |
|---|---|---|
| 演繹 | 已知盤面和書中規則，推出結論 | 照規則寫，一句話帶過依據 |
| 歸納 | 把多條事實整理成共同描述 | 照寫 |
| 溯因 | 在吉凶訊號間取捨、斷應期、推測具體事件、反推原因、對應現實世事 | 可以下結論，但以「⚠ 僅供參考（模型在此類推理有能力限制）：」開頭，並給出另一種解讀 |

- **工具做不到的不做**，加了「僅供參考」也不硬做。
- 輸入本身的假設（時辰不詳、閏月口徑、派別取法）由工具輸出「⚠ 假設：」，回覆裡要轉告。
- **回覆寫法**：先回答所問，不貼推理和計算過程，只寫與所問有關的部分。

## 三、安裝

- **Claude Code（任何項目都能用）**：在 Claude Code 裡輸入下面兩行，之後每個項目都會載入全部 skill。
  ```
  /plugin marketplace add hcx05/ziwei-doushu
  /plugin install chinese-divination@shushu
  ```
  在本倉庫目錄裡開 Claude Code 則不必安裝，會自動載入 `.claude/skills/` 下全部 skill。
- **Claude 網頁 / 桌面版**：運行 `npm run pack:skill`，在 `dist/skill-zips/` 得到每個 skill 一個 zip，到設置的 Skills 頁逐個上傳（需開啟代碼執行；入口名稱以當前設置頁為準）。
- 工具只需 Node 18+，不必 `npm install`。

用法：在 Claude 裡直接問，例如「幫我排八字，1990-06-15 10:30 女，杭州」「用梅花易數占一下這次面試」「明年世局如何」。

## 四、開發

```bash
npm ci
npm run typecheck    # 類型檢查
npm test             # 全部體系的迴歸測試
npm run build:skill  # 改了 lib/ 或 scripts/skill/ 後重新打包各 skill 的工具
npm run pack:skill   # 打出上傳用的 zip
npm run eval -- --tag overlap style --max-cost-usd 8   # 用真實模型評測技能用得對不對（會產生費用，見 evals/README.md）
```

| 路徑 | 內容 |
|---|---|
| `lib/systems/<體系>/` | 各體系引擎、解讀小節（`tasks.ts`）、摘要（`digest.ts`） |
| `lib/systems/index.ts` | 體系注冊表：每個體系的小節、術語、做不到的事 |
| `lib/reasoning/` | 共用推理分工：標注、規則文本、草稿檢查 |
| `lib/calendar/` | 共用時間換算：真太陽時、城市經度、中國夏令時、農曆公曆；外部函式庫的簡繁邊界（`zh.ts`，倉庫一律繁體） |
| `scripts/skill/` | 各 skill 的命令行工具源碼與打包腳本 |
| `scripts/regression/` | 迴歸測試 |
| `.claude/skills/` | 各 skill 的 `SKILL.md` 與打包好的工具 |
| `evals/` | 技能評測案例（`claude plugin eval`）：觸發、體系選擇、回覆寫法 |
| `docs/` | 各體系的原文核對記錄、[擴充計劃與決策記錄](./docs/ROADMAP-multi-system.md) |

**新增體系**：在 `lib/systems/` 下建引擎與 `tasks.ts`，登記到 `lib/systems/index.ts`；在 `scripts/skill/` 寫命令行工具，加進 `build.mjs`；寫 `SKILL.md`；補引擎與 skill 測試並登記到 `package.json`。外掛市集 `.claude-plugin/marketplace.json` 的清單有測試核對，漏登記會失敗。

## 五、協議

| 內容 | 協議 |
|---|---|
| 代碼（`lib/`、`scripts/`、`.claude/skills/`） | [MIT](./LICENSE) |
| 古籍原文（周易、梅花易數、六壬大全、遁甲演義、太乙金鏡式經、皇極經世書、紫微斗數全書等） | 公有領域 |
| 取自維基文庫的錄本（《紫微斗數全書》《紫微斗數》續道藏本，見 `lib/systems/ziwei/classics/data/`） | 原文公有領域；維基文庫的錄入與排版依 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 紫微斗數數據集（Releases） | [CC BY 4.0](./DATASET-LICENSE)，詳見 [`docs/ziwei.md`](./docs/ziwei.md) |
| 倪海廈《天紀》原話（`docs/tianji-ziwei/`） | [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md)，**不許商用** |

## 六、來源

本倉庫 fork 自 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu)（紫微斗數排盤引擎與數據集），之後移除網站、擴充為多體系。紫微部分的上游說明、數據集與更新記錄見 [`docs/ziwei.md`](./docs/ziwei.md)。

貢獻方式見 [CONTRIBUTING.md](./CONTRIBUTING.md)。
