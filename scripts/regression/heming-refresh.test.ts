import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { formToBirthInfo } from '../../lib/ziwei/share';
import type { BirthInfo } from '../../lib/ziwei/types';

// Exercise the page's actual compare callback across two renders.
// 合盘已不经 AI：编辑出生信息后再点一次，必须按新表单重新起盘，不能复用旧盘。
const source = readFileSync(new URL('../../app/heming/page.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  // 表单是否填齐');
const end = source.indexOf('  const cardStyle =', start);
assert.ok(start >= 0 && end > start);
assert.ok(!/fetch\(/.test(source), '/heming 不应再调用任何 AI 接口（合盘综合评判属于溯因，已移除）');
const body = `export function makeRun(ctx) {
  const {formA,formB,generateChart,formToBirthInfo,setFormError,setChartA,setChartB,compareRef} = ctx;
  const useCallback = (fn) => fn;
  ${source.slice(start, end)}
  return runCompare;
}`;
const moduleExports: Record<string, (ctx: object) => () => Promise<void>> = {};
new Function('exports', 'setTimeout', ts.transpileModule(body, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(moduleExports, () => {});
const noop = () => {};
const form = { year: '1990', month: '1', day: '1', clockHour: '8', clockMinute: '0',
  gender: 'male' as const, unknownTime: false, name: 'A', province: '', city: '', longitude: 120 };
let chartA: { birthInfo: BirthInfo } | null = null;
let chartB: { birthInfo: BirthInfo } | null = null;
let currentForm = { ...form };
const context = () => ({
  formA: currentForm, formB: { ...form, name: 'B' }, formToBirthInfo,
  generateChart: async (birthInfo: BirthInfo) => ({ birthInfo }),
  setChartA: (value: { birthInfo: BirthInfo }) => { chartA = value; },
  setChartB: (value: { birthInfo: BirthInfo }) => { chartB = value; },
  setFormError: noop, compareRef: { current: null },
});
async function main() {
  await moduleExports.makeRun(context())();
  assert.equal(chartA!.birthInfo.year, 1990);
  currentForm = { ...form, year: '1991' };
  await moduleExports.makeRun(context())();
  assert.equal(chartA!.birthInfo.year, 1991, 'the second compare must use edited birth data');
  assert.equal(chartB!.birthInfo.name, 'B');
  console.log('Heming edited-form compare regression passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
