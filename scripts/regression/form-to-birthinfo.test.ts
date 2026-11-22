/**
 * 出生資料 → BirthInfo 轉換回歸（晚子時換日）
 *
 * `lib/systems/ziwei/share.ts` 的 `formToBirthInfo()` 是唯一的轉換實現，負責「晚子時換日」：
 * 23:00–23:59 出生按**次日**排盤（時辰取 0）。釘住早子時 / 晚子時邊界與跨月、跨年進位。
 */
import assert from 'node:assert/strict';
import { formToBirthInfo } from '../../lib/systems/ziwei/share';
import type { BirthFormState } from '../../lib/systems/ziwei/share';

// ── formToBirthInfo 的邊界行為 ───────────────────────────────
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

// 晚子時：按次日排盤、時辰取 0
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '23'))),
  { year: 2000, month: 2, day: 1, hour: 0 },
  '1/31 23:30 晚子時應排到 2/1、時辰支 0',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '12', '31', '23'))),
  { year: 2001, month: 1, day: 1, hour: 0 },
  '跨年：12/31 23:30 應排到次年 1/1',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '2', '28', '23'))),
  { year: 2000, month: 2, day: 29, hour: 0 },
  '閏年：2/28 23:30 應排到 2/29',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2001', '2', '28', '23'))),
  { year: 2001, month: 3, day: 1, hour: 0 },
  '平年：2/28 23:30 應排到 3/1',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '23', '0'))),
  { year: 2000, month: 2, day: 1, hour: 0 },
  '23:00 整點即進入晚子時',
);

// 早子時與 22:xx：不換日
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '0'))),
  { year: 2000, month: 1, day: 31, hour: 0 },
  '00:30 早子時留在本日、時辰支同為 0',
);
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '22', '59'))),
  { year: 2000, month: 1, day: 31, hour: 11 },
  '22:59 是亥時，不應換日',
);

// 時辰不詳：不換日、支取 0
assert.deepEqual(
  pick(formToBirthInfo(formAt('2000', '1', '31', '23', '30', { unknownTime: true }))),
  { year: 2000, month: 1, day: 31, hour: 0 },
  '時辰不詳時不應按晚子時換日',
);

console.log('✅ 出生資料→BirthInfo：晚子時邊界（跨月/跨年）均正確');
