/**
 * 把各 Skill 的命令行工具打包成单文件：
 *   scripts/skill/ziwei-cli.ts → .claude/skills/ziwei-doushu/scripts/ziwei.mjs
 *   scripts/skill/bazi-cli.ts  → .claude/skills/bazi/scripts/bazi.mjs
 *   scripts/skill/liuyao-cli.ts → .claude/skills/liuyao/scripts/liuyao.mjs
 * 打包后只需 Node 18+，不必 npm install —— 所以每个 skill 目录都可以直接拷走或打成 zip 上传。
 *
 *   npm run build:skill
 *
 * 改了 lib/ 或 docs/tianji-ziwei/entries.jsonl 之后要重新打包；
 * scripts/regression/skill-bundle.test.ts、bazi-skill.test.ts 会检查打包产物是否过期。
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// SKILL_BUNDLE_OUT_DIR 只给回归测试用：打包到临时目录，再与仓库里的产物比对
const OUT_DIR = process.env.SKILL_BUNDLE_OUT_DIR;

const TARGETS = [
  { entry: 'scripts/skill/ziwei-cli.ts', out: '.claude/skills/ziwei-doushu/scripts/ziwei.mjs' },
  { entry: 'scripts/skill/bazi-cli.ts', out: '.claude/skills/bazi/scripts/bazi.mjs' },
  { entry: 'scripts/skill/liuyao-cli.ts', out: '.claude/skills/liuyao/scripts/liuyao.mjs' },
];

for (const t of TARGETS) {
  const outfile = OUT_DIR ? path.join(OUT_DIR, path.basename(t.out)) : path.join(root, t.out);
  await build({
    entryPoints: [path.join(root, t.entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    minify: true,
    legalComments: 'eof',
    charset: 'utf8',
    tsconfig: path.join(root, 'tsconfig.json'),
    loader: { '.jsonl': 'text' },
    banner: {
      js: [
        `// 由 scripts/skill/build.mjs 生成，请勿手改。源码：${t.entry}`,
        "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
      ].join('\n'),
    },
    logLevel: 'warning',
  });
  console.log(`built ${path.relative(root, outfile)}`);
}
