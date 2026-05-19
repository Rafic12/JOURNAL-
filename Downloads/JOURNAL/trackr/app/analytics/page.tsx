'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { calculateKPIs, calculateEquityCurve, getDistributionByField } from '@/lib/calculations';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

interface TooltipPayloadItem { name?: string; value?: number; color?: string; }
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="value" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { getFilteredTrades, state } = useStore();
  const trades = getFilteredTrades();

  const [period, setPeriod] = useState<'all' | '30d' | '90d' | '7d'>('all');

  const filteredTrades = useMemo(() => {
    if (period === 'all') return trades;
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 86400000);
    return trades.filter(t => t.status === 'closed' && t.closeTime && new Date(t.closeTime) >= cutoff);
  }, [trades, period]);

  const kpis = useMemo(() => calculateKPIs(filteredTrades), [filteredTrades]);
  const activeAccount = state.accounts.find(a => a.id === state.activeAccountId);
  const initialBalance = activeAccount?.balanceInitial || 10000;
  const equityCurve = useMemo(() => calculateEquityCurve(filteredTrades, initialBalance), [filteredTrades, initialBalance]);

  // Drawdown curve
  const drawdownData = useMemo(() => equityCurve.map(p => ({ date: p.date, drawdown: -p.drawdown })), [equityCurve]);

  // Strategy performance
  const stratDist = useMemo(() => getDistributionByField(filteredTrades, 'strategyId', state.strategies), [filteredTrades, state.strategies]);

  // Symbol performance
  const symbolDist = useMemo(() => getDistributionByField(filteredTrades, 'symbol'), [filteredTrades]);

  // Hourly performance
  const hourDist = useMemo(() => {
    const dist = getDistributionByField(filteredTrades, 'hour');
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const found = dist.find(d => d.label === `${h}h`);
      hours.push(found || { label: `${h}h`, value: 0, count: 0, winRate: 0 });
    }
    return hours;
  }, [filteredTrades]);

  // Day of week performance
  const dayOrder = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
  const dayDist = useMemo(() => {
    const dist = getDistributionByField(filteredTrades, 'dayOfWeek');
    return dayOrder.map(d => dist.find(item => item.label === d) || { label: d, value: 0, count: 0, winRate: 0 });
  }, [filteredTrades]);

  // Monthly P&L
  const monthlyPnL = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filteredTrades) {
      const d = new Date(t.closeTime!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + t.profitNet);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pnl]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        pnl: parseFloat(pnl.toFixed(2)),
      }));
  }, [filteredTrades]);

  // Radar chart data for day-of-week win rate
  const radarData = dayDist.map(d => ({ day: d.label, winRate: d.winRate, count: d.count }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#14b8a6'];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Analyse approfondie de vos performances</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map(p => (
              <button key={p} className={`btn btn-sm ${period === p ? 'btn-accent' : 'btn-secondary'}`}
                onClick={() => setPeriod(p)}>
                {p === 'all' ? 'Tout' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        <div className="card" style={{ padding: 14 }}>
          <p className="card-title" style={{ fontSize: 10, marginBottom: 2 }}>Trades</p>
          <p className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{kpis.totalTrades}</p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="card-title" style={{ fontSize: 10, marginBottom: 2 }}>Win Rate</p>
          <p className={`mono ${kpis.winRate >= 50 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 20, fontWeight: 700 }}>{kpis.winRate.toFixed(1)}%</p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="card-title" style={{ fontSize: 10, marginBottom: 2 }}>Profit Factor</p>
          <p className={`mono ${kpis.profitFactor >= 1 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 20, fontWeight: 700 }}>
            {kpis.profitFactor === Infinity ? '∞' : kpis.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="card-title" style={{ fontSize: 10, marginBottom: 2 }}>Best Trade</p>
          <p className="mono text-win" style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(kpis.bestTrade)}</p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="card-title" style={{ fontSize: 10, marginBottom: 2 }}>Worst Trade</p>
          <p className="mono text-loss" style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(kpis.worstTrade)}</p>
        </div>
      </div>

      <div className="chart-grid">
        {/* Drawdown Curve */}
        <div className="chart-card chart-grid-full">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Courbe de Drawdown</h3>
            <span className="badge badge-loss">{formatCurrency(-kpis.maxDrawdown)} max</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={drawdownData}>
              <defs>
                <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4757" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ff4757" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11}
                tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="drawdown" stroke="#ff4757" strokeWidth={2} fill="url(#ddGradient)" name="Drawdown" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Strategy */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Performance par Stratégie</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stratDist.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#71717a" fontSize={11} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="label" stroke="#71717a" fontSize={11} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="P&L" radius={[0, 4, 4, 0]}>
                {stratDist.slice(0, 6).map((e, i) => (
                  <Cell key={i} fill={e.value >= 0 ? '#00e676' : '#ff4757'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Symbol */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Performance par Symbole</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={symbolDist.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#71717a" fontSize={11} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="label" stroke="#71717a" fontSize={11} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="P&L" radius={[0, 4, 4, 0]}>
                {symbolDist.slice(0, 8).map((e, i) => (
                  <Cell key={i} fill={e.value >= 0 ? '#00e676' : '#ff4757'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly P&L */}
        <div className="chart-card chart-grid-full">
          <div className="chart-card-header">
            <h3 className="chart-card-title">P&L Mensuel</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyPnL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                {monthlyPnL.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? '#00e676' : '#ff4757'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Hour */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">P&L par Heure</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourDist.filter(h => h.count > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#71717a" fontSize={10} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="P&L" radius={[4, 4, 0, 0]}>
                {hourDist.filter(h => h.count > 0).map((e, i) => (
                  <Cell key={i} fill={e.value >= 0 ? '#00e676' : '#ff4757'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate Radar by Day */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Win Rate par Jour</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="day" stroke="#71717a" fontSize={12} />
              <PolarRadiusAxis stroke="#27272a" fontSize={10} domain={[0, 100]} />
              <Radar name="Win Rate" dataKey="winRate" stroke="#00e676" fill="#00e676" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4" style={{ marginTop: -4 }}>
            {dayDist.map((d, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{d.winRate.toFixed(0)}%</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.count} trades</p>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Breakdown Table */}
        <div className="chart-card chart-grid-full">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Détail par Stratégie</h3>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Stratégie</th>
                  <th>Trades</th>
                  <th>Win Rate</th>
                  <th>P&L</th>
                  <th>Avg Win</th>
                  <th>Avg Loss</th>
                </tr>
              </thead>
              <tbody>
                {stratDist.map((s, i) => {
                  const stratTrades = filteredTrades.filter(t => {
                    if (s.label === 'Sans stratégie') return !t.strategyId;
                    return state.strategies.find(st => st.name === s.label)?.id === t.strategyId;
                  });
                  const wins = stratTrades.filter(t => t.profitNet > 0);
                  const losses = stratTrades.filter(t => t.profitNet < 0);
                  const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.profitNet, 0) / wins.length : 0;
                  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + t.profitNet, 0) / losses.length) : 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.label}</td>
                      <td className="mono">{s.count}</td>
                      <td className={`mono ${s.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{s.winRate.toFixed(1)}%</td>
                      <td className={`mono ${s.value >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontWeight: 700 }}>
                        {s.value >= 0 ? '+' : ''}{formatCurrency(s.value)}
                      </td>
                      <td className="mono text-win">{formatCurrency(avgWin)}</td>
                      <td className="mono text-loss">{formatCurrency(avgLoss)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
