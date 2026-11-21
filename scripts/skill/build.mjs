/**
 * 把 scripts/skill/ziwei-cli.ts 打包成单文件
 *   .claude/skills/ziwei-doushu/scripts/ziwei.mjs
 * 打包后只需 Node 18+，不必 npm install —— 所以整个 skill 目录可以直接拷走或打成 zip 上传。
 *
 *   npm run build:skill
 *
 * 改了 lib/ziwei、lib/ai、lib/classics 或 docs/tianji-ziwei/entries.jsonl 之后要重新打包；
 * scripts/regression/skill-bundle.test.ts 会检查打包产物是否过期。
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// SKILL_BUNDLE_OUT 只给回归测试用：打包到临时位置，再与仓库里的产物比对
const OUTFILE = process.env.SKILL_BUNDLE_OUT || path.join(root, '.claude/skills/ziwei-doushu/scripts/ziwei.mjs');

await build({
  entryPoints: [path.join(root, 'scripts/skill/ziwei-cli.ts')],
  outfile: OUTFILE,
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
      '// 由 scripts/skill/build.mjs 生成，请勿手改。源码：scripts/skill/ziwei-cli.ts',
      "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
    ].join('\n'),
  },
  logLevel: 'warning',
});
console.log(`built ${path.relative(root, OUTFILE)}`);
