import { useState, Fragment, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';
import LocationSelectFields from '../components/LocationSelectFields';

const STEPS = ['Account Info', 'Personal Details', 'Location', 'Identity Verification'];

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

export default function RegisterPage() {
  const { register, googleLogin, sendOTP, verifyOTP, uploadAadhaar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const googleUser = location?.state?.googleUser || null;
  const [isGoogleReg, setIsGoogleReg] = useState(!!googleUser);
  const [step, setStep] = useState(googleUser ? 1 : 0);

  const [form, setForm] = useState({
    firstName: googleUser?.firstName || '',
    surname: googleUser?.surname || '',
    email: googleUser?.email || '',
    password: '',
    confirmPassword: '',
    age: '',
    phone: '',
    city: '',
    state: '',
    stateCode: '',
    country: 'India',
  });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleGoogleResponse = async (response) => {
    setErrors({});
    const res = await googleLogin(response.credential);
    if (res.success) {
      if (res.data.exists) {
        showToast(`Welcome back, ${res.data.user.firstName}! 🎉`, 'success');
        navigate('/dashboard');
      } else {
        showToast(`Welcome! Please complete your registration details.`, 'info');
        setForm((f) => ({
          ...f,
          email: res.data.user.email,
          firstName: res.data.user.firstName,
          surname: res.data.user.surname,
        }));
        setIsGoogleReg(true);
        setStep(1);
      }
    } else {
      showToast(res.error || 'Google Authentication failed', 'error');
      setErrors({ submit: res.error });
    }
  };

  useEffect(() => {
    if (step === 0 && !isGoogleReg) {
      let active = true;
      loadGoogleScript().then(() => {
        if (!active) return;
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-register-btn'),
            { theme: 'outline', size: 'large', width: '100%' }
          );
        }
      });
      return () => {
        active = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isGoogleReg]);

  const handleSendOTP = async () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Required';
    else if (form.password.length < 6) errs.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setOtpLoading(true);
    setErrors({});
    const res = await sendOTP(form.email.trim().toLowerCase());
    setOtpLoading(false);

    if (res.success) {
      setShowOtpInput(true);
      showToast('Verification OTP code sent to your email.', 'success');
    } else {
      showToast(res.error || 'Failed to send OTP code', 'error');
      setErrors({ email: res.error });
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      setErrors({ otp: 'Required' });
      return;
    }

    setOtpLoading(true);
    setErrors({});
    const res = await verifyOTP(form.email.trim().toLowerCase(), otpCode);
    setOtpLoading(false);

    if (res.success) {
      showToast('Email verified successfully! 🎉', 'success');
      setStep(1);
    } else {
      showToast(res.error || 'OTP verification failed', 'error');
      setErrors({ otp: res.error || 'Invalid OTP' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!form.email.trim()) errs.email = 'Required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
      if (!form.password) errs.password = 'Required';
      else if (form.password.length < 6) errs.password = 'Min 6 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    if (s === 1) {
      if (!form.firstName.trim()) errs.firstName = 'Required';
      if (!form.surname.trim()) errs.surname = 'Required';
      if (!form.age) errs.age = 'Required';
      else if (isNaN(form.age) || +form.age < 16 || +form.age > 100) errs.age = 'Enter a valid age (16–100)';
      if (!form.phone.trim()) errs.phone = 'Required';
      else if (!/^\+?[0-9]{10,15}$/.test(form.phone.replace(/[\s-()]/g, ''))) errs.phone = 'Enter a valid phone number (e.g. +919876543210)';
    }
    if (s === 2) {
      if (!form.state) errs.state = 'Required';
      if (!form.city.trim()) errs.city = 'Required';
    }
    return errs;
  };

  const nextStep = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSkip = async (e) => {
    if (e) e.preventDefault();
    setErrors({});
    setLoading(true);
    const result = await register({
      firstName: form.firstName,
      surname: form.surname,
      email: form.email.trim().toLowerCase(),
      password: isGoogleReg ? (form.password || Math.random().toString(36).slice(-10) + 'A1!') : form.password,
      age: Number(form.age),
      phone: form.phone,
      city: form.city,
      state: form.state,
      country: form.country,
    });
    setLoading(false);
    if (result.success) {
      showToast(`Welcome to Aahaar, ${result.user.firstName}! 🎉`, 'success');
      navigate('/dashboard');
    } else {
      showToast(result.error || 'Registration failed', 'error');
      setErrors({ submit: result.error });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = await register({
      firstName: form.firstName,
      surname: form.surname,
      email: form.email.trim().toLowerCase(),
      password: isGoogleReg ? (form.password || Math.random().toString(36).slice(-10) + 'A1!') : form.password,
      age: Number(form.age),
      phone: form.phone,
      city: form.city,
      state: form.state,
      country: form.country,
    });

    if (result.success) {
      if (aadhaarFile) {
        showToast('Uploading Aadhaar...', 'success');
        const uploadResult = await uploadAadhaar(aadhaarFile, result.user);
        if (uploadResult.success) {
          showToast(`Welcome to Aahaar! Aadhaar uploaded for verification. 🎉`, 'success');
        } else {
          showToast(`Aadhaar upload failed: ${uploadResult.error}. You can retry from your dashboard.`, 'warning');
        }
      } else {
        showToast(`Welcome to Aahaar, ${result.user.firstName}! 🎉`, 'success');
      }
      setLoading(false);
      navigate('/dashboard');
    } else {
      setLoading(false);
      showToast(result.error || 'Registration failed', 'error');
      setErrors({ submit: result.error });
    }
  };

  const pwStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = pwStrength();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'][strength];

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 'calc(var(--navbar-h) + 32px)', paddingBottom: 60 }}>
      <div className="auth-page__bg" />
      <div className="auth-page__glow auth-page__glow--1" />
      <div className="auth-page__glow auth-page__glow--2" />

      <div className="auth-card auth-card--wide" style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
        {/* Header */}
        <div className="auth-card__brand">
          <span className="auth-card__brand-icon">🌾</span>
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Aahaar</span>
        </div>
        <h1 className="auth-card__title">Create Account</h1>
        <p className="auth-card__subtitle">Join thousands fighting hunger across India</p>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {STEPS.map((label, i) => (
            <Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem',
                  border: `2px solid ${i < step ? 'var(--color-green)' : i === step ? 'var(--color-orange)' : 'var(--border-color)'}`,
                  background: i < step ? 'var(--color-green)' : i === step ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: i < step ? '#fff' : i === step ? 'var(--color-orange)' : 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 18,
                  background: i < step ? 'var(--color-green)' : 'var(--border-color)',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Step 0 — Credentials */}
          {step === 0 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" disabled={showOtpInput} />
                {errors.email && <span className="form-error">⚠ {errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="password" type={showPass ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Min 6 characters" value={form.password} onChange={handleChange} style={{ paddingRight: 44 }} disabled={showOtpInput} />
                  <button type="button" onClick={() => setShowPass(!showPass)} disabled={showOtpInput}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4,5].map((n) => (
                        <div key={n} style={{ flex: 1, height: 3, borderRadius: 99, background: n <= strength ? strengthColor : 'var(--border-color)', transition: 'all 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                  </div>
                )}
                {errors.password && <span className="form-error">⚠ {errors.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input name="confirmPassword" type="password"
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} disabled={showOtpInput} />
                {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
              </div>

              {showOtpInput && (
                <div className="form-group" style={{ animation: 'fadeInUp 0.3s ease', marginTop: 12 }}>
                  <label className="form-label">Verification OTP Code (Sent to your email)</label>
                  <input
                    type="text"
                    maxLength={6}
                    className={`form-input ${errors.otp ? 'error' : ''}`}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.trim());
                      if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                    }}
                  />
                  {errors.otp && <span className="form-error">⚠ {errors.otp}</span>}
                </div>
              )}

              {showOtpInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={handleVerifyOTP} className="btn-primary" disabled={otpLoading} style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                    {otpLoading ? <><span className="spinner" /> Verifying...</> : 'Verify Code & Continue →'}
                  </button>
                  <button type="button" onClick={handleSendOTP} className="btn-ghost" disabled={otpLoading} style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                    {otpLoading ? 'Sending...' : 'Resend Email Code'}
                  </button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={handleSendOTP} className="btn-primary" disabled={otpLoading} style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 4 }}>
                    {otpLoading ? <><span className="spinner" /> Sending OTP...</> : 'Verify Email & Continue →'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0 12px 0', gap: 10 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)', opacity: 0.5 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)', opacity: 0.5 }} />
                  </div>

                  <div id="google-register-btn" style={{ width: '100%', minHeight: 40 }} />
                </>
              )}
            </div>
          )}

          {/* Step 1 — Personal */}
          {step === 1 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="auth-card__fields-grid">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input name="firstName" type="text" className={`form-input ${errors.firstName ? 'error' : ''}`}
                    placeholder="Priya" value={form.firstName} onChange={handleChange} disabled={isGoogleReg && googleUser} />
                  {errors.firstName && <span className="form-error">⚠ {errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Surname</label>
                  <input name="surname" type="text" className={`form-input ${errors.surname ? 'error' : ''}`}
                    placeholder="Sharma" value={form.surname} onChange={handleChange} disabled={isGoogleReg && googleUser} />
                  {errors.surname && <span className="form-error">⚠ {errors.surname}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input name="age" type="number" className={`form-input ${errors.age ? 'error' : ''}`}
                  placeholder="25" value={form.age} onChange={handleChange} min={16} max={100} />
                {errors.age && <span className="form-error">⚠ {errors.age}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input name="phone" type="tel" className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="+919876543210" value={form.phone} onChange={handleChange} />
                {errors.phone && <span className="form-error">⚠ {errors.phone}</span>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {!isGoogleReg && (
                  <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>← Back</button>
                )}
                <button type="button" onClick={nextStep} className="btn-primary" style={{ flex: isGoogleReg ? 1 : 2, justifyContent: 'center', padding: '13px' }}>Continue →</button>
              </div>
            </div>
          )}


          {/* Step 2 — Location */}
          {step === 2 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <LocationSelectFields
                stateCode={form.stateCode}
                state={form.state}
                city={form.city}
                errors={errors}
                onLocationChange={({ country, stateCode, state, city }) => {
                  setForm((f) => ({ ...f, country, stateCode, state, city }));
                  setErrors((prev) => ({
                    ...prev,
                    ...(state !== undefined && state ? { state: '' } : {}),
                    ...(city !== undefined && city ? { city: '' } : {}),
                  }));
                }}
              />
              {errors.submit && <div className="auth-error-box">⚠️ {errors.submit}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>← Back</button>
                <button type="button" onClick={nextStep} className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Identity Verification */}
          {step === 3 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: '3rem' }}>🛡️</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 10, marginBottom: 6 }}>Trust Verification</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Aahaar builds a verified donor network. Please upload your Aadhaar document (PDF or Image) for manual verification by our admin team.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Aadhaar Card (PDF / Image) *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label className="btn-secondary" style={{ padding: '12px 20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    📁 {aadhaarFile ? 'Change Aadhaar file' : 'Select Aadhaar Document'}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAadhaarFile(file);
                      }}
                    />
                  </label>
                  {aadhaarFile && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-teal)', fontWeight: 600, background: 'rgba(6,182,212,0.06)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.15)', wordBreak: 'break-all' }}>
                      Selected: {aadhaarFile.name} ({(aadhaarFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>

              {errors.submit && <div className="auth-error-box" style={{ color: 'var(--color-red)', fontSize: '0.82rem', marginBottom: 14, fontWeight: 600 }}>⚠️ {errors.submit}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '13px' }} disabled={loading}>← Back</button>
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>
                  {loading ? (
                    <><span className="spinner" /> Loading...</>
                  ) : aadhaarFile ? (
                    'Register & Upload'
                  ) : (
                    'Register Account'
                  )}
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button type="button" onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }} disabled={loading}>
                  Skip verification for now
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="auth-card__footer" style={{ marginTop: 20 }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account?</span>
          <Link to="/login" className="auth-card__link">Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
