<div align="center">

# Chinese Divination · Claude Skills

### Ten classical Chinese divination systems, one Claude Skill each: code does the charting, the model's reasoning is labelled by type

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)

[中文](./README.md) · **English**

</div>

This repository holds ten Chinese divination systems that have explicit rules and classical sources, each packaged as a Claude Skill. Charting, casting and table lookups are computed deterministically by bundled tools; the model never does the arithmetic in its head, and answers the user's question from the tool output. All systems have equal standing.

## Systems

| Use | System | Skill | Source | Verification |
|---|---|---|---|---|
| **Personal destiny** (birth data) | Four Pillars (八字) | [`bazi`](./.claude/skills/bazi/SKILL.md) | Ziping method: ten gods, hidden stems, seasonal strength, decade and annual luck | Pillars cross-checked by an independent algorithm (Julian day, Meeus solar longitude) |
| | Zi Wei Dou Shu (紫微斗數) | [`ziwei-doushu`](./.claude/skills/ziwei-doushu/SKILL.md) | Ni Haixia's *Tian Ji* system: twelve palaces, Four Transformations, decade / year / month / day | 768-chart rule regression; see [`docs/ziwei.en.md`](./docs/ziwei.en.md) |
| **Questions** | Six Lines (六爻) | [`liuyao`](./.claude/skills/liuyao/SKILL.md) | Najia method, with the *Zhouyi* text | [`docs/zhouyi-collation.md`](./docs/zhouyi-collation.md) |
| | Plum Blossom (梅花易數) | [`meihua`](./.claude/skills/meihua/SKILL.md) | *Meihua Yishu* body/use method, four casting methods | All 13 worked examples in the book match ([`docs/meihua-liuren-collation.md`](./docs/meihua-liuren-collation.md)) |
| | Da Liu Ren (大六壬) | [`liuren`](./.claude/skills/liuren/SKILL.md) | *Liuren Daquan* nine methods: four lessons, three transmissions, twelve generals | All 720 lessons enumerated; matches the book's counts |
| | Qi Men Dun Jia (奇門遁甲) | [`qimen`](./.claude/skills/qimen/SKILL.md) | *Dunjia Yanyi* rotating hourly chart; chaibu method, zhirun shown for comparison | Two full charts and 20 pattern examples match ([`docs/qimen-collation.md`](./docs/qimen-collation.md)) |
| | Xiao Liu Ren (小六壬) | inside `ziwei-doushu` | Six-step finger count | Regression tests |
| **Day selection** | Almanac (擇日) | [`zeri`](./.claude/skills/zeri/SKILL.md) | Tongshu / *Xieji Bianfang Shu*: auspicious acts, twelve officers, clashes | Regression tests |
| **World affairs** | Taiyi (太乙神數) | [`taiyi`](./.claude/skills/taiyi/SKILL.md) | *Taiyi Jinjing Shijing* annual chart | All 72 charts match the book's table ([`docs/taiyi-collation.md`](./docs/taiyi-collation.md)) |
| | Huangji Jingshi (皇極經世) | [`huangji`](./.claude/skills/huangji/SKILL.md) | Shao Yong's cosmic chronology, with the year-by-year text | Original text, 2367 BCE – 963 CE |
| | Five Movements and Six Qi (五運六氣) | [`wuyun-liuqi`](./.claude/skills/wuyun-liuqi/SKILL.md) | *Suwen* seven chapters on qi movements | All 60 years checked against *Liu Yuan Zheng Ji* |

Not included: face reading, character analysis and feng shui, whose rules cannot be written as code.

## Reasoning split

Following Tom Zahavy's *LLMs Can't Jump* (2026): language models are good at **deduction** and **induction** but fundamentally limited at **abduction**. Assuming each system's rules hold, every skill shares one rule set (`lib/reasoning/`):

- Deduction and induction: follow the book's rules; cite the basis in one sentence.
- Abduction (weighing mixed signals, timing, guessing concrete events, mapping to world events): allowed, but must start with "⚠ 僅供參考（模型在此類推理有能力限制）：" and give an alternative reading.
- What the tools cannot do is not done, with or without a disclaimer. Input assumptions are printed by the tools as "⚠ 假設：" and must be passed on.
- Replies answer the question first and do not paste the reasoning or calculation.

## Install

In Claude Code, for every project:

```
/plugin marketplace add hcx05/ziwei-doushu
/plugin install chinese-divination@shushu
```

Opening Claude Code inside this repository loads all skills without installing. For the Claude web or desktop app, run `npm run pack:skill` and upload each zip in `dist/skill-zips/` on the Skills settings page (code execution must be on). The tools need only Node 18+.

## Development

```bash
npm ci
npm run typecheck
npm test             # regression tests for every system
npm run build:skill  # rebuild the bundled tools after changing lib/ or scripts/skill/
npm run pack:skill   # build upload zips
```

`lib/systems/<system>/` holds each engine; `lib/systems/index.ts` is the registry; `lib/reasoning/` the shared reasoning rules; `lib/calendar/` the shared time conversions (true solar time, city longitudes, China DST, lunar calendar, and the simplified-to-traditional boundary for the external calendar libraries; the repository text is Traditional Chinese); `scripts/skill/` the CLI sources; `docs/` the collation notes and the [roadmap and decision log](./docs/ROADMAP-multi-system.md).

## License

| Part | License |
|---|---|
| Code (`lib/`, `scripts/`, `.claude/skills/`) | [MIT](./LICENSE) |
| Classical texts | Public domain |
| Wikisource transcriptions (*Ziwei Doushu Quanshu*, Daozang *Ziwei Doushu*; `lib/systems/ziwei/classics/data/`) | Text public domain; Wikisource transcription under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Zi Wei Dou Shu datasets (Releases) | [CC BY 4.0](./DATASET-LICENSE); see [`docs/ziwei.en.md`](./docs/ziwei.en.md) |
| Ni Haixia quotes (`docs/tianji-ziwei/`) | [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md): **non-commercial only** |

Forked from [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) (Zi Wei Dou Shu engine and datasets); the website was removed and the project extended to multiple systems. Contributions: see [CONTRIBUTING.md](./CONTRIBUTING.md).
