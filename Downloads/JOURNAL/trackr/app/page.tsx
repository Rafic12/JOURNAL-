'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { calculateKPIs, calculateEquityCurve, getDistributionByField } from '@/lib/calculations';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useLivePrices } from '@/lib/useLivePrices';
import { Activity, TrendingUp, TrendingDown, Target, Flame, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import Link from 'next/link';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
}

function formatCurrencyDetailed(val: number): string {
  return `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
}

function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

function formatNumber(val: number): string {
  return val.toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="value" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name !== 'Trades' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { getFilteredTrades, state } = useStore();
  const trades = getFilteredTrades();

  const kpis = useMemo(() => calculateKPIs(trades), [trades]);

  const activeAccount = state.accounts.find(a => a.id === state.activeAccountId);
  const initialBalance = activeAccount?.balanceInitial || 10000;

  const equityCurve = useMemo(() => calculateEquityCurve(trades, initialBalance), [trades, initialBalance]);
  const directionDist = useMemo(() => getDistributionByField(trades, 'direction'), [trades]);

  // Derived values for the donuts
  const longCount = directionDist.find(d => d.label === 'long')?.count || 0;
  const shortCount = directionDist.find(d => d.label === 'short')?.count || 0;
  const totalDirectionCount = longCount + shortCount;

  // Active trades logic
  const openTrades = useMemo(() => trades.filter(t => t.status === 'open'), [trades]);
  const activeSymbols = useMemo(() => [...new Set(openTrades.map(t => t.symbol))], [openTrades]);
  const livePrices = useLivePrices(activeSymbols, state.apiKeys);

  // Recent closed trades (last 5)
  const recentTrades = useMemo(() => {
    return trades
      .filter(t => t.status === 'closed' && t.closeTime)
      .sort((a, b) => new Date(b.closeTime!).getTime() - new Date(a.closeTime!).getTime())
      .slice(0, 5);
  }, [trades]);

  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = useMemo(() => {
    return trades.filter(t => t.status === 'closed' && t.closeTime && t.closeTime.startsWith(todayStr));
  }, [trades, todayStr]);
  const todayPnL = todayTrades.reduce((s, t) => s + t.profitNet, 0);

  return (
    <div className="dashboard-page">
      
      {/* Welcome Header */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-left">
          <h1 className="dashboard-welcome-title">
            Bonjour{activeAccount ? `, ${activeAccount.name}` : ''} 👋
          </h1>
          <p className="dashboard-welcome-sub">
            {todayTrades.length > 0 
              ? `${todayTrades.length} trade${todayTrades.length > 1 ? 's' : ''} aujourd'hui · ${todayPnL >= 0 ? '+' : ''}${formatCurrency(todayPnL)}`
              : `${kpis.totalTrades} trades au total · Commencez votre session`
            }
          </p>
        </div>
        <div className="dashboard-welcome-right">
          <div className="dashboard-total-pnl">
            <span className="dashboard-total-label">P&L Total</span>
            <span className={`dashboard-total-value ${kpis.totalPnL >= 0 ? 'win' : 'loss'}`}>
              {kpis.totalPnL >= 0 ? '+' : ''}{formatCurrency(kpis.totalPnL)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Trades (Real-Time) */}
      {openTrades.length > 0 && (
        <div className="dashboard-section">
          <h3 className="dashboard-section-title">
            <Activity size={18} className="text-accent" /> Positions en cours ({openTrades.length})
          </h3>
          <div className="dashboard-active-trades">
            {openTrades.map(trade => {
              const currentPrice = livePrices[trade.symbol] || trade.openPrice;
              const diff = trade.direction === 'long' ? (currentPrice - trade.openPrice) : (trade.openPrice - currentPrice);
              const multiplier = trade.multiplier || state.symbolSettings?.[trade.symbol]?.multiplier || 100000;
              const pnl = diff * trade.volume * multiplier;
              const isProfit = pnl >= 0;

              return (
                <div key={trade.id} className="active-trade-card" style={{ borderLeftColor: isProfit ? 'var(--win)' : 'var(--loss)' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{trade.symbol}</span>
                    <span className={`badge badge-${trade.direction}`}>{trade.direction.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trade.volume} Lots</p>
                      <p className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        In: {trade.openPrice} <br/>
                        Now: <span style={{ color: currentPrice !== trade.openPrice ? 'var(--text-primary)' : 'var(--text-muted)' }}>{currentPrice.toFixed(5)}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>P&L (Live)</p>
                      <p className={`mono ${isProfit ? 'text-win' : 'text-loss'}`} style={{ fontSize: 18, fontWeight: 700 }}>
                        {formatCurrency(pnl)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards — 3 premium cards */}
      <div className="dashboard-kpi-grid">
        {/* Win Rate */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-icon" style={{ background: 'var(--win-bg)' }}>
              <Target size={18} style={{ color: 'var(--win)' }} />
            </div>
            <span className="kpi-card-label">WIN RATE</span>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--win)' }}>
            {formatPercent(kpis.winRate)}
          </div>
          <div className="kpi-progress-bar">
            <div 
              className="kpi-progress-fill" 
              style={{ 
                width: `${Math.min(kpis.winRate, 100)}%`,
                background: 'var(--win)'
              }} 
            />
          </div>
          <div className="kpi-card-detail">
            <span>{kpis.totalWins}W / {kpis.totalLosses}L</span>
            <span>{kpis.totalTrades} trades</span>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
              <TrendingUp size={18} style={{ color: 'var(--purple)' }} />
            </div>
            <span className="kpi-card-label">PROFIT FACTOR</span>
          </div>
          <div className="kpi-card-value" style={{ color: kpis.profitFactor >= 1 ? 'var(--win)' : 'var(--loss)' }}>
            {kpis.profitFactor === Infinity ? '∞' : formatNumber(kpis.profitFactor)}
          </div>
          <div className="kpi-progress-bar">
            <div 
              className="kpi-progress-fill" 
              style={{ 
                width: `${Math.min(kpis.profitFactor * 25, 100)}%`,
                background: kpis.profitFactor >= 1 ? 'var(--purple)' : 'var(--loss)'
              }} 
            />
          </div>
          <div className="kpi-card-detail">
            <span>Avg Win: {formatCurrency(kpis.avgWin)}</span>
            <span>Avg Loss: {formatCurrency(kpis.avgLoss)}</span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-icon" style={{ background: 'var(--loss-bg)' }}>
              <TrendingDown size={18} style={{ color: 'var(--loss)' }} />
            </div>
            <span className="kpi-card-label">MAX DRAWDOWN</span>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(-kpis.maxDrawdown)}
          </div>
          <div className="kpi-progress-bar">
            <div 
              className="kpi-progress-fill" 
              style={{ 
                width: `${Math.min(kpis.maxDrawdownPercent, 100)}%`,
                background: 'var(--loss)'
              }} 
            />
          </div>
          <div className="kpi-card-detail">
            <span>{formatPercent(kpis.maxDrawdownPercent)} du peak</span>
            <span>Streak: {kpis.maxWinStreak}W / {kpis.maxLossStreak}L</span>
          </div>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="dashboard-equity-card">
        <div className="dashboard-equity-header">
          <div>
            <h3 className="dashboard-equity-title">Courbe d&apos;equity</h3>
            <p className="dashboard-equity-sub">P&amp;L cumulé · {kpis.totalTrades} trades</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={`dashboard-equity-value ${kpis.totalPnL >= 0 ? 'win' : 'loss'}`}>
              {kpis.totalPnL >= 0 ? '+' : ''}{formatCurrency(kpis.totalPnL)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cumul total</p>
          </div>
        </div>
        <div className="dashboard-equity-chart">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={equityCurve} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18251d" vertical={false} />
              <XAxis hide dataKey="date" />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="var(--accent)"
                strokeWidth={3}
                fill="url(#equityGradient)"
                name="Equity"
                style={{ filter: 'url(#glow)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donuts + Recent Trades Row */}
      <div className="dashboard-bottom-grid">
        {/* Win / Loss Donut */}
        <div className="dashboard-donut-card">
          <h3 className="dashboard-donut-title">Win / Loss</h3>
          <div className="dashboard-donut-content">
            <div className="dashboard-donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Gains', value: kpis.totalWins },
                      { name: 'Pertes', value: kpis.totalLosses }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={62}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={0}
                  >
                    <Cell fill="var(--accent)" />
                    <Cell fill="#ff4757" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-donut-center">
                <span className="dashboard-donut-center-value">{formatPercent(kpis.winRate)}</span>
                <span className="dashboard-donut-center-label">WIN RATE</span>
              </div>
            </div>
            <div className="dashboard-donut-legend">
              <div className="dashboard-donut-legend-item">
                <div className="flex items-center gap-3">
                  <div className="dashboard-donut-dot" style={{ background: 'var(--accent)' }} />
                  <span>Gains</span>
                </div>
                <span className="dashboard-donut-legend-value">{kpis.totalWins}</span>
              </div>
              <div className="dashboard-donut-legend-item">
                <div className="flex items-center gap-3">
                  <div className="dashboard-donut-dot" style={{ background: '#ff4757' }} />
                  <span>Pertes</span>
                </div>
                <span className="dashboard-donut-legend-value">{kpis.totalLosses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Long / Short Donut */}
        <div className="dashboard-donut-card">
          <h3 className="dashboard-donut-title">Long / Short</h3>
          <div className="dashboard-donut-content">
            <div className="dashboard-donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Long', value: longCount },
                      { name: 'Short', value: shortCount }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={62}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={0}
                  >
                    <Cell fill="var(--accent)" />
                    <Cell fill="#ff4757" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-donut-center">
                <span className="dashboard-donut-center-value">{totalDirectionCount}</span>
                <span className="dashboard-donut-center-label">TRADES</span>
              </div>
            </div>
            <div className="dashboard-donut-legend">
              <div className="dashboard-donut-legend-item">
                <div className="flex items-center gap-3">
                  <div className="dashboard-donut-dot" style={{ background: 'var(--accent)' }} />
                  <span>Long</span>
                </div>
                <span className="dashboard-donut-legend-value">{longCount}</span>
              </div>
              <div className="dashboard-donut-legend-item">
                <div className="flex items-center gap-3">
                  <div className="dashboard-donut-dot" style={{ background: '#ff4757' }} />
                  <span>Short</span>
                </div>
                <span className="dashboard-donut-legend-value">{shortCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="dashboard-recent-card">
          <div className="dashboard-recent-header">
            <h3 className="dashboard-donut-title">Derniers trades</h3>
            <Link href="/journal" className="dashboard-recent-link">
              Voir tout →
            </Link>
          </div>
          {recentTrades.length === 0 ? (
            <div className="dashboard-recent-empty">
              <Clock size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p>Aucun trade terminé</p>
            </div>
          ) : (
            <div className="dashboard-recent-list">
              {recentTrades.map(trade => (
                <div key={trade.id} className="dashboard-recent-item">
                  <div className="dashboard-recent-item-left">
                    <div className="dashboard-recent-item-icon" style={{ 
                      background: trade.profitNet >= 0 ? 'var(--win-bg)' : 'var(--loss-bg)'
                    }}>
                      {trade.profitNet >= 0 
                        ? <ArrowUpRight size={14} style={{ color: 'var(--win)' }} />
                        : <ArrowDownRight size={14} style={{ color: 'var(--loss)' }} />
                      }
                    </div>
                    <div>
                      <span className="dashboard-recent-item-symbol">{trade.symbol}</span>
                      <span className="dashboard-recent-item-date">
                        {trade.closeTime ? formatDate(trade.closeTime) : ''} · {trade.closeTime ? formatTime(trade.closeTime) : ''}
                      </span>
                    </div>
                  </div>
                  <div className="dashboard-recent-item-right">
                    <span className={`dashboard-recent-item-pnl ${trade.profitNet >= 0 ? 'win' : 'loss'}`}>
                      {formatCurrencyDetailed(trade.profitNet)}
                    </span>
                    <span className={`badge badge-${trade.direction}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
