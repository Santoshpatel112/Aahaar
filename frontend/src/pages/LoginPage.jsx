import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';

const loadGoogleScript = () => {
  return new Promise((resolve) => {
    if (window.google) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    document.body.appendChild(script);
  });
};

export default function LoginPage() {
  const { login, googleLogin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);

  const handleGoogleResponse = async (response) => {
    setErrors({});
    const res = await googleLogin(response.credential);
    if (res.success) {
      if (res.data.exists) {
        showToast(`Welcome back, ${res.data.user.firstName}! 🎉`, 'success');
        navigate(res.data.user.isAdmin ? '/admin' : from, { replace: true, state: location.state });
      } else {
        showToast(`Welcome! Please complete your registration details.`, 'info');
        navigate('/register', { state: { googleUser: res.data.user, googleCredential: response.credential } });
      }
    } else {
      showToast(res.error || 'Google Login failed', 'error');
      setErrors({ submit: res.error });
    }
  };

  useEffect(() => {
    let active = true;
    loadGoogleScript().then(() => {
      if (!active) return;
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-login-btn'),
          { theme: 'outline', size: 'large', width: '100%' }
        );
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Min 6 characters';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const result = await login(form.email.trim().toLowerCase(), form.password);
    if (result.success) {
      showToast(`Welcome back, ${result.user.firstName}! 🎉`, 'success');
      navigate(result.user.isAdmin ? '/admin' : from, { replace: true, state: location.state });
    } else {
      showToast(result.error || 'Login failed', 'error');
      setErrors({ submit: result.error });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__bg" />
      <div className="auth-page__glow auth-page__glow--1" />
      <div className="auth-page__glow auth-page__glow--2" />

      {/* Left decorative panel */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '45%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(6,182,212,0.04) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 0,
        pointerEvents: 'none',
      }} className="auth-deco">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>🌾</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
            <span style={{ background: 'linear-gradient(135deg,#f97316,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Aahaar
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 280 }}>
            Fighting hunger, sharing hope.<br />One meal at a time.
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['✅ Verified NGO Network', '🔒 Secure & Private', '📊 Real-time Tracking', '💰 Tax Benefits'].map((txt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {txt}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="auth-card__brand">
          <span className="auth-card__brand-icon">🌾</span>
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Aahaar</span>
        </div>

        <h1 className="auth-card__title">Welcome Back</h1>
        <p className="auth-card__subtitle">Sign in to continue your impact</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-card__fields">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>✉️</span>
                <input
                  name="email" type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  style={{ paddingLeft: 40 }}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">⚠ {errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>🔐</span>
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <span className="form-error">⚠ {errors.password}</span>}
            </div>

            {errors.submit && (
              <div className="auth-error-box">⚠️ {errors.submit}</div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In →'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0 12px 0', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)', opacity: 0.5 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)', opacity: 0.5 }} />
            </div>

            <div id="google-login-btn" style={{ width: '100%', minHeight: 40 }} />
          </div>
        </form>

        <div className="auth-card__footer" style={{ marginTop: 24 }}>
          <span style={{ color: 'var(--text-muted)' }}>New to Aahaar?</span>
          <Link to="/register" className="auth-card__link">Create account →</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </div>

      <style>{`
        @media(max-width:900px) { .auth-deco { display: none !important; } }
      `}</style>
    </div>
  );
}
