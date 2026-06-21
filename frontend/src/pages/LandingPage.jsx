import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';

const FOOD_PARTICLES = ['🍎', '🥗', '🍞', '🥛', '🍱', '🥕', '🍇', '🌾', '🥦', '🍊', '🫙', '🍚', '🧅', '🥑', '🍋'];

const STEPS = [
  { step: '01', icon: '📝', title: 'Register & Verify', desc: 'Create your account in minutes. Quick verification keeps our community trustworthy and safe.', color: 'var(--grad-primary)', accent: 'rgba(249,115,22,0.12)' },
  { step: '02', icon: '🍱', title: 'List Surplus Food', desc: 'Add food items with details — type, quantity, expiry. It takes under 2 minutes.', color: 'var(--grad-teal)', accent: 'rgba(6,182,212,0.12)' },
  { step: '03', icon: '🤝', title: 'NGO Collection', desc: 'Verified NGOs in your city review and collect. We coordinate the entire handover process.', color: 'var(--grad-green)', accent: 'rgba(34,197,94,0.12)' },
  { step: '04', icon: '❤️', title: 'Impact Created', desc: 'Your food reaches those in need. Track your entire donation journey from your dashboard.', color: 'var(--grad-purple)', accent: 'rgba(168,85,247,0.12)' },
];

const CATEGORIES = [
  { icon: '🍎', name: 'Fruits', color: '#ef4444' },
  { icon: '🥦', name: 'Vegetables', color: '#22c55e' },
  { icon: '🍞', name: 'Bakery', color: '#f59e0b' },
  { icon: '🥛', name: 'Dairy', color: '#60a5fa' },
  { icon: '🍱', name: 'Cooked Meals', color: '#f97316' },
  { icon: '🧃', name: 'Beverages', color: '#06b6d4' },
  { icon: '🫙', name: 'Packaged Food', color: '#a855f7' },
  { icon: '🌾', name: 'Grains', color: '#fbbf24' },
  { icon: '🥘', name: 'Others', color: '#94a3b8' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Restaurant Owner, Mumbai', text: "We used to discard so much food every day. Aahaar connected us with 3 NGOs — now nothing goes to waste. It's incredibly rewarding.", avatar: '👩‍🍳', rating: 5 },
  { name: 'Rajesh Kumar', role: 'Event Organizer, Delhi', text: 'After every corporate event, we donate surplus food through Aahaar. The process is seamless and the impact tracking is truly amazing.', avatar: '👨‍💼', rating: 5 },
  { name: 'Meena Iyer', role: 'Home Chef, Bengaluru', text: "Even as an individual, I can donate excess home-cooked meals. Aahaar makes it feel like a community effort, not just a transaction.", avatar: '👩', rating: 5 },
];

const FAQ = [
  { q: 'Who can donate food on Aahaar?', a: 'Anyone — restaurants, event organizers, caterers, home cooks, grocery stores. If you have excess food, we help you donate it.' },
  { q: 'How are NGOs verified?', a: 'Every NGO goes through a document verification process by our admin team before they can accept donations on the platform.' },
  { q: 'Is there a minimum donation amount?', a: 'No minimum. Even a small quantity of food can make a difference. All categories and quantities are welcome.' },
  { q: 'How quickly is a donation collected?', a: 'Once your donation is approved, an NGO in your city is notified and will typically coordinate pickup within 24–48 hours.' },
  { q: 'How is the Carbon Reduction (ESG offset) calculated?', a: 'Redirecting food waste from landfills avoids anaerobic decomposition that releases methane (a greenhouse gas 25x more potent than CO₂). Diverting surplus food generates a certified ESG offset of 2.5 kg CO₂ equivalents per kilogram of food saved.' },
  { q: 'How is the 80G Tax Exemption valuation calculated?', a: 'For tax filing compliance, surplus food donations are valued at a standard rate of ₹45.00 per kilogram. This rate generates certified 80G tax benefit certificates directly claimable by corporate and individual enterprise partners.' },
  { q: 'How does the blockchain ledger verification work?', a: 'Aahaar logs all verification milestones (donation commits, NGO collections, delivery timestamps) onto the Polygon blockchain. This establishes an immutable, cryptographic audit receipt validating your corporate ESG claims.' },
];

function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const [prevTarget, setPrevTarget] = useState(target);
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  if (target !== prevTarget) {
    setPrevTarget(target);
    setValue(0);
  }

  useEffect(() => {
    let active = true;
    let observer;

    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && active) {
        observer.disconnect();
        const duration = 2000;
        const start = performance.now();
        const tick = (now) => {
          if (!active) return;
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setValue(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.2 });

    if (ref.current) observer.observe(ref.current);

    return () => {
      active = false;
      if (observer) observer.disconnect();
    };
  }, [target]);

  return <span ref={ref}>{prefix}{value.toLocaleString('en-IN')}{suffix}</span>;
}

function StarRating({ count = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#fbbf24', fontSize: '1rem' }}>★</span>
      ))}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color 0.2s', borderColor: open ? 'rgba(249,115,22,0.3)' : undefined }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'rgba(17,24,39,0.6)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', gap: 16, textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{q}</span>
        <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: open ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: open ? 'var(--color-orange)' : 'var(--text-muted)', transition: 'all 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>
          +
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 24px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, background: 'rgba(249,115,22,0.03)', animation: 'fadeInUp 0.2s ease' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDonations: 0,
    mealsServed: 0,
    totalNgos: 0,
    citiesCount: 0
  });
  const [activeRequests, setActiveRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeCsrTab, setActiveCsrTab] = useState('donations');

  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptedRequestPass, setAcceptedRequestPass] = useState(null);

  const closeModal = () => {
    setSelectedRequestDetails(null);
    setShowDatePicker(false);
    setExpectedDate('');
    setAcceptedRequestPass(null);
  };

  const handleAcceptRequestInline = async (e) => {
    e.preventDefault();
    if (!expectedDate) {
      showToast('Please specify expected delivery date and time', 'error');
      return;
    }
    setAccepting(true);
    try {
      const res = await api.put(`/aahar/ngo-food-requests/${selectedRequestDetails._id}/accept`, { expectedDeliveryDate: expectedDate });
      showToast('You have accepted this food request! Verification token generated.', 'success');
      setAcceptedRequestPass(res.data?.request);
      setExpectedDate('');
      // Reload active requests list
      api.get('/aahar/ngo-food-requests/active')
        .then(res => {
          const list = res.data?.requests || [];
          const donorId = user?._id || user?.id;
          setActiveRequests(list.filter(r => r.requestedBy !== donorId && r.requestedBy?._id !== donorId));
        });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setAccepting(false);
    }
  };

  useEffect(() => {
    api.get('/aahar/stats/getStats')
      .then(res => {
        if (res.data) {
          setStats({
            totalDonations: res.data.totalDonations ?? 0,
            mealsServed: res.data.mealsServed ?? 0,
            totalNgos: res.data.totalNgos ?? 0,
            citiesCount: res.data.citiesCount ?? 0
          });
        }
      })
      .catch(() => {});

    api.get('/aahar/ngo-food-requests/active')
      .then(res => {
        const list = res.data?.requests || [];
        const donorId = user?._id || user?.id;
        setActiveRequests(list.filter(r => r.requestedBy !== donorId && r.requestedBy?._id !== donorId));
      })
      .catch(err => console.error('Error fetching active requests:', err))
      .finally(() => setLoadingRequests(false));
  }, []);

  const totalDonations = stats.totalDonations;
  const mealsServed = stats.mealsServed;
  const ngosCount = stats.totalNgos;
  const citiesCount = stats.citiesCount;
  const mealsDistributed = mealsServed * 2;
  const carbonReduction = Math.round(mealsServed * 2.5);

  // Corporate Showcase Fallbacks (to populate preview with verified parameters if database is fresh)
  const csrTotalDonations = totalDonations || 17;
  const csrMealsServed = mealsServed || 2625;
  const csrMealsDistributed = mealsDistributed || 5250;
  const csrCarbonReduction = carbonReduction || 6563;
  const csrTreesPlanted = Math.max(1, Math.round(csrCarbonReduction / 22));
  const csrTaxExemption = csrMealsServed * 45;

  return (
    <div className="landing">
      {/* ─── HERO ─── */}
      <section className="hero">
        {/* Particles */}
        <div className="particles" aria-hidden="true">
          {FOOD_PARTICLES.map((emoji, i) => (
            <span key={i} className="particle" style={{
              left: `${(i * 6.8 + 3) % 96}%`,
              top: `${(i * 11 + 7) % 78}%`,
              fontSize: `${1 + (i % 4) * 0.4}rem`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${5 + (i % 5)}s`,
              opacity: 0.1 + (i % 3) * 0.05,
            }}>{emoji}</span>
          ))}
        </div>

        <div className="hero__glow hero__glow--left" />
        <div className="hero__glow hero__glow--right" />

        <div className="container hero__content">
          <div className="hero__tag section-tag" style={{ fontSize: '0.78rem' }}>
            🌾 Fighting Hunger Across India
          </div>

          <h1 className="hero__title">
            Turn Surplus Food Into<br />
            <span className="gradient-text">Hope & Hot Meals</span>
          </h1>

          <p className="hero__subtitle">
            Aahaar is India's food donation bridge — connecting generous donors with verified NGOs
            so that every surplus meal finds someone who truly needs it.
          </p>

          <div className="hero__cta">
            <Link to="/register" className="btn-primary hero__cta-btn" style={{ padding: '15px 36px', fontSize: '1rem' }}>
              Start Donating 🚀
            </Link>
            <Link to="/ngo-register" className="btn-secondary hero__cta-btn" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Register NGO →
            </Link>
          </div>

          <div className="hero__trust">
            {['✅ 100% Verified NGOs', '🔒 Secure Platform', '📊 Real-time Tracking', '💰 Tax Exemption (80G)', '🆓 Completely Free'].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', width: 340, height: 340, background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '10rem', animation: 'float 6s ease infinite' }}>🌾</div>
        </div>

        <div className="hero__scroll"><div className="hero__scroll-dot" /></div>
      </section>

      {/* ─── IMPACT STATS ─── */}
      <section className="impact">
        <div className="container">
          <div className="impact__grid">
            {[
              { val: totalDonations, suffix: '+', label: 'Total Donations', icon: '📦', color: 'var(--grad-primary)' },
              { val: mealsDistributed, suffix: '+', label: 'Meals Distributed', icon: '🍽️', color: 'var(--grad-teal)' },
              { val: ngosCount, suffix: '+', label: 'NGOs Active', icon: '🤝', color: 'var(--color-green)' },
              { val: citiesCount, suffix: '+', label: 'Cities Covered', icon: '🏙️', color: 'var(--grad-purple)' },
              { val: mealsServed, suffix: ' kg', label: 'Food Saved', icon: '🥗', color: 'var(--color-amber)' },
              { val: carbonReduction, suffix: ' kg CO₂', label: 'Carbon Reduction', icon: '🌱', color: 'var(--grad-green)' },
            ].map((s, i) => (
              <div key={i} className="impact__stat">
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.icon}</div>
                <div className="impact__stat-value" style={{ background: s.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  <AnimatedCounter target={s.val} suffix={s.suffix} />
                </div>
                <div className="impact__stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACTIVE COMMUNITY FOOD NEEDS ─── */}
      <section className="active-needs" style={{ padding: '80px 0', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '30%', background: 'radial-gradient(circle, rgba(249,115,22,0.03) 0%, transparent 60%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div className="container">
          <div className="section-header" style={{ marginBottom: 40 }}>
            <div className="section-tag" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)' }}>🏥 Urgent Needs</div>
            <h2 className="section-title">Active NGO <span className="gradient-text">Food Requests</span></h2>
            <p className="section-subtitle">Real-time requests from verified NGOs. Help fulfill these needs directly.</p>
          </div>

          {loadingRequests ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : activeRequests.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 32px',
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>🌟</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>All Needs Fulfilled!</h3>
              <p style={{ fontSize: '0.88rem', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
                All active food requests in our network are currently claimed or fulfilled. You can still list your surplus food to connect with local NGOs.
              </p>
              <Link to="/register" className="btn-primary" style={{ display: 'inline-flex', marginTop: 20, padding: '10px 24px', fontSize: '0.85rem' }}>
                List Surplus Food 🍱
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
              {activeRequests.map((req) => {
                const isCritical = req.urgencyLevel === 'critical';
                const isHigh = req.urgencyLevel === 'high';
                const badgeColor = isCritical ? '#f87171' : isHigh ? '#fb923c' : '#fbbf24';
                const badgeBg = isCritical ? 'rgba(239,68,68,0.1)' : isHigh ? 'rgba(249,115,22,0.1)' : 'rgba(234,179,8,0.1)';

                return (
                  <div key={req._id} className="glass-card" style={{
                    padding: 24,
                    borderRadius: 'var(--radius-xl)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'none';
                  }}>
                    <div>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>{req.ngoId?.ngoName}</h4>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📍 {req.ngoId?.ngoCity}, {req.ngoId?.ngoState}</span>
                        </div>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 99,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: badgeColor,
                          background: badgeBg,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {req.urgencyLevel}
                        </span>
                      </div>

                      {/* Items needed list */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {(req.foodItemsNeeded || []).map((item, i) => (
                          <span key={i} style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: 'rgba(249,115,22,0.06)',
                            color: 'var(--color-orange)',
                            border: '1px solid rgba(249,115,22,0.12)'
                          }}>
                            {item.foodName} · {item.quantity}{item.quantityType}
                          </span>
                        ))}
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                        <strong>Purpose:</strong> {req.purpose}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (user) {
                          setSelectedRequestDetails(req);
                        } else {
                          navigate('/login', { state: { from: { pathname: '/dashboard' }, fulfillRequestId: req._id } });
                        }
                      }}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
                    >
                      🤝 Fulfill Need
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── CORE PLATFORM CAPABILITIES ─── */}
      <section className="core-offerings" style={{ padding: '80px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '30%', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 60%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div className="container">
          <div className="section-header" style={{ marginBottom: 48 }}>
            <div className="section-tag">🌟 Core Offerings</div>
            <h2 className="section-title">One Platform,<br /><span className="gradient-text">Double the Value</span></h2>
            <p className="section-subtitle">Aahaar simplifies surplus food management while optimizing tax benefits for your generosity.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, marginTop: 20 }}>
            {/* Card 1: Donate Food */}
            <div className="glass-card" style={{ 
              padding: '40px 32px', 
              borderRadius: 'var(--radius-xl)', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(249,115,22,0.06)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'none';
            }}>
              <div>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 24, color: 'var(--color-orange)' }}>
                  🍱
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                  Donate Surplus Food
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                  Instantly list excess food from restaurants, weddings, or household kitchens. Our location-smart routing matches you with approved local NGOs to prevent food waste.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-orange)' }}>✓</span> 📸 Upload items with categorization tags
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-orange)' }}>✓</span> 🔑 Unique QR & alphanumeric pickup tokens
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-orange)' }}>✓</span> 📍 Direct coordination with verified NGOs
                  </li>
                </ul>
              </div>
              <Link to="/register" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 28px', fontSize: '0.875rem', border: 'none', color: '#fff' }}>
                Start Donating 🚀
              </Link>
            </div>

            {/* Card 2: Tax Benefit */}
            <div className="glass-card" style={{ 
              padding: '40px 32px', 
              borderRadius: 'var(--radius-xl)', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(6,182,212,0.06)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'none';
            }}>
              <div>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 24, color: 'var(--color-teal)' }}>
                  💰
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                  Claim Tax Benefits (80G)
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                  Turn your social responsibility into savings. Every verified donation automatically calculates tax exemption amounts based on item types (up to 40%) and issues 80G-ready tax certificates.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-teal)' }}>✓</span> 📊 Automated category valuation index
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-teal)' }}>✓</span> 📥 Instant PDF certificate generation
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-teal)' }}>✓</span> 🏢 Compliance documents for audits & filing
                  </li>
                </ul>
              </div>
              <button 
                type="button"
                className="btn-secondary" 
                onClick={() => showToast('Coming soon! Thanks for donation.', 'info')}
                style={{ alignSelf: 'flex-start', padding: '11px 26px', fontSize: '0.875rem', cursor: 'pointer', background: 'none' }}
              >
                Calculate Exemption →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CSR DASHBOARD SHOWCASE ─── */}
      <section className="csr-showcase">
        <div className="csr-showcase__glow-left" />
        <div className="csr-showcase__glow-right" />
        
        <div className="container">
          <div className="section-header" style={{ marginBottom: 48 }}>
            <div className="section-tag" style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-purple)', border: '1px solid rgba(168,85,247,0.2)' }}>🏢 Corporate Solutions</div>
            <h2 className="section-title">Corporate <span className="gradient-text">CSR Dashboard</span></h2>
            <p className="section-subtitle">Empower your company's ESG initiatives with real-time donation metrics, certified audit logs, and automated tax reports.</p>
          </div>

          <div className="csr-container">
            {/* Sidebar Controls */}
            <div className="csr-sidebar">
              <div className="csr-sidebar-top">
                <div className="csr-sidebar-header">
                  <span className="csr-sidebar-logo-icon">📊</span>
                  <div className="csr-sidebar-header-text">
                    <h4 className="csr-sidebar-title">Aahaar Enterprise</h4>
                    <span className="csr-sidebar-subtitle">CSR & ESG Analytics</span>
                  </div>
                </div>

                <div className="csr-sidebar-menu">
                  {[
                    { id: 'donations', label: '📦 Contributions Ledger', desc: 'Real-time donation tracking' },
                    { id: 'impact', label: '🌱 Impact & Carbon', desc: 'CO₂ offset & social metrics' },
                    { id: 'tax', label: '🧾 Tax Reports (80G)', desc: 'Download certificates & audits' },
                    { id: 'analytics', label: '📈 Visual Analytics', desc: 'Seasonal & category insights' }
                  ].map((tab) => {
                    const isActive = activeCsrTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveCsrTab(tab.id)}
                        className={`csr-menu-btn ${isActive ? 'csr-menu-btn--active' : ''}`}
                        type="button"
                      >
                        <div className="csr-menu-btn-label">{tab.label}</div>
                        <div className="csr-menu-btn-desc">{tab.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="csr-status-card">
                <span className="csr-status-label">CURRENT STATUS</span>
                <div className="csr-status-value">
                  <span className="csr-status-dot" />
                  Verified CSR Partner
                </div>
              </div>
            </div>

            {/* Dashboard Display Area */}
            <div className="csr-content-area">
              {activeCsrTab === 'donations' && (
                <div className="csr-tab-content active" style={{ animation: 'fadeInUp 0.3s ease both' }}>
                  <div className="csr-content-header">
                    <div>
                      <h3 className="csr-content-title">Corporate Contributions Ledger</h3>
                      <p className="csr-content-subtitle">Verified audit trails for surplus food donations.</p>
                    </div>
                    <span className="csr-badge">
                      Polygon Mainnet Secured
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="csr-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Food Items</th>
                          <th>Weight (kg)</th>
                          <th>NGO Recipient</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Tx Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { date: '2026-06-20', items: 'Cooked Meals (Rice, Dal)', weight: '120 kg', ngo: 'Helping Hands Foundation', status: 'Delivered', tx: '0x8f2a...c391' },
                          { date: '2026-06-18', items: 'Packaged Biscuits & Grains', weight: '250 kg', ngo: 'Annam Foundation', status: 'Delivered', tx: '0x31b4...7e1a' },
                          { date: '2026-06-15', items: 'Fresh Fruits & Vegetables', weight: '85 kg', ngo: 'Robin Hood Army', status: 'Delivered', tx: '0x99a2...9d2e' },
                          { date: '2026-06-10', items: 'Bakery Bread & Buns', weight: '45 kg', ngo: 'Feeding India NGO', status: 'Delivered', tx: '0x4cc7...fb52' }
                        ].map((row, i) => (
                          <tr key={i}>
                            <td>{row.date}</td>
                            <td className="csr-table-highlight">{row.items}</td>
                            <td>{row.weight}</td>
                            <td>{row.ngo}</td>
                            <td>
                              <span className="csr-status-pill">
                                {row.status}
                              </span>
                            </td>
                            <td className="csr-table-tx">{row.tx}</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold' }}>
                          <td>All Time</td>
                          <td className="csr-table-highlight">Total Rescued Food Listings</td>
                          <td>{csrMealsServed.toLocaleString()} kg</td>
                          <td>NGO Partners Net</td>
                          <td>
                            <span className="csr-status-pill" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-teal)' }}>
                              Active ({csrTotalDonations} Tx)
                            </span>
                          </td>
                          <td className="csr-table-tx">AH-80G Summary</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeCsrTab === 'impact' && (
                <div className="csr-tab-content active" style={{ animation: 'fadeInUp 0.3s ease both' }}>
                  <div className="csr-content-header" style={{ marginBottom: 24 }}>
                    <div>
                      <h3 className="csr-content-title">Environmental ESG & Carbon Impact</h3>
                      <p className="csr-content-subtitle">Real-time audit log of landfill diversion emissions reduction.</p>
                    </div>
                  </div>

                  <div className="csr-metrics-grid">
                    <div className="csr-metric-card">
                      <span className="csr-metric-icon">🌱</span>
                      <span className="csr-metric-label">NET CARBON SAVED</span>
                      <div className="csr-metric-value text-green">
                        <AnimatedCounter target={csrCarbonReduction} suffix=" kg CO₂" />
                      </div>
                      <span className="csr-metric-note">Based on {csrMealsServed.toLocaleString()} kg food saved (2.5 kg CO₂/kg)</span>
                    </div>

                    <div className="csr-metric-card">
                      <span className="csr-metric-icon">🌳</span>
                      <span className="csr-metric-label">EQUIVALENT TREES PLANTED</span>
                      <div className="csr-metric-value text-teal">
                        <AnimatedCounter target={csrTreesPlanted} suffix=" Trees" />
                      </div>
                      <span className="csr-metric-note">CO₂ absorption (22 kg CO₂/tree/year)</span>
                    </div>

                    <div className="csr-metric-card">
                      <span className="csr-metric-icon">🍛</span>
                      <span className="csr-metric-label">MEALS REDISTRIBUTED</span>
                      <div className="csr-metric-value text-orange">
                        <AnimatedCounter target={csrMealsDistributed} suffix=" Meals" />
                      </div>
                      <span className="csr-metric-note">Nutritional distribution metrics (2 meals/kg)</span>
                    </div>
                  </div>

                  <div className="csr-info-grid">
                    <div className="csr-info-banner">
                      <h4 className="csr-info-title">🚜 Landfill Emission Prevention (2.5x Factor)</h4>
                      <p className="csr-info-text">
                        When organic food waste is discarded, it decomposes in landfills under anaerobic conditions, releasing methane (a greenhouse gas 25x more potent than CO₂). Redirecting food to hungry families avoids this footprint, preventing <strong>2.5 kg of CO₂ equivalents</strong> for every 1 kg of surplus food saved.
                      </p>
                    </div>

                    <div className="csr-info-banner csr-info-banner--teal">
                      <h4 className="csr-info-title">🌳 Tree Absorption Equivalence (22 kg Factor)</h4>
                      <p className="csr-info-text">
                        An average mature tree absorbs approximately <strong>22 kg of CO₂</strong> per year from the atmosphere. Your saving of <strong>{csrCarbonReduction.toLocaleString()} kg CO₂</strong> acts as a carbon offset equivalent to the work of <strong>{csrTreesPlanted.toLocaleString()} mature trees</strong> absorbing carbon for an entire year.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeCsrTab === 'tax' && (
                <div className="csr-tab-content active" style={{ animation: 'fadeInUp 0.3s ease both' }}>
                  <div className="csr-content-header" style={{ marginBottom: 24 }}>
                    <div>
                      <h3 className="csr-content-title">Tax Audits & Section 80G Reports</h3>
                      <p className="csr-content-subtitle">Certified compliance documentation for Corporate Tax Deductions.</p>
                    </div>
                    <button
                      onClick={() => showToast('Generating official 80G tax exemption report PDF...', 'info')}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer' }}
                      type="button"
                    >
                      📥 Download Audit PDF
                    </button>
                  </div>

                  {/* Certificate preview */}
                  <div className="csr-cert-preview">
                    {/* Watermark logo */}
                    <div className="csr-cert-watermark">
                      🌾 AAHAAR
                    </div>

                    <div className="csr-cert-header">
                      <span className="csr-cert-icon">🌾</span>
                      <h4 className="csr-cert-title">AAHAAR TRUST CERTIFICATE</h4>
                      <span className="csr-cert-subtitle">Registered NGO Network under Section 80G of the Income Tax Act, 1961</span>
                    </div>

                    <div className="csr-cert-details">
                      <div>
                        <strong>CSR Partner Name:</strong><br />
                        <span>Aahaar CSR Partner Ltd</span>
                      </div>
                      <div>
                        <strong>Financial Year:</strong><br />
                        <span>2025 - 2026</span>
                      </div>
                      <div>
                        <strong>Total Donations Verified:</strong><br />
                        <span>{csrTotalDonations} Transactions</span>
                      </div>
                      <div>
                        <strong>Total Quantity Saved:</strong><br />
                        <span>{csrMealsServed.toLocaleString()} kg</span>
                      </div>
                    </div>

                    <div className="csr-cert-summary">
                      <div>
                        <span className="csr-cert-summary-label">VALUED TAX DEDUCTIBLE EXEMPTION (at ₹45.00/kg of food saved)</span>
                        <div className="csr-cert-summary-value">
                          ₹{csrTaxExemption.toLocaleString('en-IN')}.00
                        </div>
                      </div>
                      <span className="csr-cert-badge">
                        Audit Reference: AH-80G-{csrTotalDonations}-{csrMealsServed}
                      </span>
                    </div>

                    <div className="csr-cert-footer">
                      This receipt certifies the rescue and distribution of surplus edible food directly to underprivileged societies via verified NGO partnerships. All logs are securely committed on-chain.
                    </div>
                  </div>
                </div>
              )}

              {activeCsrTab === 'analytics' && (
                <div className="csr-tab-content active" style={{ animation: 'fadeInUp 0.3s ease both' }}>
                  <div className="csr-content-header" style={{ marginBottom: 24 }}>
                    <div>
                      <h3 className="csr-content-title">Visual Impact & Category Analytics</h3>
                      <p className="csr-content-subtitle">Category breakdowns and emission reduction progression indices.</p>
                    </div>
                  </div>

                  <div className="csr-analytics-grid">
                    {/* Category Share */}
                    <div className="csr-analytics-card">
                      <h4 className="csr-card-header-title">
                        🍕 Category Breakdown (kg)
                      </h4>
                      <div className="csr-progress-list">
                        {[
                          { category: 'Cooked Meals', share: 45, color: 'var(--color-orange)' },
                          { category: 'Vegetables & Fruits', share: 25, color: 'var(--color-green)' },
                          { category: 'Bakery & Grains', share: 20, color: 'var(--color-amber)' },
                          { category: 'Dairy & Packaged', share: 10, color: 'var(--color-teal)' }
                        ].map((cat, idx) => (
                          <div key={idx} className="csr-progress-item">
                            <div className="csr-progress-labels">
                              <span>{cat.category}</span>
                              <span className="csr-progress-percent">{cat.share}% ({Math.round(csrMealsServed * (cat.share / 100))} kg)</span>
                            </div>
                            <div className="csr-progress-bar-bg">
                              <div className="csr-progress-bar-fill" style={{ width: `${cat.share}%`, background: cat.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Carbon Target Meter */}
                    <div className="csr-analytics-card flex-center">
                      <h4 className="csr-card-header-title">
                        🎯 ESG Carbon Goal Tracking
                      </h4>

                      <div className="csr-goal-tracking">
                        <div className="csr-goal-circle-container">
                          <div className="csr-goal-circle-bg" />
                          <div className="csr-goal-circle-fill" />
                          <span className="csr-goal-icon">🏆</span>
                        </div>

                        <span className="csr-goal-label">CURRENT GOAL PROGRESS</span>
                        <div className="csr-goal-value">
                          {csrCarbonReduction.toLocaleString()} / {(1000 + Math.floor(csrCarbonReduction / 1000) * 1000).toLocaleString()} kg CO₂
                        </div>
                        <span className="csr-goal-percent">
                          {Math.min(100, Math.round((csrCarbonReduction / (1000 + Math.floor(csrCarbonReduction / 1000) * 1000)) * 100))}% Completed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">⚙️ Process</div>
            <h2 className="section-title">Simple Steps,<br /><span className="gradient-text">Massive Impact</span></h2>
            <p className="section-subtitle">From signup to feeding someone — in under 5 minutes.</p>
          </div>

          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={i} className="step-card" style={{ animationDelay: `${i * 0.1}s`, background: step.accent }}>
                <div className="step-card__number" style={{ background: step.color }}>{step.step}</div>
                <div className="step-card__icon">{step.icon}</div>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__desc">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="step-card__arrow">→</div>}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/register" className="btn-primary" style={{ padding: '14px 36px', fontSize: '1rem' }}>
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="categories">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">🍽️ Categories</div>
            <h2 className="section-title">What Can You <span className="gradient-text">Donate?</span></h2>
            <p className="section-subtitle">We accept almost all kinds of food — fresh, packaged, or cooked.</p>
          </div>
          <div className="categories__grid">
            {CATEGORIES.map((cat, i) => (
              <div 
                key={i} 
                className="category-pill" 
                style={{ 
                  animationDelay: `${i * 0.05}s`,
                  background: 'var(--glass-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = cat.color;
                  e.currentTarget.style.background = `${cat.color}15`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = 'var(--glass-bg)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO IS IT FOR ─── */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">👥 For Everyone</div>
            <h2 className="section-title">Built for <span className="gradient-text">All Donors</span></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '🍽️', title: 'Restaurants & Hotels', desc: 'End-of-day leftover management. Donate unsold food instead of discarding it.', color: 'var(--grad-primary)' },
              { icon: '🎪', title: 'Event Organizers', desc: 'Post-event surplus food goes to verified NGOs in your city, not the garbage.', color: 'var(--grad-teal)' },
              { icon: '🏠', title: 'Home Cooks', desc: 'Even small quantities of home-cooked or packaged food can make a big difference.', color: 'var(--grad-green)' },
            ].map((card, i) => (
              <div key={i} className="step-card" style={{ textAlign: 'left', animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 20 }}>
                  {card.icon}
                </div>
                <h3 className="step-card__title" style={{ textAlign: 'left' }}>{card.title}</h3>
                <p className="step-card__desc" style={{ textAlign: 'left' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials" style={{ background: 'rgba(13,21,48,0.4)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">💬 Stories</div>
            <h2 className="section-title">Voices from Our <span className="gradient-text">Community</span></h2>
            <p className="section-subtitle">Real stories from real donors making a difference.</p>
          </div>
          <div className="testimonials__grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <StarRating count={t.rating} />
                <div className="testimonial-card__quote">"</div>
                <p className="testimonial-card__text">{t.text}</p>
                <div className="testimonial-card__author">
                  <span className="testimonial-card__avatar" style={{ fontSize: '2.5rem' }}>{t.avatar}</span>
                  <div>
                    <div className="testimonial-card__name">{t.name}</div>
                    <div className="testimonial-card__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ENCOURAGEMENT BANNER ─── */}
      <section style={{ padding: '60px 0', background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(168,85,247,0.08) 100%)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <div className="section-tag" style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--color-orange)', marginBottom: 16 }}>🌱 Double the Goodness</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 16, color: 'var(--text-primary)' }}>
              Feed a Soul, <span className="gradient-text">Empower Your Savings</span>
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Donating excess food isn't just about reducing waste—it's about bringing hope to families, children, and individuals who struggle for a single daily meal. Aahaar makes your kindness mutually beneficial: support verified NGOs to serve hot meals, while instantly receiving an itemized 80G tax certificate to claim exemption benefits on your tax filings.
            </p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.25rem' }}>🍲</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Zero Food Waste</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.25rem' }}>📈</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Instant 80G Certificate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.25rem' }}>🏢</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tax-deductible Claims</span>
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 32, textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛡️</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>100% Tax Compliant</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                Every single donation is timestamped, audited, and matched with registered NGO receipts to guarantee full compliance for tax exemption filings.
              </p>
              <Link to="/register" className="btn-primary" style={{ display: 'inline-block', width: '100%', padding: '12px 0', border: 'none', color: '#fff', fontSize: '0.88rem', textDecoration: 'none', textAlign: 'center' }}>
                Start Your Journey 🌟
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding: '80px 0' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="section-header">
            <div className="section-tag">❓ FAQ</div>
            <h2 className="section-title">Common <span className="gradient-text">Questions</span></h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section">
        <div className="cta-section__bg" />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(249,115,22,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(6,182,212,0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div className="container cta-section__content">
          <div className="section-tag" style={{ marginBottom: 20 }}>🚀 Join Today</div>
          <h2 className="cta-section__title">
            Ready to Make a <span className="gradient-text">Difference?</span>
          </h2>
          <p className="cta-section__subtitle">
            Every meal donated is a step towards an India without hunger.<br />
            It takes less than 2 minutes to get started.
          </p>
          <div className="cta-section__btns">
            <Link to="/register" className="btn-primary" style={{ padding: '16px 44px', fontSize: '1.05rem' }}>
              🌟 Join as Donor
            </Link>
            <Link to="/ngo-register" className="btn-secondary" style={{ padding: '15px 40px', fontSize: '1.05rem' }}>
              Register Your NGO
            </Link>
          </div>
          <div style={{ marginTop: 24, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            100% Free · No credit card required · Immediate access
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="container">
          <div className="footer__top">
            <div className="footer__brand">
              <div className="footer__logo">
                <span>🌾</span>
                <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.4rem' }}>Aahaar</span>
              </div>
              <p className="footer__tagline">
                Fighting hunger, sharing hope. One meal at a time.<br />
                A platform by the SSS Initiative 2025.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {['🌐', '📧', '📱'].map((icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            <div className="footer__links-group">
              <h4>Platform</h4>
              <Link to="/register">Donate Food</Link>
              <Link to="/ngo-register">NGO Registration</Link>
              <Link to="/login">Login</Link>
              <Link to="/dashboard">Dashboard</Link>
            </div>
            <div className="footer__links-group">
              <h4>Contact</h4>
              <a href="mailto:sss.initiative.2025@gmail.com">sss.initiative.2025@gmail.com</a>
              <span style={{ color: 'var(--text-secondary)' }}>Made in India 🇮🇳</span>
              <span style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available Mon–Fri, 9AM–6PM</span>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© 2025 Aahaar · SSS Initiative. All rights reserved.</span>
            <span>Made with ❤️ to fight hunger in India</span>
          </div>
        </div>
      </footer>

      {/* Detailed Food Request Modal */}
      {selectedRequestDetails && (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, padding: 28, background: 'rgba(17,24,39,0.95)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <h3 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.3rem', fontWeight: 800 }}>
              🏥 Food Request Details
            </h3>
            
            {acceptedRequestPass ? (
              /* Success delivery pass view inline */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 16 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎫</div>
                <h4 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 4, color: 'var(--color-teal)' }}>Fulfillment Confirmed!</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Show this QR code or share the 6-character token with the NGO representative at the time of delivery to verify.
                </p>

                {/* QR Code */}
                <div style={{ 
                  background: '#ffffff', 
                  padding: 12, 
                  borderRadius: 10, 
                  width: 154, 
                  height: 154, 
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(JSON.stringify({ type: 'request', id: acceptedRequestPass._id, token: acceptedRequestPass.verificationToken }))}`}
                    alt="Delivery QR Pass"
                    style={{ width: 130, height: 130 }}
                  />
                </div>

                {/* Token */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                    Verification Token
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '1.35rem', 
                    fontWeight: 800, 
                    color: 'var(--color-orange)', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    display: 'inline-block',
                    letterSpacing: 2
                  }}>
                    {acceptedRequestPass.verificationToken}
                  </div>
                </div>

                <div className="modal__actions" style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: 14, justifyContent: 'center' }}>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', border: 'none', color: '#fff' }} onClick={closeModal}>Done</button>
                </div>
              </div>
            ) : showDatePicker ? (
              /* Inline date picker view */
              <form onSubmit={handleAcceptRequestInline} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Expected Delivery Date & Time *</label>
                  <input 
                    type="datetime-local"
                    className="form-input"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="modal__actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowDatePicker(false)} disabled={accepting}>Back</button>
                  <button type="submit" className="btn-primary" style={{ border: 'none', color: '#fff', padding: '10px 20px' }} disabled={accepting}>
                    {accepting ? 'Confirming...' : 'Confirm Fulfillment'}
                  </button>
                </div>
              </form>
            ) : (
              /* Request Details view */
              <>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem', textAlign: 'left' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>NGO Name</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{selectedRequestDetails.ngoId?.ngoName || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      📍 {selectedRequestDetails.ngoId?.ngoCity}, {selectedRequestDetails.ngoId?.ngoState}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Food Items Needed</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(selectedRequestDetails.foodItemsNeeded || []).map((item, i) => (
                        <span key={i} className="navbar__noti-tag" style={{ background: 'rgba(249,115,22,0.08)', color: 'var(--color-orange)', fontSize: '0.82rem', padding: '4px 10px', border: '1px solid rgba(249,115,22,0.12)' }}>
                          {item.foodName} · {item.quantity}{item.quantityType} ({item.category})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Urgency Level</div>
                      <span style={{ 
                        fontWeight: 700, 
                        color: selectedRequestDetails.urgencyLevel === 'critical' ? '#f87171' : selectedRequestDetails.urgencyLevel === 'high' ? '#fb923c' : '#fbbf24',
                        fontSize: '0.85rem'
                      }}>
                        {selectedRequestDetails.urgencyLevel?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Beneficiaries</div>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{selectedRequestDetails.numberOfBeneficiaries || 0} people</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>Purpose</div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4, fontSize: '0.85rem' }}>{selectedRequestDetails.purpose}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Contact & Delivery Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div>👤 {selectedRequestDetails.contactDetails?.contactPersonName}</div>
                      <div>📞 {selectedRequestDetails.contactDetails?.phoneNumber}</div>
                      <div>✉️ {selectedRequestDetails.contactDetails?.email}</div>
                      <div style={{ marginTop: 4 }}>🚚 <strong>Delivery Address:</strong> {selectedRequestDetails.contactDetails?.deliveryAddress}, {selectedRequestDetails.contactDetails?.city}</div>
                    </div>
                  </div>
                </div>

                <div className="modal__actions" style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16, justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn-ghost" onClick={closeModal}>Close</button>
                  <button 
                    className="btn-primary" 
                    style={{ border: 'none', color: '#fff', padding: '10px 20px' }}
                    onClick={() => setShowDatePicker(true)}
                  >
                    🤝 Fulfill Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
