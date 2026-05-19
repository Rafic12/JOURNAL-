'use client';

import { useStore } from '@/lib/store';
import { User, Palette, Download, Trash2, Shield, Bell, Key, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { state, setTheme, updateSettings, resetData } = useStore();
  const router = useRouter();

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journalplus-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes vos données ? Cette action est irréversible.')) {
      resetData();
      router.push('/');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Gérez vos préférences et vos données</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-3 mb-6">
          <Palette size={20} className="text-accent" />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Apparence</h2>
        </div>
        
        <div className="form-group">
          <label className="label">Thème de l'application</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <button 
              onClick={() => setTheme('green')}
              style={{
                padding: 16, borderRadius: 12, border: '2px solid',
                borderColor: state.theme === 'green' ? '#00e676' : 'var(--border)',
                background: '#070b09', color: '#f0f4f2', textAlign: 'center', cursor: 'pointer'
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00e676', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Trackr Green</span>
            </button>

            <button 
              onClick={() => setTheme('blue')}
              style={{
                padding: 16, borderRadius: 12, border: '2px solid',
                borderColor: state.theme === 'blue' ? '#3b82f6' : 'var(--border)',
                background: '#020617', color: '#f8fafc', textAlign: 'center', cursor: 'pointer'
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Ocean Blue</span>
            </button>

            <button 
              onClick={() => setTheme('desert')}
              style={{
                padding: 16, borderRadius: 12, border: '2px solid',
                borderColor: state.theme === 'desert' ? '#eab308' : 'var(--border)',
                background: '#2d2a26', color: '#fdfbf7', textAlign: 'center', cursor: 'pointer'
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#eab308', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Desert Gold</span>
            </button>

            <button 
              onClick={() => setTheme('light')}
              style={{
                padding: 16, borderRadius: 12, border: '2px solid',
                borderColor: state.theme === 'light' ? '#22c55e' : 'var(--border)',
                background: '#f8fafc', color: '#0f172a', textAlign: 'center', cursor: 'pointer'
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#22c55e', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Clair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-3 mb-6">
          <User size={20} className="text-accent" />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Profil Utilisateur</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="label">Nom d'utilisateur</label>
            <input className="input" defaultValue="Trader Pro" disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="form-group">
            <label className="label">Adresse Email</label>
            <input className="input" defaultValue="trader@journalplus.com" disabled style={{ opacity: 0.7 }} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>* Les informations de profil sont gérées dans la version complète avec base de données.</p>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-3 mb-6">
          <Calculator size={20} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Multiplicateurs par défaut (Pips/Contrats)</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Définit la valeur par défaut pour les nouveaux trades et le calcul en direct.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="label">EURUSD</label>
            <input className="input" type="number" 
              value={state.symbolSettings['EURUSD']?.multiplier || 100000} 
              onChange={e => updateSettings({ symbolSettings: { 'EURUSD': { multiplier: parseFloat(e.target.value) || 100000 } } })} 
            />
          </div>
          <div className="form-group">
            <label className="label">US30</label>
            <input className="input" type="number" 
              value={state.symbolSettings['US30']?.multiplier || 10} 
              onChange={e => updateSettings({ symbolSettings: { 'US30': { multiplier: parseFloat(e.target.value) || 10 } } })} 
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-3 mb-6">
          <Key size={20} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Clés API (Données Live)</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Entrez vos clés pour activer le vrai flux Forex/Indices. Sinon, des données simulées seront utilisées.</p>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="label">Finnhub API Key</label>
          <input className="input" type="password" placeholder="sk_..."
            value={state.apiKeys?.finnhub || ''} 
            onChange={e => updateSettings({ apiKeys: { finnhub: e.target.value } })} 
          />
        </div>
      </div>

      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <div className="flex items-center gap-3 mb-6">
          <Shield size={20} style={{ color: 'var(--loss)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--loss)' }}>Gestion des Données</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Sauvegarde des données</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Téléchargez un fichier JSON contenant tous vos comptes et trades.</p>
            </div>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} /> Exporter
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--loss-bg)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--loss)' }}>Zone de Danger</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supprime définitivement toutes vos données locales.</p>
            </div>
            <button className="btn btn-danger" onClick={handleReset}>
              <Trash2 size={16} /> Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
