'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { calculateKPIs, calculateEquityCurve } from '@/lib/calculations';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GitCompare, TrendingUp, TrendingDown, Target, ShieldAlert, SlidersHorizontal } from 'lucide-react';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function BacktestPage() {
  const { state } = useStore();
  const [accId1, setAccId1] = useState<string>(state.accounts[1]?.id || state.accounts[0]?.id || '');
  const [accId2, setAccId2] = useState<string>(state.accounts[0]?.id || '');

  const acc1 = state.accounts.find(a => a.id === accId1);
  const acc2 = state.accounts.find(a => a.id === accId2);

  const trades1 = state.trades.filter(t => t.accountId === accId1);
  const trades2 = state.trades.filter(t => t.accountId === accId2);

  const kpis1 = calculateKPIs(trades1);
  const kpis2 = calculateKPIs(trades2);

  // Normalize data for chart (by trade index to compare paths side by side)
  const eq1 = calculateEquityCurve(trades1, acc1?.balanceInitial || 0);
  const eq2 = calculateEquityCurve(trades2, acc2?.balanceInitial || 0);
  const maxLen = Math.max(eq1.length, eq2.length);
  const chartData = Array.from({ length: maxLen }).map((_, i) => {
    return {
      index: i,
      acc1Balance: eq1[i] ? eq1[i].equity : (eq1.length > 0 ? eq1[eq1.length-1].equity : (acc1?.balanceInitial || 0)),
      acc2Balance: eq2[i] ? eq2[i].equity : (eq2.length > 0 ? eq2[eq2.length-1].equity : (acc2?.balanceInitial || 0)),
    };
  });

  const getDiffBadge = (val1: number, val2: number, inverse = false, isPct = false) => {
    if (val1 === 0 && val2 === 0) return null;
    const diff = val2 - val1;
    if (diff === 0) return <span className="badge badge-neutral">Égal</span>;
    
    // For things like Drawdown, negative diff (lower drawdown) is better, so inverse=true
    const isBetter = inverse ? diff < 0 : diff > 0;
    
    return (
      <span className={`badge ${isBetter ? 'badge-win' : 'badge-loss'}`}>
        {diff > 0 ? '+' : ''}{isPct ? diff.toFixed(1) : diff.toFixed(2)}{isPct ? '%' : ''}
      </span>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <GitCompare size={28} className="text-accent" />
          Backtest vs Live
        </h1>
        <p className="page-subtitle">Comparez vos performances psychologiques entre deux comptes</p>
      </div>

      <div className="filters-bar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
        <div>
          <label className="label">Compte de Référence (ex: Démo)</label>
          <select className="select" value={accId1} onChange={e => setAccId1(e.target.value)}>
            <option value="">Sélectionner...</option>
            {state.accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Compte de Comparaison (ex: Live)</label>
          <select className="select" value={accId2} onChange={e => setAccId2(e.target.value)}>
            <option value="">Sélectionner...</option>
            {state.accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
        </div>
      </div>

      {acc1 && acc2 ? (
        <>
          <div className="card" style={{ marginBottom: 24, height: 400 }}>
            <h2 className="card-title mb-4">Évolution du Capital (Par Trade)</h2>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="index" stroke="var(--text-muted)" fontSize={12} tickFormatter={v => `#${v}`} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={v => `$${v}`} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                  formatter={(val: any, name: any) => [formatCurrency(val as number), String(name) === 'acc1Balance' ? acc1.name : acc2.name]}
                  labelFormatter={(l) => `Trade #${l}`}
                />
                <Line type="monotone" dataKey="acc1Balance" name="acc1Balance" stroke="#a3b3aa" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="acc2Balance" name="acc2Balance" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* Win Rate */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4 text-muted">
                <Target size={16} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Win Rate</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc1.name}</p>
                  <p className="mono" style={{ fontSize: 18 }}>{kpis1.winRate.toFixed(1)}%</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc2.name}</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{kpis2.winRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                {getDiffBadge(kpis1.winRate, kpis2.winRate, false, true)}
              </div>
            </div>

            {/* Profit Factor */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4 text-muted">
                <TrendingUp size={16} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Profit Factor</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc1.name}</p>
                  <p className="mono" style={{ fontSize: 18 }}>{kpis1.profitFactor}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc2.name}</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{kpis2.profitFactor}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                {getDiffBadge(kpis1.profitFactor, kpis2.profitFactor)}
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4 text-muted">
                <TrendingDown size={16} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Max Drawdown</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc1.name}</p>
                  <p className="mono" style={{ fontSize: 18 }}>{formatCurrency(kpis1.maxDrawdown)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc2.name}</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(kpis2.maxDrawdown)}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                {/* For drawdown, a larger number is worse, so we reverse the comparison */}
                {getDiffBadge(kpis1.maxDrawdown, kpis2.maxDrawdown, true)}
              </div>
            </div>

            {/* Total PnL */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4 text-muted">
                <ShieldAlert size={16} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Total P&L</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc1.name}</p>
                  <p className={`mono ${kpis1.totalPnL >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 18 }}>
                    {formatCurrency(kpis1.totalPnL)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc2.name}</p>
                  <p className={`mono ${kpis2.totalPnL >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 24, fontWeight: 700 }}>
                    {formatCurrency(kpis2.totalPnL)}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                {getDiffBadge(kpis1.totalPnL, kpis2.totalPnL)}
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4 text-muted">
                <SlidersHorizontal size={16} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Sharpe Ratio</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc1.name}</p>
                  <p className="mono" style={{ fontSize: 18 }}>{kpis1.sharpeRatio.toFixed(2)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc2.name}</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{kpis2.sharpeRatio.toFixed(2)}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                {getDiffBadge(kpis1.sharpeRatio, kpis2.sharpeRatio)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center text-muted py-12">
          Sélectionnez deux comptes pour comparer leurs performances.
        </div>
      )}
    </div>
  );
}
