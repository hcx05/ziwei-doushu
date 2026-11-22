# 参与贡献

欢迎提问题、提修复、提建议。

## 提问题

- **觉得算得不对**：用「排盘 / 起卦结果疑问」模板，写明体系、输入（命令或出生 / 起卦资料）、本项目的结果，以及你拿来对照的结果和出处。只写「不准」我们没法查。
  - 各体系有些口径本来就分派别，工具会以「⚠ 假设：」标出；这类差异不算 bug，但欢迎指出。
- **程序报错**：用「程序问题」模板，写清复现步骤和报错。
- **想加体系或功能**：用「功能建议」模板，写明依据的古籍。本仓库只收规则明确、能写成程序的术数（不收面相、测字、风水）。

请不要在 issue 里贴手机号、验证码，或未经本人同意的他人生辰信息。

## 提交代码

```bash
npm ci               # 按 package-lock.json 安装
npm run typecheck    # 类型检查
npm test             # 全部体系的回归测试
npm run build:skill  # 改了 lib/ 或 scripts/skill/ 后重新打包，测试会检查产物是否过期
```

- 一个 PR 只做一件事，说明里写清改了什么、为什么。
- **改计算结果的**：附上依据（古籍原文卷次，或可核对的对照），并在 `scripts/regression/` 加回归测试、登记到 `package.json` 的 `test` 脚本。没有出处的口径改动一般不收。
- 新增体系的步骤见 README「开发」一节。
- CI 会在每次 push 和 PR 上跑同一套检查。

## 许可

提交即表示你同意贡献内容按对应协议发布：

- 代码：[MIT](./LICENSE)
- 紫微斗数数据集：[CC BY 4.0](./DATASET-LICENSE)
- 倪师原话目录 `docs/tianji-ziwei/`：[CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md)，不许商用

---

**English.** Issues and PRs are welcome. For a result you believe is wrong, use the "Chart result question" form with the system, your input, our output and a sourced reference. Before opening a PR, run `npm ci`, `npm run typecheck`, `npm test` and, if you changed `lib/` or `scripts/skill/`, `npm run build:skill`; changes to results need a classical source and a regression test.
