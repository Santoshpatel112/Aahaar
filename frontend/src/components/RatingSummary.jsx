import { useEffect, useState } from 'react';
import StarRating from './StarRating';
import api from '../api/axios';

export default function RatingSummary({
  targetId,
  role, // 'ngo' or 'donor'
  initialData,
  title = 'Reputation & Ratings',
  compact = false,
}) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData && !!targetId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }

    if (!targetId) return;

    let isMounted = true;
    setLoading(true);

    const fetchSummary = async () => {
      try {
        const res = await api.get(`/aahar/ratings/summary/${targetId}${role ? `?role=${role}` : ''}`);
        if (isMounted) {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching rating summary:', err);
          setError('Could not load rating summary');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [targetId, role, initialData]);

  if (loading) {
    return (
      <div
        className="rating-summary-skeleton"
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md, 12px)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.07))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '40%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} />
          <div style={{ width: '60%', height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { averageRating = 0, totalRatings = 0, starDistribution = {}, percentages = {} } = data;

  if (compact) {
    if (totalRatings === 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
          title="No ratings received yet"
        >
          ⭐ <span style={{ opacity: 0.8 }}>New</span>
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#fbbf24',
          background: 'rgba(251, 191, 36, 0.1)',
          padding: '2px 8px',
          borderRadius: '99px',
          border: '1px solid rgba(251, 191, 36, 0.25)',
        }}
        title={`${averageRating} out of 5 based on ${totalRatings} rating${totalRatings > 1 ? 's' : ''}`}
      >
        ⭐ {Number(averageRating).toFixed(1)}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          ({totalRatings})
        </span>
      </span>
    );
  }

  return (
    <div
      className="rating-summary-card"
      style={{
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '20px 24px',
        boxShadow: 'var(--glass-shadow, 0 8px 32px rgba(0, 0, 0, 0.3))',
      }}
    >
      {title && (
        <h4
          style={{
            margin: '0 0 16px 0',
            fontSize: '1rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⭐</span> {title}
        </h4>
      )}

      {totalRatings === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 12px',
            background: 'rgba(255, 255, 255, 0.01)',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.1))',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🌱</div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            No ratings yet
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Ratings and reviews will appear here after food donations are completed.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 160px) 1fr',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* Big Score Block */}
          <div
            style={{
              textAlign: 'center',
              borderRight: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              paddingRight: '16px',
            }}
          >
            <div
              style={{
                fontSize: '2.8rem',
                fontWeight: 900,
                color: '#fbbf24',
                lineHeight: 1,
                fontFamily: 'monospace',
                letterSpacing: '-1px',
              }}
            >
              {Number(averageRating).toFixed(1)}
            </div>
            <div style={{ margin: '8px 0' }}>
              <StarRating rating={averageRating} readOnly size="sm" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Based on <strong>{totalRatings}</strong> {totalRatings === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Distribution Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starDistribution[star] || 0;
              const percent = percentages[star] || (totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0);

              return (
                <div
                  key={star}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.8rem',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    {star}★
                  </span>

                  {/* Progress Bar Container */}
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 99,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background:
                          star >= 4
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : star === 3
                            ? '#22d3ee'
                            : 'rgba(239, 68, 68, 0.8)',
                        borderRadius: 99,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      width: 34,
                      textAlign: 'right',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
