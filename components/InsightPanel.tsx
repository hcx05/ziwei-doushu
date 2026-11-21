'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
import { TOPICS, UNCERTAINTY_MARK, buildTask, type AiTask, type TopicKey } from '@/lib/ai/tasks';

type Version = 'pro' | 'simple';

interface Message {
  id: number;
  role: 'assistant';
  /** 这条解读对应的任务名称，例如「命格」「夫妻宫」 */
  label: string;
  /** 本任务中属于溯因的小节标题（由 lib/ai/tasks.ts 决定，不靠 AI 自报） */
  abductionTitles: string[];
  content: string;
  simple?: string;    // 通俗版正文（点「简单版」后按需生成，成功后缓存在这里）
  simpleError?: string;
}

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
}

type FontSize = 'sm' | 'md' | 'lg';

/** 正文字号（px）：小 / 常规 / 大 */
const FONT_PX: Record<FontSize, number> = { sm: 11, md: 13, lg: 15.5 };

/** Render AI markdown: **【Title】** → gold header, **bold** → strong */
function AiContent({
  text,
  streaming,
  size,
  abductionTitles = [],
}: {
  text: string;
  streaming?: boolean;
  size: number;
  abductionTitles?: string[];
}) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (!sectionMatch && line.trim().startsWith(UNCERTAINTY_MARK.trim())) {
          // 溯因小节的不确定性声明：单独高亮，提醒读者这里需要自己判断
          return (
            <div
              key={i}
              className="leading-relaxed rounded-md px-2 py-1 my-0.5"
              style={{ color: '#d97706', background: 'rgba(217,119,6,0.08)', fontSize: size }}
            >
              {line.replace(/\*\*/g, '')}
            </div>
          );
        }
        if (sectionMatch) {
          return (
            <div key={i} className="pt-3 pb-0.5 first:pt-0">
              <span
                className="font-semibold tracking-wide"
                style={{ color: 'var(--t-gold)', fontSize: size }}
              >
                【{sectionMatch[1]}】
              </span>
              {abductionTitles.includes(sectionMatch[1]) && (
                <span
                  className="ml-1.5 rounded px-1 py-px align-middle"
                  title="溯因：需要在多种讯号间取舍或给出现实建议，AI 在这类推理上不可靠，请自行判断"
                  style={{ fontSize: 9, color: '#d97706', border: '1px solid rgba(217,119,6,0.4)' }}
                >
                  溯因·需自行判断
                </span>
              )}
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <div key={i} className="leading-relaxed" style={{ color: 'var(--t-text2)', fontSize: size }}>
            {parts.map((part, j) =>
              j % 2 === 0
                ? part
                : <strong key={j} className="font-medium" style={{ color: 'var(--t-text)' }}>{part}</strong>
            )}
          </div>
        );
      })}
      {streaming && (
        <span
          className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm align-middle"
          style={{ background: 'var(--t-gold)', opacity: 0.6 }}
        />
      )}
    </div>
  );
}

function VersionPill({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="py-1 text-[10px] font-medium rounded-lg transition-all duration-150 disabled:opacity-40"
      style={{
        background: active ? 'rgba(212,168,67,0.16)' : 'transparent',
        border: `1px solid ${active ? 'rgba(212,168,67,0.35)' : 'var(--t-border)'}`,
        color: active ? 'var(--t-gold)' : 'var(--t-faint)',
      }}
    >
      {label}
    </button>
  );
}

function FontPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 py-1 text-[10px] font-medium rounded-md transition-all duration-150"
      style={{
        background: active ? 'rgba(212,168,67,0.16)' : 'transparent',
        border: `1px solid ${active ? 'rgba(212,168,67,0.35)' : 'var(--t-border)'}`,
        color: active ? 'var(--t-gold)' : 'var(--t-faint)',
      }}
    >
      {label}
    </button>
  );
}

type StreamTarget =
  | { kind: 'new'; id: number; label: string; abductionTitles: string[] }
  | { kind: 'simple'; id: number };

export default function InsightPanel({ chart, selectedPalace, selectedSiHua }: InsightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('overview');
  // 专业版为默认；简单版按需生成并缓存在每条消息上
  const [version, setVersion] = useState<Version>('pro');
  const [simpleBusy, setSimpleBusy] = useState(false);
  const [simpleStreamingId, setSimpleStreamingId] = useState<number | null>(null);
  // 正文字号，随时切换、全局生效
  const [fontSize, setFontSize] = useState<FontSize>('sm');
  // 站点配了 ACCESS_CODE 时才用得到
  const [needCode, setNeedCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeSaved, setCodeSaved] = useState(false);
  const px = FONT_PX[fontSize];

  const messagesRef = useRef<Message[]>([]); // always-current copy for closures
  const loadingRef = useRef(false);
  const versionRef = useRef<Version>('pro');
  const simpleBusyRef = useRef(false);
  const idRef = useRef(0);
  const autoLoaded = useRef(false);
  const lastPalaceBranch = useRef<number | undefined>(undefined);
  const lastSiHuaKey = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextId = () => { idRef.current += 1; return idRef.current; };

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { versionRef.current = version; }, [version]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, version]);

  /** 统一的一次 SSE 请求：kind='new' 追加一条专业版回答；kind='simple' 把通俗版写回指定消息 */
  const runStream = async (
    payload: unknown,
    target: StreamTarget,
  ): Promise<{ ok: boolean; text: string; error?: string }> => {
    const isSimple = target.kind === 'simple';

    // 先把占位消息放进去，流式过程才有落脚点
    if (isSimple) {
      setMessages(prev => prev.map(m => (m.id === target.id ? { ...m, simple: '', simpleError: undefined } : m)));
    } else {
      setMessages(prev => [
        ...prev,
        { id: target.id, role: 'assistant', label: target.label, abductionTitles: target.abductionTitles, content: '' },
      ]);
    }

    try {
      const code =
        typeof window !== 'undefined' ? window.localStorage.getItem('ziwei-access-code') : null;
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(code ? { 'x-access-code': code } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        setNeedCode(true);
        return { ok: false, text: '', error: 'need-code' };
      }
      if (res.status === 404) throw new Error('api-missing');
      if (!res.ok) throw new Error('http-' + res.status);
      if (!res.body) throw new Error('no-body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // 半行留到下一次，避免被切断的 JSON 丢掉

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') { finished = true; break; }

          let delta = '';
          try {
            delta = JSON.parse(data).delta?.text ?? '';
          } catch {
            continue; // 非 JSON 心跳行
          }
          if (!delta) continue;

          acc += delta;
          if (isSimple) {
            setMessages(prev => prev.map(m => (m.id === target.id ? { ...m, simple: acc } : m)));
          } else {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') updated[updated.length - 1] = { ...last, content: acc };
              return updated;
            });
          }
        }
      }

      return { ok: true, text: acc };
    } catch (e) {
      return { ok: false, text: '', error: e instanceof Error ? e.message : 'error' };
    }
  };

  /** 为某条专业版回答生成通俗版 */
  const requestSimple = async (id: number, source: string) => {
    setSimpleStreamingId(id);
    try {
      const res = await runStream(
        { chart, messages: [], mode: 'simple', source },
        { kind: 'simple', id },
      );
      if (!res.ok) {
        if (res.error === 'need-code') return; // 由口令栏统一提示，不在这里留错
        setMessages(prev =>
          prev.map(m =>
            m.id === id ? { ...m, simple: undefined, simpleError: '通俗版生成失败，点「简单版」重试' } : m,
          ),
        );
      }
    } finally {
      setSimpleStreamingId(cur => (cur === id ? null : cur));
    }
  };

  /** 补齐所有还没有通俗版的历史回答 */
  const generateMissingSimple = async (forceRetry = false) => {
    if (simpleBusyRef.current || loadingRef.current) return;
    simpleBusyRef.current = true;
    setSimpleBusy(true);
    try {
      const pending = messagesRef.current.filter(
        m => m.role === 'assistant' && m.content && m.simple === undefined && (forceRetry || !m.simpleError),
      );
      for (const m of pending) {
        const live = messagesRef.current.find(x => x.id === m.id);
        if (!live || live.simple !== undefined) continue;
        await requestSimple(m.id, m.content);
      }
    } finally {
      simpleBusyRef.current = false;
      setSimpleBusy(false);
    }
  };

  const handleVersionChange = (next: Version) => {
    if (next === version) {
      if (next === 'simple') void generateMissingSimple(true); // 二次点击 = 重试失败的
      return;
    }
    setVersion(next);
    if (next === 'simple') void generateMissingSimple(false);
  };

  /**
   * 跑一个白名单任务：永远先出专业版；若当前处于「简单版」视图，再自动补一份通俗版。
   * 没有自由提问——「为什么会发生某事」「时辰对不对」这类溯因问题不交给 AI。
   */
  const runTask = async (task: AiTask, label: string) => {
    if (loadingRef.current) return;
    const built = buildTask(task, chart);
    if (!built) return;
    loadingRef.current = true;
    setLoading(true);

    const assistantId = nextId();
    const abductionTitles = built.sections.filter(sec => sec.kind === 'abduction').map(sec => sec.title);
    const res = await runStream({ chart, task }, { kind: 'new', id: assistantId, label, abductionTitles });

    if (!res.ok) {
      if (res.error === 'need-code') {
        // 需要口令：撤掉占位气泡，等用户填完再重新点
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      const missing = res.error === 'api-missing';
      const text2 = missing
        ? '开源版不含 AI 解读接口（/api/interpret），需要你自己实现后才能用，详见 README「快速开始」。排盘本身不需要任何 API Key。'
        : '解读失败，请稍后重试。';
      setMessages(prev => {
        const exists = prev.some(m => m.id === assistantId);
        if (exists) return prev.map(m => (m.id === assistantId ? { ...m, content: text2 } : m));
        return [...prev, { id: assistantId, role: 'assistant', label, abductionTitles: [], content: text2 }];
      });
    }

    setLoading(false);
    loadingRef.current = false;

    // 简单版视图下：新回答（以及此前还没生成的）自动补通俗版
    if (versionRef.current === 'simple' && res.ok && res.text) {
      void generateMissingSimple(false);
    }
  };

  // Auto-generate 命格总览 on mount
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    void runTask({ type: 'topic', key: 'overview' }, '命格');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 点选宫位 → 单宫分析
  useEffect(() => {
    if (!selectedPalace || selectedPalace.branch === lastPalaceBranch.current) return;
    lastPalaceBranch.current = selectedPalace.branch;
    void runTask({ type: 'palace', branch: selectedPalace.branch }, selectedPalace.name);
  }, [selectedPalace]); // eslint-disable-line react-hooks/exhaustive-deps

  // 点选四化 → 飞化分析
  useEffect(() => {
    if (!selectedSiHua) return;
    const key = `${selectedSiHua.starName}-${selectedSiHua.siHua}-${selectedSiHua.view}`;
    if (key === lastSiHuaKey.current) return;
    lastSiHuaKey.current = key;
    void runTask(
      { type: 'sihua', starName: selectedSiHua.starName, siHua: selectedSiHua.siHua, view: selectedSiHua.view },
      `${selectedSiHua.starName}化${selectedSiHua.siHua}`,
    );
  }, [selectedSiHua]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTopicClick = (topicKey: TopicKey, label: string) => {
    if (loadingRef.current) return;
    setActiveTopic(topicKey);
    void runTask({ type: 'topic', key: topicKey }, label);
  };

  /** 保存访问口令到 localStorage，后续请求自动带上 */
  const saveCode = () => {
    const v = codeInput.trim();
    if (!v) return;
    try { window.localStorage.setItem('ziwei-access-code', v); } catch { /* 隐私模式下可能失败 */ }
    setCodeInput('');
    setNeedCode(false);
    setCodeSaved(true);
  };

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden card-glass"
      style={{ height: 'calc(100vh - 190px)', minHeight: 500, maxHeight: 880 }}
    >

      {/* ── Topic buttons ── */}
      <div className="flex-shrink-0 px-2 pt-2.5 pb-2" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="grid grid-cols-6 gap-1">
          {TOPICS.map(t => {
            const isActive = activeTopic === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTopicClick(t.key, t.label)}
                disabled={loading}
                className="py-1.5 text-[10px] font-medium rounded-lg transition-all duration-150 disabled:opacity-40"
                style={{
                  background: isActive ? 'rgba(212,168,67,0.12)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(212,168,67,0.3)' : 'var(--t-border)'}`,
                  color: isActive ? 'var(--t-gold)' : 'var(--t-faint)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── 版本与字号 ── */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9px] tracking-widest shrink-0" style={{ color: 'var(--t-faint)' }}>
            版本
          </span>
          <div className="grid grid-cols-2 gap-1 flex-1">
            <VersionPill
              label="专业版"
              active={version === 'pro'}
              onClick={() => handleVersionChange('pro')}
            />
            <VersionPill
              label={simpleBusy ? '简单版 …' : '简单版'}
              active={version === 'simple'}
              disabled={loading}
              onClick={() => handleVersionChange('simple')}
            />
          </div>

          <span className="text-[9px] tracking-widest shrink-0 ml-1" style={{ color: 'var(--t-faint)' }}>
            字号
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <FontPill label="小" active={fontSize === 'sm'} onClick={() => setFontSize('sm')} />
            <FontPill label="中" active={fontSize === 'md'} onClick={() => setFontSize('md')} />
            <FontPill label="大" active={fontSize === 'lg'} onClick={() => setFontSize('lg')} />
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

        {codeSaved && messages.length === 0 && (
          <div className="text-[10px] text-center" style={{ color: 'var(--t-gold)' }}>
            口令已保存，请点上方的主题按钮开始解读。
          </div>
        )}

        {/* Loading state before first message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3" style={{ color: 'var(--t-gold)', opacity: 0.1 }}>✦</div>
            <p className="text-[10px] animate-pulse" style={{ color: 'var(--t-faint)' }}>命格解读生成中…</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            // Assistant message
            const isLastMsg = i === messages.length - 1;
            const showSimple = version === 'simple';
            const simpleReady = typeof msg.simple === 'string' && msg.simple.length > 0;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="text-[9px] tracking-widest mb-2 flex items-center justify-between gap-1.5"
                  style={{ color: 'var(--t-faint)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--t-gold)', opacity: 0.4 }}>✦</span>
                    {showSimple ? '通俗解读' : '命理解读'} · {msg.label}
                  </span>
                  {showSimple && !simpleReady && !msg.simpleError && (
                    <span className="animate-pulse">通俗版生成中…</span>
                  )}
                </div>

                {showSimple && simpleReady ? (
                  <AiContent
                    text={msg.simple as string}
                    streaming={simpleStreamingId === msg.id}
                    size={px}
                    abductionTitles={msg.abductionTitles}
                  />
                ) : (
                  <>
                    <AiContent
                      text={msg.content}
                      streaming={loading && isLastMsg}
                      size={px}
                      abductionTitles={msg.abductionTitles}
                    />
                    {showSimple && msg.simpleError && (
                      <div className="mt-2 text-[9px]" style={{ color: '#f87171' }}>
                        {msg.simpleError}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── 访问口令（服务端配了 ACCESS_CODE 时才出现）── */}
      {needCode && (
        <div
          className="flex-shrink-0 px-3 py-2"
          style={{ borderTop: '1px solid var(--t-border)', background: 'rgba(212,168,67,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] shrink-0" style={{ color: 'var(--t-gold)' }}>访问口令</span>
            <input
              type="password"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeSaved(false); }}
              onKeyDown={e => e.key === 'Enter' && saveCode()}
              placeholder="请输入站长给的口令"
              className="flex-1 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none"
              style={{
                background: 'var(--t-card)',
                border: '1px solid var(--t-border)',
                color: 'var(--t-text)',
              }}
            />
            <button
              onClick={saveCode}
              disabled={!codeInput.trim()}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-30"
              style={{
                background: 'rgba(212,168,67,0.15)',
                border: '1px solid rgba(212,168,67,0.25)',
                color: 'var(--t-gold)',
              }}
            >
              确定
            </button>
          </div>
          <div className="mt-1 text-[9px]" style={{ color: 'var(--t-faint)' }}>
            {codeSaved ? '已保存，重新点一次上方主题即可解读。' : '本站需要口令才能调用解读。'}
          </div>
        </div>
      )}

      {/* ── 说明（自由追问已移除）── */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--t-border)' }}>
        <div className="text-[9px] leading-relaxed text-center" style={{ color: 'var(--t-faint)' }}>
          AI 只负责按规则推演与整理；标「溯因·需自行判断」的小节涉及取舍与现实建议，AI 在这类推理上不可靠，请结合自身实际判断。
          <br />
          不提供自由追问。命盘仅用于本次生成，服务器不保存。
        </div>
      </div>

    </div>
  );
}
