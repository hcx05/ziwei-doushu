'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { generateChart as buildChart } from '@/lib/ziwei/algorithm';
import { BRANCHES } from '@/lib/ziwei/constants';
import type { BirthInfo, Palace, ZiweiChart } from '@/lib/ziwei/types';
import { useTheme } from '@/components/ThemeProvider';

/**
 * 合盘 —— 双盘对照（不含 AI）
 *
 * 原先这里有「AI 合盘分析」：缘分匹配度、是否适合结婚 / 合伙、自由追问。
 * 把两张盘综合成一个评价，或回答「哪方面最容易产生矛盾」，都是在多种讯号之间
 * 取舍的溯因推理，而大语言模型在溯因上有根本限制（见 lib/ai/tasks.ts），
 * 所以这项功能已移除。现在只用本地排盘引擎起两张盘，并列关键宫位的星曜与四化，
 * 判断交给使用者自己。
 */

/** 合盘时通常对照的宫位 */
const COMPARE_PALACES = ['命宫', '夫妻宫', '福德宫', '财帛宫', '官禄宫', '迁移宫'] as const;

function palaceStars(palace: Palace | undefined): string {
  if (!palace) return '—';
  if (palace.stars.length === 0) {
    return palace.borrowedStars?.length
      ? `空宫（借${palace.borrowedFromName ?? '对宫'}：${palace.borrowedStars.join('、')}）`
      : '空宫';
  }
  return palace.stars
    .filter(s => s.type === 'major' || s.siHua)
    .map(s => `${s.name}${s.brightnessRaw ? `(${s.brightnessRaw})` : ''}${s.siHua ? `化${s.siHua}` : ''}`)
    .join('、') || '无主星';
}

function findPalace(chart: ZiweiChart, name: string): Palace | undefined {
  return chart.palaces.find(p => p.name === name);
}

export default function HemingPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ─── 双方命盘状态 ─────────────────────────────────────────
  const [chartA, setChartA] = useState<ZiweiChart | null>(null);
  const [chartB, setChartB] = useState<ZiweiChart | null>(null);
  // 双方表单状态由 BirthForm onFormSave 同步到此处，统一按钮触发起盘
  const [formA, setFormA] = useState<BirthFormState | null>(null);
  const [formB, setFormB] = useState<BirthFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  // ─── 起盘（本地排盘引擎，不经任何 AI）──────────────────────
  const generateChart = useCallback(async (info: BirthInfo): Promise<ZiweiChart | null> => {
    try {
      return buildChart(info);
    } catch {
      return null;
    }
  }, []);

  // 表单是否填齐
  const isFormReady = (f: BirthFormState | null): boolean =>
    !!(f && f.year && f.month && f.day && f.gender && (f.unknownTime || (f.clockHour !== '' && f.clockMinute !== '')));

  // ─── 统一入口：按当前表单起两张盘 ───────────────────────────
  const runCompare = useCallback(async () => {
    setFormError(null);
    if (!isFormReady(formA) || !isFormReady(formB)) {
      setFormError('请先填写双方完整出生信息');
      return;
    }
    // 每次按当前表单起盘，避免编辑出生信息后复用旧盘。
    const [cA, cB] = await Promise.all([
      generateChart(formToBirthInfo(formA!)),
      generateChart(formToBirthInfo(formB!)),
    ]);
    if (!cA || !cB) {
      setFormError('起盘失败，请检查出生信息');
      return;
    }
    setChartA(cA);
    setChartB(cB);
    setTimeout(() => compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [formA, formB, generateChart]);

  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(200,160,60,0.2)'}`,
    borderRadius: '16px',
    padding: '24px',
  };

  const labelStyle = {
    fontSize: '10px', letterSpacing: '0.4em', color: 'var(--ac)', opacity: 0.7,
    marginBottom: '16px', display: 'block',
  };

  const cellStyle = {
    padding: '10px 12px', fontSize: '13px', lineHeight: 1.6, color: 'var(--tx-2)',
    borderTop: '1px solid var(--bdr)', verticalAlign: 'top' as const,
  };

  const hourNote = (c: ZiweiChart) => (c.birthInfo.hourUnknown ? '（时辰不详，按子时假设排出）' : '');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* 顶栏 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: isDark ? 'rgba(2,8,16,0.88)' : 'rgba(250,245,235,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--bdr)',
        display: 'flex', alignItems: 'center', padding: '0 24px', height: '52px', gap: '16px',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
            color: 'var(--tx-3)', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '16px' }}>‹</span>
          <span>返回</span>
        </button>
        <div style={{ width: '1px', height: '20px', background: 'var(--bdr-med)' }} />
        <span style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em' }}>双盘对照</span>
      </header>

      {/* 主体 */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '28px', color: 'var(--ac)', opacity: 0.15, marginBottom: '12px' }}>☯</div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--tx-0)', marginBottom: '8px' }}>
            紫微合盘 · 双盘对照
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--tx-3)', lineHeight: 1.6 }}>
            输入两个人的出生信息，并列两张命盘的关键宫位。
            <br />
            匹配度、合不合适这类综合判断属于溯因推理，AI 并不可靠，本页不提供，请自行对照判断。
          </p>
        </div>

        {/* 双栏表单 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}
          className="heming-grid">
          <div style={cardStyle}>
            <span style={labelStyle}>甲方 — A</span>
            <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormA} />
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>乙方 — B</span>
            <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormB} />
          </div>
        </div>

        {/* 对照区 */}
        <div ref={compareRef} style={{ ...cardStyle, padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'var(--tx-3)' }}>双盘对照 · COMPARE</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: chartA && chartB ? '24px' : 0 }}>
            <button
              onClick={() => runCompare()}
              style={{
                padding: '14px 40px', borderRadius: 'var(--r-pill)', border: 'none',
                background: 'linear-gradient(135deg, #9a6210, #c88020)',
                color: '#fff8e8', fontSize: '14px', fontWeight: 600,
                letterSpacing: '0.15em', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(140,100,20,0.25)',
              }}
            >
              {chartA && chartB ? '按当前信息重新起盘' : '起盘对照'}
            </button>
            {formError && (
              <div style={{ marginTop: '20px', fontSize: '13px', color: '#dc2626' }}>{formError}</div>
            )}
          </div>

          {chartA && chartB && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                <thead>
                  <tr>
                    <th style={{ ...cellStyle, borderTop: 'none', color: 'var(--tx-3)', textAlign: 'left', width: '90px' }}>宫位</th>
                    <th style={{ ...cellStyle, borderTop: 'none', color: 'var(--ac)', textAlign: 'left' }}>
                      甲方 A{hourNote(chartA)}
                    </th>
                    <th style={{ ...cellStyle, borderTop: 'none', color: 'var(--ac)', textAlign: 'left' }}>
                      乙方 B{hourNote(chartB)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...cellStyle, color: 'var(--tx-3)' }}>五行局</td>
                    <td style={cellStyle}>{chartA.wuxingJuName}</td>
                    <td style={cellStyle}>{chartB.wuxingJuName}</td>
                  </tr>
                  {COMPARE_PALACES.map(name => {
                    const pA = findPalace(chartA, name);
                    const pB = findPalace(chartB, name);
                    return (
                      <tr key={name}>
                        <td style={{ ...cellStyle, color: 'var(--tx-3)' }}>{name}</td>
                        <td style={cellStyle}>
                          {pA ? `${BRANCHES[pA.branch]}｜` : ''}{palaceStars(pA)}
                        </td>
                        <td style={cellStyle}>
                          {pB ? `${BRANCHES[pB.branch]}｜` : ''}{palaceStars(pB)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--tx-3)', lineHeight: 1.7 }}>
                以上全部由排盘引擎直接给出，没有经过 AI。单张盘的规则解读可以分别到「排盘」页（/chart）查看。
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .heming-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
