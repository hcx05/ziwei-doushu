# 參與貢獻

歡迎提問題、提修復、提建議。

## 提問題

- **覺得算得不對**：用「排盤 / 起卦結果疑問」模板，寫明體系、輸入（命令或出生 / 起卦資料）、本項目的結果，以及你拿來對照的結果和出處。只寫「不準」我們沒法查。
  - 各體系有些口徑本來就分派別，工具會以「⚠ 假設：」標出；這類差異不算 bug，但歡迎指出。
- **程序報錯**：用「程序問題」模板，寫清復現步驟和報錯。
- **想加體系或功能**：用「功能建議」模板，寫明依據的古籍。本倉庫只收規則明確、能寫成程序的術數（不收面相、測字、風水）。

請不要在 issue 裡貼手機號、驗證碼，或未經本人同意的他人生辰信息。

## 提交代碼

```bash
npm ci               # 按 package-lock.json 安裝
npm run typecheck    # 類型檢查
npm test             # 全部體系的迴歸測試
npm run build:skill  # 改了 lib/ 或 scripts/skill/ 後重新打包，測試會檢查產物是否過期
```

- 一個 PR 只做一件事，說明裡寫清改了什麼、為什麼。
- **改計算結果的**：附上依據（古籍原文卷次，或可核對的對照），並在 `scripts/regression/` 加回歸測試、登記到 `package.json` 的 `test` 腳本。沒有出處的口徑改動一般不收。
- 新增體系的步驟見 README「開發」一節。
- CI 會在每次 push 和 PR 上跑同一套檢查。

## 許可

提交即表示你同意貢獻內容按對應協議發布：

- 代碼：[MIT](./LICENSE)
- 紫微斗數數據集：[CC BY 4.0](./DATASET-LICENSE)
- 倪師原話目錄 `docs/tianji-ziwei/`：[CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md)，不許商用

---

**English.** Issues and PRs are welcome. For a result you believe is wrong, use the "Chart result question" form with the system, your input, our output and a sourced reference. Before opening a PR, run `npm ci`, `npm run typecheck`, `npm test` and, if you changed `lib/` or `scripts/skill/`, `npm run build:skill`; changes to results need a classical source and a regression test.
