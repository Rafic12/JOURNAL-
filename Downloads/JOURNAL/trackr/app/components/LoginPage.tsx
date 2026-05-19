'use client';

import { useState } from 'react';
import { TrendingUp, Lock, Mail, ArrowRight, BarChart3, Target, Zap, ShieldCheck } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';
type Step = 'credentials' | 'otp';

interface LoginPageProps {
  onLoggedIn: () => void;
}

export default function LoginPage({ onLoggedIn }: LoginPageProps) {
  const supabase = createSupabaseBrowser();

  const [mode, setMode] = useState<Mode>('signin');
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setError('');
    setInfo('');
    setOtp('');
    setStep('credentials');
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Veuillez entrer un email valide');
      return;
    }
    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setInfo(`Code de vérification envoyé à ${email}. Vérifiez votre boîte mail.`);
    setStep('otp');
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Veuillez entrer un email valide');
      return;
    }
    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      // If email is not confirmed, propose OTP verification
      if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('confirm')) {
        const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
        if (resendErr) {
          setError(resendErr.message);
        } else {
          setInfo(`Email non vérifié. Un nouveau code a été envoyé à ${email}.`);
          setStep('otp');
        }
        return;
      }
      setError(error.message);
      return;
    }

    onLoggedIn();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Veuillez entrer le code de 6 chiffres');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onLoggedIn();
  }

  async function handleResendOtp() {
    setError('');
    setInfo('');
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo(`Nouveau code envoyé à ${email}.`);
  }

  return (
    <div className="login-page">
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
                <div className="login-feature-icon"><BarChart3 size={20} /></div>
                <div>
                  <p className="login-feature-title">Analytics avancés</p>
                  <p className="login-feature-desc">Visualisez vos performances avec des graphiques professionnels</p>
                </div>
              </div>
              <div className="login-feature">
                <div className="login-feature-icon"><Target size={20} /></div>
                <div>
                  <p className="login-feature-title">KPIs en temps réel</p>
                  <p className="login-feature-desc">Win Rate, Sharpe Ratio, Drawdown, Profit Factor</p>
                </div>
              </div>
              <div className="login-feature">
                <div className="login-feature-icon"><Zap size={20} /></div>
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
            {step === 'credentials' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => { reset(); setMode('signin'); }}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: mode === 'signin' ? 'var(--accent)' : 'transparent',
                      color: mode === 'signin' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 14,
                    }}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => { reset(); setMode('signup'); }}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: mode === 'signup' ? 'var(--accent)' : 'transparent',
                      color: mode === 'signup' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 14,
                    }}
                  >
                    Créer un compte
                  </button>
                </div>

                <div className="login-form-header">
                  <h2 className="login-form-title">
                    {mode === 'signin' ? 'Connexion sécurisée' : 'Créer votre compte'}
                  </h2>
                  <p className="login-form-subtitle">
                    {mode === 'signin'
                      ? 'Entrez votre email et votre mot de passe'
                      : 'Un code de vérification sera envoyé à votre email'}
                  </p>
                </div>

                <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="login-form">
                  <div className="login-field">
                    <label className="label">Adresse email</label>
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

                  <div className="login-field">
                    <label className="label">Mot de passe</label>
                    <div className="login-input-wrapper">
                      <Lock size={16} className="login-input-icon" />
                      <input
                        className="input"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ paddingLeft: 40 }}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        minLength={6}
                        required
                      />
                    </div>
                    {mode === 'signup' && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Au moins 6 caractères
                      </p>
                    )}
                  </div>

                  {error && <div className="login-error">{error}</div>}
                  {info && (
                    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', color: 'var(--accent)', fontSize: 13 }}>
                      {info}
                    </div>
                  )}

                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? <div className="login-spinner" /> : (
                      <>
                        {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="login-form-header">
                  <h2 className="login-form-title">Vérification email</h2>
                  <p className="login-form-subtitle">
                    Saisissez le code à 6 chiffres envoyé à <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="login-form">
                  <div className="login-field">
                    <label className="label">Code de vérification</label>
                    <div className="login-input-wrapper">
                      <ShieldCheck size={16} className="login-input-icon" />
                      <input
                        className="input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        style={{ paddingLeft: 40, letterSpacing: 6, fontSize: 18, fontWeight: 700 }}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && <div className="login-error">{error}</div>}
                  {info && (
                    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', color: 'var(--accent)', fontSize: 13 }}>
                      {info}
                    </div>
                  )}

                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? <div className="login-spinner" /> : (
                      <>
                        Valider le code
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={reset}
                      style={{ flex: 1, padding: 12, borderRadius: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      style={{ flex: 1, padding: 12, borderRadius: 8, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      Renvoyer le code
                    </button>
                  </div>
                </form>
              </>
            )}

            <div className="login-separator">
              <span>ou</span>
            </div>

            <button
              type="button"
              className="login-demo-btn"
              onClick={async () => {
                // Quick demo signup with random credentials (still goes through real Supabase Auth)
                const ts = Date.now();
                const demoEmail = `demo+${ts}@journalplus.app`;
                const demoPwd = `Demo!${ts}`;
                setLoading(true);
                const { error } = await supabase.auth.signUp({ email: demoEmail, password: demoPwd });
                if (!error) {
                  // Auto sign-in (works only if email confirmation is disabled in Supabase Auth settings)
                  const { error: signErr } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPwd });
                  if (!signErr) {
                    onLoggedIn();
                    setLoading(false);
                    return;
                  }
                }
                setLoading(false);
                setError("Compte démo indisponible : activez l'inscription sans confirmation email dans Supabase, ou créez un compte normal.");
              }}
              disabled={loading}
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
