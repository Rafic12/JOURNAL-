'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { AccountType } from '@/lib/types';
import { calculateKPIs } from '@/lib/calculations';
import { Wallet, Plus, Pencil, Trash2, X, Check, TrendingUp, TrendingDown, Target, BarChart3, Edit3, PlusCircle } from 'lucide-react';

const ACCOUNT_TYPES: { value: AccountType; label: string; badge: string }[] = [
  { value: 'live', label: 'Live', badge: 'badge-long' },
  { value: 'demo', label: 'Démo', badge: 'badge-neutral' },
  { value: 'prop_phase1', label: 'Prop Phase 1', badge: '' },
  { value: 'prop_phase2', label: 'Prop Phase 2', badge: '' },
  { value: 'prop_funded', label: 'Prop Funded', badge: 'badge-win' },
];

const BROKERS = [
  { id: 'ftmo', name: 'FTMO', domain: 'ftmo.com' },
  { id: 'tft', name: 'The Funded Trader', domain: 'thefundedtraderprogram.com' },
  { id: 'fundingpips', name: 'Funding Pips', domain: 'fundingpips.com' },
  { id: 'topstep', name: 'Topstep', domain: 'topstep.com' },
  { id: 'apex', name: 'Apex Trader Funding', domain: 'apextraderfunding.com' },
  { id: 'myfundedfx', name: 'MyFundedFX', domain: 'myfundedfx.com' },
  { id: 'alpha', name: 'Alpha Capital Group', domain: 'alphacapitalgroup.uk' },
  { id: 'fundednext', name: 'FundedNext', domain: 'fundednext.com' },
  { id: 'e8', name: 'E8 Funding', domain: 'e8funding.com' },
  { id: '5ers', name: 'The 5%ers', domain: 'the5ers.com' },
  { id: 'fidelcrest', name: 'Fidelcrest', domain: 'fidelcrest.com' },
  { id: 'surgetrader', name: 'SurgeTrader', domain: 'surgetrader.com' },
  { id: 'blueguardian', name: 'Blue Guardian', domain: 'blueguardian.com' },
  { id: 'finotive', name: 'Finotive Funding', domain: 'finotivefunding.com' },
  { id: 'trueforex', name: 'True Forex Funds', domain: 'trueforexfunds.com' },
  // Brokers classiques
  { id: 'icmarkets', name: 'IC Markets', domain: 'icmarkets.com' },
  { id: 'pepperstone', name: 'Pepperstone', domain: 'pepperstone.com' },
  { id: 'oanda', name: 'OANDA', domain: 'oanda.com' },
  { id: 'binance', name: 'Binance', domain: 'binance.com' },
  { id: 'bybit', name: 'Bybit', domain: 'bybit.com' },
  { id: 'other', name: 'Autre / Inconnu', domain: '' },
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function ComptesPage() {
  const { state, addAccount, updateAccount, deleteAccount, setActiveAccount } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'live' as AccountType, broker: 'ftmo', balanceInitial: 10000, currency: 'USD' });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateAccount(editingId, form);
      setEditingId(null);
    } else {
      addAccount(form);
    }
    setForm({ name: '', type: 'live', broker: 'ftmo', balanceInitial: 10000, currency: 'USD' });
    setShowForm(false);
  };

  const handleEdit = (acc: typeof state.accounts[0]) => {
    setForm({ name: acc.name, type: acc.type, broker: acc.broker || 'ftmo', balanceInitial: acc.balanceInitial, currency: acc.currency });
    setEditingId(acc.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce compte et tous ses trades ?')) deleteAccount(id);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Comptes</h1>
            <p className="page-subtitle">{state.accounts.length} compte{state.accounts.length > 1 ? 's' : ''} configuré{state.accounts.length > 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-accent" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', type: 'live', broker: 'ftmo', balanceInitial: 10000, currency: 'USD' }); }}>
            <Plus size={16} /> Nouveau compte
          </button>
        </div>
      </div>

      {/* Account Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {state.accounts.map(acc => {
          const accTrades = state.trades.filter(t => t.accountId === acc.id);
          const kpis = calculateKPIs(accTrades);
          const currentBalance = acc.balanceInitial + kpis.totalPnL;
          const returnPct = acc.balanceInitial > 0 ? ((kpis.totalPnL / acc.balanceInitial) * 100) : 0;
          const isActive = state.activeAccountId === acc.id;
          const typeInfo = ACCOUNT_TYPES.find(t => t.value === acc.type);
          const brokerInfo = BROKERS.find(b => b.id === (acc.broker || 'ftmo'));

          return (
            <div key={acc.id} className="card" style={{
              cursor: 'pointer',
              ...(isActive ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent), 0 4px 20px rgba(0,230,118,0.1)' } : {}),
            }} onClick={() => setActiveAccount(acc.id)}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {brokerInfo && brokerInfo.domain ? (
                      <img 
                        src={`https://logo.clearbit.com/${brokerInfo.domain}`} 
                        alt={brokerInfo.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<div style="color: var(--text-muted); font-size: 10px; font-weight: bold; text-align: center;">${brokerInfo.name.substring(0, 3).toUpperCase()}</div>`;
                        }}
                      />
                    ) : (
                      <Wallet size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{acc.name}</h3>
                    <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
                      <span className="badge" style={{
                        background: acc.type.includes('prop') ? 'rgba(139,92,246,0.15)' : acc.type === 'demo' ? 'rgba(113,113,122,0.15)' : 'var(--win-bg)',
                        color: acc.type.includes('prop') ? '#8b5cf6' : acc.type === 'demo' ? 'var(--neutral)' : 'var(--win)',
                      }}>
                        {typeInfo?.label || acc.type}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{brokerInfo?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleEdit(acc); }} style={{ padding: 6 }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} style={{ padding: 6 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Balance actuelle</p>
                <div className="flex items-center gap-3">
                  <p className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(currentBalance)}</p>
                  <span className={`badge ${returnPct >= 0 ? 'badge-win' : 'badge-loss'}`} style={{ color: returnPct >= 0 ? 'var(--win)' : 'var(--loss)', background: returnPct >= 0 ? 'var(--win-bg)' : 'var(--loss-bg)' }}>
                    {returnPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Initial: {formatCurrency(acc.balanceInitial)} • {acc.currency}
                </p>
              </div>

              {/* Mini Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <Target size={14} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} />
                  <p className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{kpis.winRate.toFixed(0)}%</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Win Rate</p>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <BarChart3 size={14} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} />
                  <p className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{kpis.totalTrades}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Trades</p>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <TrendingUp size={14} style={{ margin: '0 auto 4px', color: 'var(--text-muted)' }} />
                  <p className={`mono ${kpis.totalPnL >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontSize: 14, fontWeight: 600 }}>
                    {formatCurrency(kpis.totalPnL)}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>P&L</p>
                </div>
              </div>

              {isActive && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} /> Compte actif
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingId(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                {editingId ? <><Edit3 size={18} /> Modifier le compte</> : <><PlusCircle size={18} /> Nouveau compte</>}
              </h2>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditingId(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">Nom du compte</label>
                <input className="input" placeholder="Ex: Live Principal, FTMO Phase 1..."
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="flex gap-4">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Type de compte</label>
                  <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AccountType })}>
                    {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Broker / Prop Firm</label>
                  <select className="select" value={form.broker} onChange={e => setForm({ ...form, broker: e.target.value })}>
                    {BROKERS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Balance initiale</label>
                  <input className="input" type="number" value={form.balanceInitial}
                    onChange={e => setForm({ ...form, balanceInitial: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group" style={{ width: 120 }}>
                  <label className="label">Devise</label>
                  <select className="select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Annuler</button>
              <button className="btn btn-accent" onClick={handleSubmit} disabled={!form.name.trim()}>
                {editingId ? 'Modifier' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
