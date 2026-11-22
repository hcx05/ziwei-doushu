# 技能評測（`claude plugin eval`）

程式測試（`npm test`）只驗證各體系算得對不對；這裡驗證**模型用技能用得對不對**：會不會叫對技能、有沒有用工具起盤、回覆是否先回答所問、溯因結論有沒有標註。

每個案例跑兩輪：裝外掛一輪、不裝一輪，報告兩者差距（Δ）。需要 Claude Code v2.1.269 以上；Linux 要先裝沙箱（`apt install bubblewrap socat`），否則開放 Bash 的案例會拒跑。**每次執行都是真實的模型呼叫，費用計入你的用量**，建議加 `--max-cost-usd`。

```bash
npm run eval -- --tag overlap style --runs 2 -j 4 --max-cost-usd 8 --threshold 0
npm run eval -- --tag trigger --runs 1 --max-cost-usd 5 --threshold 0
npm run eval -- --case style-bazi-yongshen --runs 1
```

| 標籤 | 案例 | 檢查什麼 |
|---|---|---|
| `overlap` | `overlap-*`、`scope-*` | 用途重疊時選哪個體系（只說「算命」「占吉凶」「世局」「搬家日子」）；不對同一件事用多種占法重複起卦；範圍外的（用紫微看國運、面相）不硬做 |
| `style` | `style-*` | 先回答所問、不貼計算過程、溯因結論標「仅供参考」（評審模型判斷） |
| `trigger` | `trigger-*` | 每個技能一題自然問法，看會不會觸發該技能並呼叫它的工具 |

- 「`skill`」評分項只在裝外掛那一輪有意義，報告裡列為「是否觸發」指標，不計分。
- 結果寫在 `evals/results/`（不進版本庫）。
- 改了 SKILL.md 的描述或寫法規則後，重跑相關標籤比對前後差距。
