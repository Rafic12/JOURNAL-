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
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Veuillez entrer un email valide');
      return;
    }

    setLoading(true);
    // Simulate network request to send OTP
    await new Promise(r => setTimeout(r, 1000));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setToastMessage(`🔑 Code de connexion sécurisé envoyé !`);
    setStep('otp');
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Veuillez entrer le code de 6 chiffres');
      return;
    }

    if (otp !== generatedOtp) {
      setError('Code incorrect. Veuillez réessayer.');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const user: AuthUser = {
      email,
      name: email.split('@')[0],
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
          {toastMessage && (
            <div style={{
              position: 'fixed', top: 24, right: 24, zIndex: 1000,
              background: 'rgba(7, 11, 9, 0.95)', border: '2px solid var(--accent)',
              borderRadius: 12, padding: '16px 20px', color: '#fff',
              boxShadow: '0 8px 32px rgba(0, 230, 118, 0.25)', backdropFilter: 'blur(8px)',
              maxWidth: 350, animation: 'fadeIn 0.3s ease-out'
            }}>
              <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, marginBottom: 4 }}>🔑 OTP Généré !</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Voici votre code de connexion sécurisé :
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, margin: '8px 0', color: '#fff', textAlign: 'center', fontFamily: 'monospace' }}>
                {generatedOtp}
              </p>
              <button 
                onClick={() => setToastMessage(null)}
                style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Fermer la notification
              </button>
            </div>
          )}

          <div className="login-form-wrapper">
            <div className="login-form-header">
              <h2 className="login-form-title">
                {step === 'email' ? 'Connexion Sécurisée' : 'Vérification OTP'}
              </h2>
              <p className="login-form-subtitle">
                {step === 'email'
                  ? 'Entrez votre email pour recevoir votre code temporaire'
                  : `Saisissez le code à 6 chiffres envoyé à ${email}`}
              </p>
            </div>

            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="login-form">
                <div className="login-field">
                  <label className="label">Adresse Email</label>
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
                      required
                    />
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
                      Recevoir le code OTP
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="login-form">
                <div className="login-field">
                  <label className="label">Code de validation (6 chiffres)</label>
                  <div className="login-input-wrapper">
                    <Lock size={16} className="login-input-icon" />
                    <input
                      className="input"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      style={{ paddingLeft: 40, letterSpacing: 6, fontSize: 18, fontWeight: 700 }}
                      required
                    />
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
                      Valider et se connecter
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  style={{ marginTop: 12, display: 'flex', justifyContent: 'center', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Retour
                </button>
              </form>
            )}

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
          </div>
        </div>
      </div>
    </div>
  );
}

export { getStoredUser, AUTH_KEY };
export type { AuthUser };
