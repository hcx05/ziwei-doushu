/**
 * app/api/interpret —— 本地 AI 解读接口（自建，非官方开源部分）
 *
 * 前端（components/InsightPanel.tsx）只认这一份契约：
 *   POST { chart: ZiweiChart, task: AiTask }                   专业版
 *   POST { chart: ZiweiChart, mode: 'simple', source: string } 简单版（只改写已生成的专业版）
 *   ← text/event-stream，每帧 `data: {"delta":{"text":"…"}}`，结尾 `data: [DONE]`
 *
 * 推理分工（见 lib/ai/tasks.ts）：溯因小节（取舍、定性、现实建议）可以写，但必须标明
 * 「仅供参考，模型在此类推理有能力限制」。网站**不接受自由提问**——task 必须是白名单里的
 * 主题 / 宫位 / 四化，prompt 由服务端自己组（自由提问只在 Claude Skill 里开放）。
 *
 * 隐私约定：默认**只发送排盘结果**（十二宫星曜 / 四化 / 大限 / 格局），
 * 不发送姓名、出生地、经纬度、公历生日、四柱。需要时用 PRIVACY_INCLUDE_BIRTH=1 打开。
 *
 * 通道可切换（.env.local）：
 *   AI_PROVIDER=deepseek（默认）| mimo | ollama | 任意 OpenAI 兼容
 *   AI_API_KEY / AI_BASE_URL / AI_MODEL 可覆盖下面任何一项
 */

import type { NextRequest } from 'next/server';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { ASSUMPTION_MARK, buildTask, parseTask, REASONING_RULES, UNCERTAINTY_MARK } from '@/lib/ai/tasks';
import { buildDigest } from '@/lib/ai/digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};

const DONE_CHUNK = encoder.encode('data: [DONE]\n\n');

function sseChunk(text: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`);
}

/** 把若干帧包成 SSE 响应（错误提示也走这条路，前端才能把话显示出来） */
function respondWith(parts: Uint8Array[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

function failWith(message: string): Response {
  return respondWith([sseChunk(message), DONE_CHUNK]);
}

// ────────────────── 上线防护：限流 + 访问口令 ──────────────────
// 单容器内存版（ModelScope 是常驻容器，进程重启即清零，够用）。
// 三个数字都可以用环境变量覆盖，防止被转发的公开链接刷爆额度。
const RATE = {
  perMinutePerIp: Number(process.env.RATE_PER_MINUTE ?? 3),
  perDayPerIp: Number(process.env.RATE_PER_DAY_IP ?? 30),
  perDayGlobal: Number(process.env.RATE_PER_DAY_GLOBAL ?? 400),
};

interface RateBucket {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ipBuckets = new Map<string, RateBucket>();
let globalBucket = { dayStart: 0, dayCount: 0 };

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first && first.trim()) return first.trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** 返回 null 表示放行，返回字符串表示要被拦下的原因 */
function hitRate(ip: string): string | null {
  const now = Date.now();
  // 网关没透传真实 IP 时（ip=unknown），只做全站计数，避免所有人共用一个桶被互相卡死
  const trackPerIp = ip !== 'unknown';
  let b = ipBuckets.get(ip);
  if (!b) {
    b = { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
    ipBuckets.set(ip, b);
  }
  if (now - b.minuteStart > 60_000) { b.minuteStart = now; b.minuteCount = 0; }
  if (now - b.dayStart > DAY_MS) { b.dayStart = now; b.dayCount = 0; }
  if (now - globalBucket.dayStart > DAY_MS) { globalBucket = { dayStart: now, dayCount: 0 }; }

  if (trackPerIp && b.minuteCount >= RATE.perMinutePerIp) {
    return `问得有点快，每分钟最多 ${RATE.perMinutePerIp} 次，缓一下再继续。`;
  }
  if (trackPerIp && b.dayCount >= RATE.perDayPerIp) {
    return `今天这台设备的 ${RATE.perDayPerIp} 次解读额度已用完，明天再来。`;
  }
  if (globalBucket.dayCount >= RATE.perDayGlobal) {
    return '今天的全站解读额度已经用完，明天再来。';
  }

  if (trackPerIp) {
    b.minuteCount += 1;
    b.dayCount += 1;
  }
  globalBucket.dayCount += 1;

  // 顺手清掉过期的桶，避免内存无限增长
  if (ipBuckets.size > 2000) {
    for (const [key, bucket] of ipBuckets) {
      if (now - bucket.dayStart > DAY_MS) ipBuckets.delete(key);
    }
  }
  return null;
}

/** 没配 ACCESS_CODE 就等同于不启用口令 */
function accessCodeOk(req: NextRequest): boolean {
  const expected = process.env.ACCESS_CODE?.trim();
  if (!expected) return true;
  return req.headers.get('x-access-code')?.trim() === expected;
}

// ────────────────── 通道配置 ──────────────────

interface ProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function resolveConfig(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();

  const fallback: Record<string, { key: string; base: string; model: string }> = {
    deepseek: {
      key: process.env.DEEPSEEK_API_KEY || '',
      base: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    mimo: {
      key: process.env.MIMO_API_KEY || '',
      base: process.env.MIMO_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.MIMO_MODEL || 'deepseek-chat',
    },
    ollama: {
      key: '',
      base: 'http://127.0.0.1:11434/v1',
      model: 'qwen2.5:7b',
    },
  };

  const preset = fallback[provider] ?? fallback.deepseek;

  return {
    provider,
    apiKey: process.env.AI_API_KEY || preset.key,
    baseUrl: (process.env.AI_BASE_URL || preset.base).replace(/\/+$/, ''),
    model: process.env.AI_MODEL || preset.model,
  };
}

// ────────────────── system prompt ──────────────────

function buildSystemPrompt(chart: ZiweiChart): string {
  return [
    '你是「倪海厦《天纪》紫微斗数」体系的命理解读师，为命主解读下面这份已经排好的命盘。',
    '',
    '硬性要求：',
    '1. 严格按用户消息里给出的 **【小节标题】** 结构输出，标题必须单独成行、原样保留（前端靠它渲染金色小标题）。',
    '2. 只能引用下方命盘中真实存在的星曜、宫位、四化、大限；绝对不要编造未出现的星曜或数字。',
    '3. 每个判断尽量具体到「宫位＋星曜＋四化」，并在句末用括号注明依据，例如：（命宫紫微、官禄宫廉贞化忌）。',
    '4. 语气沉稳克制，不做绝对化预言；健康只谈调养方向、不下诊断；财务不承诺收益、不推荐具体标的。',
    '5. 简体中文，每段不超过三行，不要表格、不要代码块、不要重复用户的问题。',
    '6. 若命盘信息不足以回答，就直说「此宫无主星，需借对宫」之类，不要硬编。',
    '7. 本次没有提供倪师原话资料，不要用引号逐字「引用」倪师原话；可以说「按倪师体系」。',
    '8. 小节标题后面方括号里的「［演绎节］」「［溯因节：…］」是给你的指示，不要输出到正文。',
    '',
    REASONING_RULES,
    '',
    '──── 命盘数据（已脱敏，不含姓名与生辰）────',
    buildDigest(chart, {
      liunianYear: new Date().getFullYear(),
      includeBirth: process.env.PRIVACY_INCLUDE_BIRTH === '1',
    }),
  ].join('\n');
}

// ────────────────── 简单版（通俗转述）system prompt ──────────────────

const SIMPLE_SYSTEM = [
  '你是「倪海厦《天纪》紫微斗数」的通俗转述者。用户会给你一段已经写好的专业命理解读，请把它改写成「简单版」。',
  '',
  '改写要求：',
  '1. 读者是完全不懂紫微斗数的普通人，用日常口语讲，像朋友聊天。',
  '2. 保留原文的 **【小节标题】** 与顺序，标题一字不改、单独成行（前端靠它渲染金色小标题）。',
  '3. 每个小节先用一句大白话说结论，再用两三句解释「为什么」，可以打比方、举生活场景。',
  '4. 专业术语第一次出现时用括号顺带解释，例如：命宫（代表你自己）。',
  '5. 不得改变原意，不得新增或删除命理判断，不得编造星曜、宫位、四化。',
  `   原文中以「${UNCERTAINTY_MARK}」或「${ASSUMPTION_MARK}」开头的句子必须保留这个开头，并用白话讲清楚「这里为什么只能参考」；`,
  '   原文用「倾向」「可能」的地方不得改写成肯定语气，原文列出的另一种解读也要保留。',
  '6. 每段不超过三行，不用表格、不用代码块、不用罗列符号。',
  '7. 全文控制在 600 字以内。',
].join('\n');

// ────────────────── 上游错误 → 人话 ──────────────────

function explainUpstream(status: number, bodyText: string): string {
  const detail = bodyText.slice(0, 300).replace(/\s+/g, ' ').trim();
  const hint =
    status === 401
      ? 'API Key 无效或已失效，请检查 .env.local 里的 DEEPSEEK_API_KEY。'
      : status === 402
        ? '账户余额不足，请到 platform.deepseek.com 充值。'
        : status === 429
          ? '请求太频繁或额度用尽，等一会儿再试。'
          : status >= 500
            ? '模型服务端故障，稍后重试。'
            : '请求被拒绝。';
  return `解读失败：${hint}\n\n（HTTP ${status}${detail ? `｜${detail}` : ''}）`;
}

// ────────────────── 主流程 ──────────────────

export async function POST(req: NextRequest): Promise<Response> {
  // 1. 解析请求
  let chart: ZiweiChart | null = null;
  let rawTask: unknown = null;
  let isSimple = false;
  let sourceText = '';
  try {
    const body = (await req.json()) as {
      chart?: ZiweiChart;
      task?: unknown;
      mode?: string;
      source?: string;
    };
    chart = body.chart ?? null;
    rawTask = body.task ?? null;
    isSimple = body.mode === 'simple';
    sourceText = typeof body.source === 'string' ? body.source.trim() : '';
  } catch {
    return failWith('请求体解析失败，请刷新页面重试。');
  }

  if (!chart || !Array.isArray(chart.palaces) || chart.palaces.length === 0) {
    return failWith('没有收到命盘数据，请先在本页起盘，再点解读。');
  }

  if (isSimple && !sourceText) {
    return failWith('没有拿到要改写的专业版内容，请等专业版生成完再切「简单版」。');
  }

  // 只接受白名单任务；自由提问属于溯因重灾区，已移除
  const task = isSimple ? null : parseTask(rawTask);
  const built = task ? buildTask(task, chart) : null;
  if (!isSimple && !built) {
    return failWith(
      '本站不提供自由提问，请从上方选择主题、点选宫位或四化。',
    );
  }

  // 2. 访问口令（没配 ACCESS_CODE 则跳过）
  if (!accessCodeOk(req)) {
    return new Response(JSON.stringify({ error: 'access-code-required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // 3. 限流：每 IP 每分钟 / 每天 + 全站每日
  const limited = hitRate(clientIp(req));
  if (limited) return failWith(limited);

  // 4. 检查通道配置
  const cfg = resolveConfig();
  if (!cfg.apiKey && cfg.provider !== 'ollama') {
    return respondWith([
      sseChunk(
        [
          '还没有配置 API Key，所以解读跑不起来。',
          '',
          '请打开项目根目录下的 .env.local，把这一行填上：',
          'DEEPSEEK_API_KEY=sk-你的Key',
          '',
          '保存后**重启** npm run dev（Next 只在启动时读 env），再刷新本页即可。',
          '',
          '部署到 ModelScope / Vercel 时，不要改代码：到平台的「环境变量」里加同名变量，再重启容器。',
          '',
          'Key 在 https://platform.deepseek.com/api_keys 创建。排盘本身不需要 Key。',
        ].join('\n'),
      ),
      DONE_CHUNK,
    ]);
  }

  // 5. 组上下文：每次只送一个任务，不带对话历史（没有多轮追问）
  const messages: { role: 'user'; content: string }[] = isSimple
    ? [{ role: 'user', content: `请把下面这段命理解读改写成「简单版」：\n\n${sourceText.slice(0, 6000)}` }]
    : [{ role: 'user', content: built!.prompt }];

  const payload = {
    model: cfg.model,
    stream: true,
    temperature: isSimple ? 0.6 : 0.5,
    max_tokens: isSimple ? 1600 : 2200,
    messages: [
      { role: 'system', content: isSimple ? SIMPLE_SYSTEM : buildSystemPrompt(chart) },
      ...messages,
    ],
  };

  // 6. 请求上游
  let upstream: Response;
  try {
    upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: req.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return failWith(
      aborted
        ? '（已取消）'
        : `连不上 ${cfg.baseUrl}。\n\n请检查：1) 网络能否访问该地址；2) .env.local 里 AI_BASE_URL 是否写错。`,
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return failWith(explainUpstream(upstream.status, text));
  }

  // 5. 上游 SSE → 前端要的 SSE
  const upstreamBody = upstream.body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let closed = false;

      const push = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.enqueue(DONE_CHUNK);
          controller.close();
        } catch {
          /* 客户端已断开 */
        }
      };

      try {
        for (;;) {
          const result = await reader.read();
          if (result.done || !result.value) break;

          buffer += decoder.decode(result.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // 关键：留住可能被切断的半行

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;

            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              finish();
              return;
            }
            if (!data) continue;

            try {
              const json = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const text = json.choices?.[0]?.delta?.content;
              if (text) push(sseChunk(text));
            } catch {
              /* 上游偶尔会发心跳/非 JSON 行，跳过 */
            }
          }
        }
        finish();
      } catch {
        push(sseChunk('\n\n（连接中断，请重试）'));
        finish();
      } finally {
        reader.releaseLock?.();
      }
    },
    cancel() {
      void upstreamBody.cancel().catch(() => {});
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
