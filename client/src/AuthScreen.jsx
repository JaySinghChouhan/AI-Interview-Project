import { useState } from 'react';
import './AuthScreen.css';

export default function AuthScreen({ busy, error, onSubmit, onClearError }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const isRegister = mode === 'register';

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (isRegister && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    await onSubmit({ mode, name, email, password });
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setFormError('');
    onClearError();
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase-inner">
          <div className="auth-brand">
            <span className="auth-brand-mark">✦</span>
            <span>interviewly<span className="auth-brand-dot">.</span></span>
          </div>
          <div className="auth-hero-copy">
            <span className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h1>Show up ready<br />for what’s next.</h1>
            <p>Practice real interview questions, find your strongest stories, and walk into the room with a plan.</p>
            <div className="auth-benefits">
              <span><i>✓</i> Practice tailored to your role</span>
              <span><i>✓</i> Clear feedback to keep improving</span>
              <span><i>✓</i> Your own private practice space</span>
            </div>
          </div>
          <div className="auth-showcase-footer"><span>PREPARE WITH PURPOSE</span><span>INTERVIEWLY © 2026</span></div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">✦</span>
            <span>interviewly<span className="auth-brand-dot">.</span></span>
          </div>
          <div className="auth-card">
            <div className="auth-card-heading">
              <span className="auth-card-icon">✦</span>
              <p className="auth-eyebrow">{isRegister ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</p>
              <h2>{isRegister ? 'Start preparing' : 'Sign in to Interviewly'}</h2>
              <p>{isRegister ? 'Create your account and take the first step.' : 'Your next great interview starts with a little practice.'}</p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="Account action">
              <button type="button" className={!isRegister ? 'selected' : ''} onClick={() => changeMode('login')} role="tab" aria-selected={!isRegister}>Sign in</button>
              <button type="button" className={isRegister ? 'selected' : ''} onClick={() => changeMode('register')} role="tab" aria-selected={isRegister}>Create account</button>
            </div>

            {(error || formError) && <div className="auth-error" role="alert">{formError || error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegister && (
                <label className="auth-field">
                  <span>Full name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" minLength={2} maxLength={80} required />
                </label>
              )}
              <label className="auth-field">
                <span>Email address</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" maxLength={254} required />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength={8} maxLength={72} required />
              </label>
              {isRegister && (
                <label className="auth-field">
                  <span>Confirm password</span>
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Enter your password again" minLength={8} maxLength={72} required />
                </label>
              )}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
                {!busy && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="auth-privacy">Your account is protected with a secure, private session.</p>
          </div>
          <p className="auth-help">Need help? <a href="mailto:support@interviewly.app">Contact support</a></p>
        </div>
      </section>
    </main>
  );
}
