'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Lock, Mail, Eye, EyeOff, ArrowRight, BarChart3, Target, Zap } from 'lucide-react';

const AUTH_KEY = 'trackr-auth';

interface AuthUser {
  email: string;
  name: string;
  avatar: string;
}

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (mode === 'register' && !name) {
      setError('Veuillez entrer votre nom');
      return;
    }

    if (password.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setLoading(true);

    // Simulated auth delay
    await new Promise(r => setTimeout(r, 800));

    const user: AuthUser = {
      email,
      name: name || email.split('@')[0],
      avatar: email.charAt(0).toUpperCase(),
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setLoading(false);
    onLogin(user);
  };

  return (
    <div className="login-page">
      {/* Background animated gradient */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
      </div>

      <div className="login-container">
        {/* Left: Branding */}
        <div className="login-branding">
          <div className="login-brand-content">
            <div className="login-logo-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/favicon.ico" alt="Journal+ Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-primary)' }}>
                Journal<span style={{ color: 'var(--accent)' }}>+</span>
              </span>
            </div>
            <h1 className="login-headline">
              Analysez. Optimisez.<br />
              <span className="login-headline-accent">Dominez les marchés.</span>
            </h1>
            <p className="login-subline">
              Le journal de trading professionnel qui transforme vos données en edge.
            </p>

            <div className="login-features">
              <div className="login-feature">
                <div className="login-feature-icon">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="login-feature-title">Analytics avancés</p>
                  <p className="login-feature-desc">Visualisez vos performances avec des graphiques professionnels</p>
                </div>
              </div>
              <div className="login-feature">
                <div className="login-feature-icon">
                  <Target size={20} />
                </div>
                <div>
                  <p className="login-feature-title">KPIs en temps réel</p>
                  <p className="login-feature-desc">Win Rate, Sharpe Ratio, Drawdown, Profit Factor</p>
                </div>
              </div>
              <div className="login-feature">
                <div className="login-feature-icon">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="login-feature-title">Import multi-broker</p>
                  <p className="login-feature-desc">MT4, MT5, Tradovate, NinjaTrader, cTrader</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="login-form-side">
          <div className="login-form-wrapper">
            <div className="login-form-header">
              <h2 className="login-form-title">
                {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
              </h2>
              <p className="login-form-subtitle">
                {mode === 'login'
                  ? 'Connectez-vous pour accéder à votre journal'
                  : 'Commencez à tracker vos performances'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {mode === 'register' && (
                <div className="login-field">
                  <label className="label">Nom complet</label>
                  <div className="login-input-wrapper">
                    <input
                      className="input"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="login-field">
                <label className="label">Email</label>
                <div className="login-input-wrapper">
                  <Mail size={16} className="login-input-icon" />
                  <input
                    className="input"
                    type="email"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ paddingLeft: 40 }}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="label">Mot de passe</label>
                <div className="login-input-wrapper">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="login-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? (
                  <div className="login-spinner" />
                ) : (
                  <>
                    {mode === 'login' ? 'Se connecter' : "S'inscrire"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="login-separator">
              <span>ou</span>
            </div>

            <button
              type="button"
              className="login-demo-btn"
              onClick={() => {
                const user: AuthUser = { email: 'demo@journalplus.app', name: 'Trader Demo', avatar: 'D' };
                localStorage.setItem(AUTH_KEY, JSON.stringify(user));
                onLogin(user);
              }}
            >
              <TrendingUp size={18} />
              Accès démo instantané
            </button>

            <p className="login-switch">
              {mode === 'login' ? (
                <>Pas encore de compte ? <button type="button" onClick={() => { setMode('register'); setError(''); }}>S&apos;inscrire</button></>
              ) : (
                <>Déjà un compte ? <button type="button" onClick={() => { setMode('login'); setError(''); }}>Se connecter</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { getStoredUser, AUTH_KEY };
export type { AuthUser };
