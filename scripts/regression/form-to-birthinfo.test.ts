/**
 * 出生资料 → BirthInfo 转换回归（晚子时换日）
 *
 * `lib/systems/ziwei/share.ts` 的 `formToBirthInfo()` 是唯一的转换实现，负责「晚子时换日」：
 * 23:00–23:59 出生按**次日**排盘（时辰取 0）。钉住早子时 / 晚子时边界与跨月、跨年进位。
 */
import assert from 'node:assert/strict';
import { formToBirthInfo } from '../../lib/systems/ziwei/share';
import type { BirthFormState } from '../../lib/systems/ziwei/share';

// ── formToBirthInfo 的边界行为 ───────────────────────────────
function formAt(
  year: string,
  month: string,
  day: string,
  clockHour: string,
  clockMinute = '30',
  overrides: Partial<BirthFormState> = {},
): BirthFormState {
  return {
    name: '',
    year,
    month,
    day,
    clockHour,
    clockMinute,
    unknownTime: false,
    province: '',
    city: '',
    longitude: 120,
    gender: 'male',
    ...overrides,
  };
}

const pick = (b: ReturnType<typeof formToBirthInfo>) => ({
  year: b.year,
  month: b.month,
  day: b.day,
  hour: b.hour,
});

// 晚子时：按次日排盘、时辰取 0
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '23'))),
  { year: 2000, month: 2, day: 1, hour: 0 },
  '1/31 23:30 晚子时应排到 2/1、时辰支 0',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '12', '31', '23'))),
  { year: 2001, month: 1, day: 1, hour: 0 },
  '跨年：12/31 23:30 应排到次年 1/1',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '2', '28', '23'))),
  { year: 2000, month: 2, day: 29, hour: 0 },
  '闰年：2/28 23:30 应排到 2/29',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2001', '2', '28', '23'))),
  { year: 2001, month: 3, day: 1, hour: 0 },
  '平年：2/28 23:30 应排到 3/1',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '23', '0'))),
  { year: 2000, month: 2, day: 1, hour: 0 },
  '23:00 整点即进入晚子时',
);

// 早子时与 22:xx：不换日
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '0'))),
  { year: 2000, month: 1, day: 31, hour: 0 },
  '00:30 早子时留在本日、时辰支同为 0',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '22', '59'))),
  { year: 2000, month: 1, day: 31, hour: 11 },
  '22:59 是亥时，不应换日',
);

// 时辰不详：不换日、支取 0
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '23', '30', { unknownTime: true }))),
  { year: 2000, month: 1, day: 31, hour: 0 },
  '时辰不详时不应按晚子时换日',
);

console.log('✅ 出生资料→BirthInfo：晚子时边界（跨月/跨年）均正确');
