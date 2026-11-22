/**
 * 把 .claude/skills/ 下每個 skill 各打成一個 zip，給 Claude 網頁版 / 桌面版「上傳 Skill」用：
 *   dist/skill-zips/<skill>.zip（zip 內是 <skill>/SKILL.md 與 <skill>/scripts/*.mjs）
 *
 *   npm run pack:skill
 *
 * 先跑 npm run build:skill 確保工具是最新的。需要系統有 zip 指令（macOS、Linux 內建）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillsDir = path.join(root, '.claude/skills');
const outDir = path.join(root, 'dist/skill-zips');
mkdirSync(outDir, { recursive: true });

for (const name of readdirSync(skillsDir).sort()) {
  if (!existsSync(path.join(skillsDir, name, 'SKILL.md'))) continue;
  const zip = path.join(outDir, `${name}.zip`);
  rmSync(zip, { force: true });
  execFileSync('zip', ['-rqX', zip, name, '-x', '*.DS_Store'], { cwd: skillsDir });
  console.log(path.relative(root, zip));
}
