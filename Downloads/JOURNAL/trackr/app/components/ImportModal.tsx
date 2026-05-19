'use client';

import { useState, useRef, DragEvent } from 'react';
import { useStore } from '@/lib/store';
import { parseCSV } from '@/lib/csv-parser';
import { Upload, X, FileText, Check, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportModal({ open, onClose }: ImportModalProps) {
  const { state, addTrades } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<{
    trades: number;
    broker: string;
    errors: string[];
  } | null>(null);
  const [accountId, setAccountId] = useState(state.activeAccountId || state.accounts[0]?.id || '');
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [parsedTrades, setParsedTrades] = useState<ReturnType<typeof parseCSV> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const processFile = async (f: File) => {
    setFile(f);
    const text = await f.text();
    const parsed = parseCSV(text, accountId);
    setParsedTrades(parsed);
    setStep('preview');
  };

  const handleImport = () => {
    if (parsedTrades && parsedTrades.trades.length > 0) {
      // Update account IDs to selected
      const trades = parsedTrades.trades.map(t => ({ ...t, accountId }));
      addTrades(trades);
      setResult({
        trades: trades.length,
        broker: parsedTrades.broker,
        errors: parsedTrades.errors,
      });
      setStep('done');
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setStep('upload');
    setParsedTrades(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'upload' && '📂 Importer des Trades'}
            {step === 'preview' && '📋 Aperçu des données'}
            {step === 'done' && '✅ Import terminé'}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'upload' && (
            <>
              <div className="form-group">
                <label className="label">Compte de destination</label>
                <select
                  className="select"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                >
                  {state.accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div
                className={`dropzone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={40} className="dropzone-icon" />
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Glissez votre fichier CSV ici
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ou cliquez pour parcourir • MT4, MT5, Tradovate, NinjaTrader, cTrader
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
              </div>
            </>
          )}

          {step === 'preview' && parsedTrades && (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <p style={{ fontWeight: 600 }}>{file?.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Broker détecté : <span style={{ color: 'var(--accent)' }}>{parsedTrades.broker.toUpperCase()}</span>
                    {' • '}{parsedTrades.trades.length} trades trouvés
                  </p>
                </div>
              </div>

              {parsedTrades.errors.length > 0 && (
                <div style={{
                  background: 'var(--loss-bg)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: 12, marginBottom: 16
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <AlertCircle size={16} style={{ color: 'var(--loss)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--loss)' }}>
                      {parsedTrades.errors.length} avertissement(s)
                    </span>
                  </div>
                  {parsedTrades.errors.slice(0, 5).map((err, i) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{err}</p>
                  ))}
                </div>
              )}

              {parsedTrades.trades.length > 0 && (
                <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Symbole</th>
                        <th>Direction</th>
                        <th>Volume</th>
                        <th>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTrades.trades.slice(0, 20).map((t, i) => (
                        <tr key={i}>
                          <td className="mono">{t.symbol}</td>
                          <td>
                            <span className={`badge badge-${t.direction}`}>
                              {t.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="mono">{t.volume}</td>
                          <td className={`mono ${t.profitNet >= 0 ? 'text-win' : 'text-loss'}`}>
                            {t.profitNet >= 0 ? '+' : ''}{t.profitNet.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedTrades.trades.length > 20 && (
                    <p style={{ textAlign: 'center', padding: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      ... et {parsedTrades.trades.length - 20} autres trades
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{
                width: 56, height: 56, background: 'var(--win-bg)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Check size={28} style={{ color: 'var(--win)' }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {result.trades} trades importés
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Format : {result.broker.toUpperCase()}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'preview' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('upload')}>Retour</button>
              <button
                className="btn btn-accent"
                onClick={handleImport}
                disabled={!parsedTrades || parsedTrades.trades.length === 0}
              >
                Importer {parsedTrades?.trades.length || 0} trades
              </button>
            </>
          )}
          {step === 'done' && (
            <button className="btn btn-primary" onClick={handleClose}>Fermer</button>
          )}
        </div>
      </div>
    </div>
  );
}
