'use client';

import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Trade } from '@/lib/types';
import { Search, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, Camera, X, Image as ImageIcon, Plus } from 'lucide-react';

function formatCurrency(val: number): string {
  return `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
}

type SortKey = 'closeTime' | 'symbol' | 'direction' | 'profitNet' | 'volume';

export default function JournalPage() {
  const { getFilteredTrades, state, deleteTrade, updateTrade, addTrades } = useStore();
  const trades = getFilteredTrades();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('closeTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStrategy, setFilterStrategy] = useState<string>('');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTradeId, setUploadingTradeId] = useState<string | null>(null);

  // Add Trade Modal State
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({
    symbol: 'EURUSD',
    direction: 'long' as 'long' | 'short',
    status: 'closed' as 'open' | 'closed',
    openTime: new Date().toISOString().slice(0, 16),
    closeTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    openPrice: 0,
    closePrice: 0,
    volume: 1,
    multiplier: 100000,
    profitNet: 0,
  });

  const symbols = useMemo(() => [...new Set(trades.map(t => t.symbol))].sort(), [trades]);

  const filtered = useMemo(() => {
    let result = [...trades];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        t.symbol.toLowerCase().includes(s) ||
        t.ticketId.includes(s) ||
        t.notes.toLowerCase().includes(s)
      );
    }

    if (filterStrategy) result = result.filter(t => t.strategyId === filterStrategy);
    if (filterSymbol) result = result.filter(t => t.symbol === filterSymbol);
    if (filterDirection) result = result.filter(t => t.direction === filterDirection);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'closeTime') {
        const t1 = a.closeTime ? new Date(a.closeTime).getTime() : Date.now();
        const t2 = b.closeTime ? new Date(b.closeTime).getTime() : Date.now();
        cmp = t1 - t2;
      }
      else if (sortKey === 'profitNet') cmp = a.profitNet - b.profitNet;
      else if (sortKey === 'volume') cmp = a.volume - b.volume;
      else cmp = (a[sortKey] as string).localeCompare(b[sortKey] as string);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [trades, search, sortKey, sortDir, filterStrategy, filterSymbol, filterDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return null;
    return sortDir === 'desc'
      ? <ChevronDown size={14} style={{ opacity: 0.7 }} />
      : <ChevronUp size={14} style={{ opacity: 0.7 }} />;
  };

  const getTagsForTrade = (trade: Trade) =>
    state.tags.filter(t => trade.tagIds.includes(t.id));

  const getStrategyName = (id: string | null) =>
    state.strategies.find(s => s.id === id)?.name || '—';

  const handleSaveNote = (tradeId: string) => {
    updateTrade(tradeId, { notes: noteText });
    setEditingNote(null);
    setNoteText('');
  };

  // Screenshot handling
  const handleScreenshotUpload = (tradeId: string) => {
    setUploadingTradeId(tradeId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTradeId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (PNG, JPG, etc.)');
      return;
    }

    // Max 2MB to avoid localStorage bloat
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateTrade(uploadingTradeId, { imageUrl: dataUrl });
      setUploadingTradeId(null);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handleRemoveScreenshot = (tradeId: string) => {
    updateTrade(tradeId, { imageUrl: null });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Journal</h1>
            <p className="page-subtitle">
              {filtered.length} trades
              {filtered.length !== trades.length && ` (${trades.length} total)`}
            </p>
          </div>
          <button 
            className="btn btn-accent" 
            onClick={() => {
              setNewTrade({
                symbol: 'EURUSD',
                direction: 'long',
                status: 'closed',
                openTime: new Date().toISOString().slice(0, 16),
                closeTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
                openPrice: 0,
                closePrice: 0,
                volume: 1,
                multiplier: 100000,
                profitNet: 0,
              });
              setShowAddTrade(true);
            }}
          >
            <Plus size={16} /> Nouveau Trade
          </button>
        </div>
      </div>

      {/* Hidden file input for screenshots */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Search & Filters */}
      <div style={{ marginBottom: 16 }}>
        <div className="flex gap-2">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Rechercher un symbole, ticket, note..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={showFilters ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          >
            <SlidersHorizontal size={16} />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="filters-bar" style={{ marginTop: 8 }}>
            <select
              className="filter-select"
              value={filterStrategy}
              onChange={e => setFilterStrategy(e.target.value)}
            >
              <option value="">Toutes les stratégies</option>
              {state.strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterSymbol}
              onChange={e => setFilterSymbol(e.target.value)}
            >
              <option value="">Tous les symboles</option>
              {symbols.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterDirection}
              onChange={e => setFilterDirection(e.target.value)}
            >
              <option value="">Long &amp; Short</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>

            {(filterStrategy || filterSymbol || filterDirection) && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setFilterStrategy(''); setFilterSymbol(''); setFilterDirection(''); }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={48} />
          </div>
          <h3 className="empty-state-title">Aucun trade trouvé</h3>
          <p className="empty-state-desc">Importez des trades ou ajustez vos filtres.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('closeTime')}>
                  <span className="flex items-center gap-2">Date <SortIcon field="closeTime" /></span>
                </th>
                <th onClick={() => handleSort('symbol')}>
                  <span className="flex items-center gap-2">Symbole <SortIcon field="symbol" /></span>
                </th>
                <th onClick={() => handleSort('direction')}>
                  <span className="flex items-center gap-2">Direction <SortIcon field="direction" /></span>
                </th>
                <th onClick={() => handleSort('volume')}>
                  <span className="flex items-center gap-2">Volume <SortIcon field="volume" /></span>
                </th>
                <th>Prix Entrée</th>
                <th>Prix Sortie</th>
                <th onClick={() => handleSort('profitNet')}>
                  <span className="flex items-center gap-2">P&L <SortIcon field="profitNet" /></span>
                </th>
                <th>Stratégie</th>
                <th>Tags</th>
                <th>Capture</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(trade => (
                <tr key={trade.id}>
                  <td>
                    {trade.status === 'open' ? (
                      <div>
                        <span className="badge badge-neutral" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>EN COURS</span><br/>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatTime(trade.openTime)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="mono" style={{ fontSize: 13 }}>{trade.closeTime ? formatDate(trade.closeTime) : '-'}</span>
                        <br />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatTime(trade.openTime)} → {trade.closeTime ? formatTime(trade.closeTime) : ''}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 600 }}>{trade.symbol}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${trade.direction}`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="mono">{trade.volume}</td>
                  <td className="mono">{trade.openPrice}</td>
                  <td className="mono">{trade.closePrice !== null ? trade.closePrice : '-'}</td>
                  <td>
                    {trade.status === 'open' ? (
                      <span className="mono text-muted" style={{ fontWeight: 700 }}>
                        -
                      </span>
                    ) : (
                      <span className={`mono ${trade.profitNet >= 0 ? 'text-win' : 'text-loss'}`} style={{ fontWeight: 700 }}>
                        {formatCurrency(trade.profitNet)}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{getStrategyName(trade.strategyId)}</td>
                  <td>
                    <div className="tag-grid">
                      {getTagsForTrade(trade).map(tag => (
                        <span
                          key={tag.id}
                          className="tag-badge"
                          style={{
                            background: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Screenshot Column */}
                  <td>
                    {trade.imageUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={trade.imageUrl}
                          alt="Capture"
                          className="screenshot-thumb"
                          onClick={() => setLightboxImage(trade.imageUrl)}
                        />
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveScreenshot(trade.id)}
                          style={{ padding: 4 }}
                          title="Supprimer la capture"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="screenshot-upload-btn"
                        onClick={() => handleScreenshotUpload(trade.id)}
                        title="Ajouter une capture d'écran"
                      >
                        <Camera size={16} />
                      </button>
                    )}
                  </td>
                  <td>
                    {editingNote === trade.id ? (
                      <div className="flex gap-2">
                        <input
                          className="input"
                          style={{ minWidth: 140, padding: '4px 8px', fontSize: 12 }}
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveNote(trade.id)}
                          autoFocus
                        />
                        <button className="btn btn-sm btn-accent" onClick={() => handleSaveNote(trade.id)}>OK</button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: trade.notes ? 'var(--text-secondary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                        onClick={() => { setEditingNote(trade.id); setNoteText(trade.notes); }}
                        title={trade.notes || 'Cliquez pour ajouter une note'}
                      >
                        {trade.notes || '+ Note'}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm('Supprimer ce trade ?')) deleteTrade(trade.id);
                      }}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p style={{ textAlign: 'center', padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Affichage des 100 premiers trades sur {filtered.length}
            </p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Capture agrandie"
            className="lightbox-image"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div className="modal-overlay" onClick={() => setShowAddTrade(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2"><Plus size={18} /> Ajouter un trade manuel</h2>
              <button className="modal-close" onClick={() => setShowAddTrade(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Sélectionnez le compte actif dans la barre latérale pour lier ce trade. Compte : <strong>{state.accounts.find(a => a.id === state.activeAccountId)?.name || 'Aucun'}</strong>
                </p>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Statut du Trade</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="status" checked={newTrade.status === 'closed'} onChange={() => setNewTrade({ ...newTrade, status: 'closed' })} />
                    Terminé
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="radio" name="status" checked={newTrade.status === 'open'} onChange={() => setNewTrade({ ...newTrade, status: 'open' })} />
                    En cours
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Symbole</label>
                <input className="input" value={newTrade.symbol} onChange={e => {
                  const sym = e.target.value.toUpperCase();
                  const mult = state.symbolSettings?.[sym]?.multiplier || 100000;
                  setNewTrade({ ...newTrade, symbol: sym, multiplier: mult });
                }} placeholder="Ex: XAUUSD" />
              </div>
              <div className="form-group">
                <label className="label">Direction</label>
                <select className="select" value={newTrade.direction} onChange={e => setNewTrade({ ...newTrade, direction: e.target.value as 'long'|'short' })}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Date d'ouverture</label>
                <input type="datetime-local" className="input" value={newTrade.openTime} onChange={e => setNewTrade({ ...newTrade, openTime: e.target.value })} />
              </div>
              {newTrade.status === 'closed' && (
                <div className="form-group">
                  <label className="label">Date de fermeture</label>
                  <input type="datetime-local" className="input" value={newTrade.closeTime} onChange={e => setNewTrade({ ...newTrade, closeTime: e.target.value })} />
                </div>
              )}

              <div className="form-group">
                <label className="label">Prix d'entrée</label>
                <input type="number" step="any" className="input" value={newTrade.openPrice} onChange={e => setNewTrade({ ...newTrade, openPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              
              {newTrade.status === 'closed' ? (
                <div className="form-group">
                  <label className="label">Prix de sortie</label>
                  <input type="number" step="any" className="input" value={newTrade.closePrice} onChange={e => setNewTrade({ ...newTrade, closePrice: parseFloat(e.target.value) || 0 })} />
                </div>
              ) : (
                <div className="form-group">
                  <label className="label">Multiplicateur (Valeur du point)</label>
                  <input type="number" step="any" className="input" value={newTrade.multiplier} onChange={e => setNewTrade({ ...newTrade, multiplier: parseFloat(e.target.value) || 1 })} />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Ex: 100000 pour EURUSD, 10 pour US30.</p>
                </div>
              )}

              <div className="form-group">
                <label className="label">Volume (Lots)</label>
                <input type="number" step="0.01" className="input" value={newTrade.volume} onChange={e => setNewTrade({ ...newTrade, volume: parseFloat(e.target.value) || 0 })} />
              </div>
              {newTrade.status === 'closed' && (
                <div className="form-group">
                  <label className="label">Profit Net ($)</label>
                  <input type="number" step="any" className="input" value={newTrade.profitNet} onChange={e => setNewTrade({ ...newTrade, profitNet: parseFloat(e.target.value) || 0 })} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddTrade(false)}>Annuler</button>
              <button 
                className="btn btn-accent" 
                onClick={() => {
                  if (!state.activeAccountId) return alert("Veuillez sélectionner un compte actif");
                  addTrades([{
                    id: Math.random().toString(36).substr(2, 9),
                    accountId: state.activeAccountId,
                    ticketId: `MANUAL-${Math.floor(Math.random()*10000)}`,
                    symbol: newTrade.symbol,
                    direction: newTrade.direction,
                    status: newTrade.status,
                    openTime: new Date(newTrade.openTime).toISOString(),
                    closeTime: newTrade.status === 'closed' ? new Date(newTrade.closeTime).toISOString() : null,
                    openPrice: newTrade.openPrice,
                    closePrice: newTrade.status === 'closed' ? newTrade.closePrice : null,
                    volume: newTrade.volume,
                    multiplier: newTrade.multiplier,
                    profitGross: newTrade.status === 'closed' ? newTrade.profitNet : 0,
                    commission: 0,
                    swap: 0,
                    profitNet: newTrade.status === 'closed' ? newTrade.profitNet : 0,
                    strategyId: null,
                    tagIds: [],
                    notes: '',
                    imageUrl: null,
                    rMultiple: null
                  }]);
                  setShowAddTrade(false);
                }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
