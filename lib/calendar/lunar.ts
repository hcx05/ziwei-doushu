/**
 * lunar-javascript 的繁體入口：倉庫內一律從這裡 import，不直接 import 'lunar-javascript'。
 * 回傳的字串（節氣、宜忌、神煞、十神、納音……）都已轉成繁體，見 ./zh.ts。
 */
import * as L from 'lunar-javascript';
import { wrap } from './zh';

export const Solar: typeof L.Solar = wrap(L.Solar);
export const Lunar: typeof L.Lunar = wrap(L.Lunar);
export const LunarUtil: typeof L.LunarUtil = wrap(L.LunarUtil);
export const LunarMonth: typeof L.LunarMonth = wrap(L.LunarMonth);
export type Solar = L.Solar;
export type Lunar = L.Lunar;
export type EightChar = L.EightChar;
export type JieQi = L.JieQi;
