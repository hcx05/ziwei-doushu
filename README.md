<div align="center">

# 中国术数 · Claude Skills

### 十种古代术数，各自一个 Claude Skill：排盘由程序算，解读按推理类型分工

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)

**中文** · [English](./README.en.md)

</div>

本仓库收录十种规则明确、有古籍可依的中国术数，每种做成一个 Claude Skill。排盘、起卦、起局、查表都由打包好的程序确定性计算，模型不心算；Claude 根据工具输出回答用户所问。各体系地位相同，没有主次之分。

## 一、收录的体系

按用途分四类。同一类里的体系各自独立，没有先后。

| 用途 | 体系 | Skill | 依据 | 核对 |
|---|---|---|---|---|
| **命理**（个人出生资料） | 八字 | [`bazi`](./.claude/skills/bazi/SKILL.md) | 子平法：十神、藏干、月令旺衰、合冲刑害、大运流年 | 四柱另以独立算法（儒略日、Meeus 太阳黄经）交叉校验 |
| | 紫微斗数 | [`ziwei-doushu`](./.claude/skills/ziwei-doushu/SKILL.md) | 倪海厦《天纪》体系：十二宫、四化、大限流年流月流日 | 768 盘排盘铁律回归；详见 [`docs/ziwei.md`](./docs/ziwei.md) |
| **问事占卜** | 六爻 | [`liuyao`](./.claude/skills/liuyao/SKILL.md) | 纳甲筮法，附《周易》卦辞爻辞 | [`docs/zhouyi-collation.md`](./docs/zhouyi-collation.md) |
| | 梅花易数 | [`meihua`](./.claude/skills/meihua/SKILL.md) | 《梅花易数》体用法，四种起卦法 | 书中十三个占例逐一吻合，见 [`docs/meihua-liuren-collation.md`](./docs/meihua-liuren-collation.md) |
| | 大六壬 | [`liuren`](./.claude/skills/liuren/SKILL.md) | 《六壬大全》九宗门：四课三传、天将 | 七百二十课与原书昴星、别责、井栏逐课吻合，同上文档 |
| | 奇门遁甲 | [`qimen`](./.claude/skills/qimen/SKILL.md) | 《遁甲演义》时家转盘，拆补法定局并列置闰法 | 两个完整排盘例、二十条格局算例吻合，见 [`docs/qimen-collation.md`](./docs/qimen-collation.md) |
| | 小六壬 | 在 `ziwei-doushu` 内 | 大安、留连、速喜、赤口、小吉、空亡 | 回归测试 |
| **择日** | 择日 | [`zeri`](./.claude/skills/zeri/SKILL.md) | 通书、黄历（《协纪辨方书》体系）：宜忌、建除、黄道、冲煞 | 回归测试 |
| **世局年景** | 太乙神数 | [`taiyi`](./.claude/skills/taiyi/SKILL.md) | 《太乙金镜式经》岁计 | 七十二局对照原书「阳局立成」，见 [`docs/taiyi-collation.md`](./docs/taiyi-collation.md) |
| | 皇极经世 | [`huangji`](./.claude/skills/huangji/SKILL.md) | 邵雍元会运世，附「以运经世」逐年原文 | 原文逐年收录（公元前 2367 年至公元 963 年） |
| | 五运六气 | [`wuyun-liuqi`](./.claude/skills/wuyun-liuqi/SKILL.md) | 《素问》运气七篇：岁运、司天在泉、客主加临 | 六十甲子对照《六元正纪大论》 |

**不收录**：面相、测字、风水这类靠观察或现场判断、规则无法写成程序的术数。

## 二、推理分工

依据 Tom Zahavy《LLMs Can't Jump》（2026）的观点：大语言模型擅长**演绎**与**归纳**，**溯因**（从现象跳到最佳解释）有根本限制。在「假设该体系规则成立」的前提下，所有 skill 共用同一套规则（`lib/reasoning/`）：

| 推理 | 例子 | 做法 |
|---|---|---|
| 演绎 | 已知盘面和书中规则，推出结论 | 照规则写，一句话带过依据 |
| 归纳 | 把多条事实整理成共同描述 | 照写 |
| 溯因 | 在吉凶讯号间取舍、断应期、推测具体事件、反推原因、对应现实世事 | 可以下结论，但以「⚠ 仅供参考（模型在此类推理有能力限制）：」开头，并给出另一种解读 |

- **工具做不到的不做**，加了「仅供参考」也不硬做。
- 输入本身的假设（时辰不详、闰月口径、派别取法）由工具输出「⚠ 假设：」，回复里要转告。
- **回复写法**：先回答所问，不贴推理和计算过程，只写与所问有关的部分。

## 三、安装

- **Claude Code（任何项目都能用）**：在 Claude Code 里输入下面两行，之后每个项目都会载入全部 skill。
  ```
  /plugin marketplace add hcx05/ziwei-doushu
  /plugin install chinese-divination@shushu
  ```
  在本仓库目录里开 Claude Code 则不必安装，会自动载入 `.claude/skills/` 下全部 skill。
- **Claude 网页 / 桌面版**：运行 `npm run pack:skill`，在 `dist/skill-zips/` 得到每个 skill 一个 zip，到设置的 Skills 页逐个上传（需开启代码执行；入口名称以当前设置页为准）。
- 工具只需 Node 18+，不必 `npm install`。

用法：在 Claude 里直接问，例如「帮我排八字，1990-06-15 10:30 女，杭州」「用梅花易数占一下这次面试」「明年世局如何」。

## 四、开发

```bash
npm ci
npm run typecheck    # 类型检查
npm test             # 全部体系的回归测试
npm run build:skill  # 改了 lib/ 或 scripts/skill/ 后重新打包各 skill 的工具
npm run pack:skill   # 打出上传用的 zip
```

| 路径 | 内容 |
|---|---|
| `lib/systems/<体系>/` | 各体系引擎、解读小节（`tasks.ts`）、摘要（`digest.ts`） |
| `lib/systems/index.ts` | 体系注册表：每个体系的小节、术语、做不到的事 |
| `lib/reasoning/` | 共用推理分工：标注、规则文本、草稿检查 |
| `lib/calendar/` | 共用时间换算：真太阳时、城市经度、中国夏令时、农历公历 |
| `scripts/skill/` | 各 skill 的命令行工具源码与打包脚本 |
| `scripts/regression/` | 回归测试 |
| `.claude/skills/` | 各 skill 的 `SKILL.md` 与打包好的工具 |
| `docs/` | 各体系的原文核对记录、[扩充计划与决策记录](./docs/ROADMAP-multi-system.md) |

**新增体系**：在 `lib/systems/` 下建引擎与 `tasks.ts`，登记到 `lib/systems/index.ts`；在 `scripts/skill/` 写命令行工具，加进 `build.mjs`；写 `SKILL.md`；补引擎与 skill 测试并登记到 `package.json`。外挂市集 `.claude-plugin/marketplace.json` 的清单有测试核对，漏登记会失败。

## 五、协议

| 内容 | 协议 |
|---|---|
| 代码（`lib/`、`scripts/`、`.claude/skills/`） | [MIT](./LICENSE) |
| 古籍原文（周易、梅花易数、六壬大全、遁甲演义、太乙金镜式经、皇极经世书、紫微斗数全书等） | 公有领域 |
| 紫微斗数数据集（Releases） | [CC BY 4.0](./DATASET-LICENSE)，详见 [`docs/ziwei.md`](./docs/ziwei.md) |
| 倪海厦《天纪》原话（`docs/tianji-ziwei/`） | [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md)，**不许商用** |

## 六、来源

本仓库 fork 自 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu)（紫微斗数排盘引擎与数据集），之后移除网站、扩充为多体系。紫微部分的上游说明、数据集与更新记录见 [`docs/ziwei.md`](./docs/ziwei.md)。

贡献方式见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
