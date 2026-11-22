/**
 * 外部函式庫的簡繁邊界。
 *
 * 倉庫原始碼一律繁體，但 lunar-javascript 與 iztro 只輸出簡體。所有對這兩個函式庫的呼叫
 * 都經過這裡：回傳的字串轉成繁體，傳進去的中文字串轉回簡體，函式庫內部照原樣運作。
 * 對照表由 scripts/i18n/gen-zh-trad.py 從函式庫原始碼產生（lib/calendar/zh-trad.data.ts）。
 */
import { PHRASES, CHARS } from './zh-trad.data';

const PHRASES_REV: Record<string, string> = {};
for (const [s, t] of Object.entries(PHRASES)) if (!(t in PHRASES_REV)) PHRASES_REV[t] = s;
const CHARS_REV: Record<string, string> = {};
for (const [s, t] of Object.entries(CHARS)) if (!(t in CHARS_REV)) CHARS_REV[t] = s;

const HAN = /[一-鿿]/;

/** 函式庫輸出的簡體字串 → 繁體。整串在表裡就整串換，否則逐字換。 */
export function toTrad(s: string): string {
  if (!HAN.test(s)) return s;
  const whole = PHRASES[s];
  if (whole !== undefined) return whole;
  let out = '';
  for (const ch of s) out += CHARS[ch] ?? ch;
  return out;
}

/** 傳給函式庫的繁體字串 → 簡體。 */
export function toSimp(s: string): string {
  if (!HAN.test(s)) return s;
  const whole = PHRASES_REV[s];
  if (whole !== undefined) return whole;
  let out = '';
  for (const ch of s) out += CHARS_REV[ch] ?? ch;
  return out;
}

const targets = new WeakMap<object, object>();

/** 純資料物件（例如節氣表）：鍵和值都轉；帶方法的物件（函式庫實例）改包 Proxy。 */
function isData(v: object): boolean {
  const p = Object.getPrototypeOf(v);
  if (p !== Object.prototype && p !== null) return false;
  return !Object.values(v).some(x => typeof x === 'function');
}

function out(v: unknown): unknown {
  if (typeof v === 'string') return toTrad(v);
  if (Array.isArray(v)) return v.map(out);
  if (v && typeof v === 'object') {
    if (isData(v)) {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) o[toTrad(k)] = out(x);
      return o;
    }
    return wrap(v);
  }
  return v;
}

function arg(v: unknown): unknown {
  if (typeof v === 'string') return toSimp(v);
  if (v && typeof v === 'object') return targets.get(v) ?? v;
  return v;
}

/**
 * 包一層 Proxy：讀到的字串、陣列、物件鍵轉繁體；方法照原物件呼叫（this 是原物件，
 * 函式庫內部不受影響），回傳值同樣轉換，回傳的類別實例也包起來。
 */
export function wrap<T extends object>(obj: T): T {
  if (targets.has(obj)) return obj;
  const proxy = new Proxy(obj, {
    get(t, k) {
      const v = Reflect.get(t, k, t);
      if (typeof k === 'symbol') return v;
      if (typeof v === 'function') {
        if (k === 'constructor') return v;
        return (...args: unknown[]) => out(Reflect.apply(v, t, args.map(arg)));
      }
      return out(v);
    },
  });
  targets.set(proxy, obj);
  return proxy;
}
