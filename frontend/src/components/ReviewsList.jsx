import { useEffect, useState } from 'react';
import StarRating from './StarRating';
import api from '../api/axios';

export default function ReviewsList({
  targetId,
  role, // 'ngo' or 'donor'
  title = 'Community Reviews',
  pageSize = 5,
}) {
  const [reviews, setReviews] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = async (pageNum, isLoadMore = false) => {
    if (!targetId) return;

    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await api.get(
        `/aahar/ratings/reviews/${targetId}?page=${pageNum}&limit=${pageSize}${role ? `&role=${role}` : ''}`
      );
      const data = res.data;

      if (isLoadMore) {
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      } else {
        setReviews(data.reviews || []);
      }
      setTotalReviews(data.totalReviews || 0);
      setPage(data.page || pageNum);
      setHasMore(data.hasMore || false);
      setError(null);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setError('Could not load reviews. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReviews(1, false);
  }, [targetId, role]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReviews(page + 1, true);
    }
  };

  return (
    <div
      className="reviews-list-card"
      style={{
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '20px 24px',
        boxShadow: 'var(--glass-shadow, 0 8px 32px rgba(0, 0, 0, 0.3))',
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
            paddingBottom: '12px',
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>💬</span> {title}
            {totalReviews > 0 && (
              <span
                style={{
                  fontSize: '0.78rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: 99,
                  color: 'var(--text-secondary)',
                }}
              >
                {totalReviews}
              </span>
            )}
          </h4>
        </div>
      )}

      {/* Loading Initial State */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ width: 100, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div style={{ width: '85%', height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-red)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>{error}</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => fetchReviews(1, false)}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            🔄 Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 12px',
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
          }}
        >
          No written comments yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map((rev) => (
            <div
              key={rev._id}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md, 12px)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background:
                        rev.reviewerRole === 'donor'
                          ? 'rgba(6, 182, 212, 0.2)'
                          : 'rgba(249, 115, 22, 0.2)',
                      color: rev.reviewerRole === 'donor' ? '#22d3ee' : '#fb923c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {rev.reviewerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {rev.reviewerName}
                    </strong>
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      ({rev.reviewerRole === 'donor' ? 'Donor' : 'NGO Partner'})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarRating rating={rev.rating} readOnly size="xs" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {rev.comment && (
                <p
                  style={{
                    margin: '6px 0 0 0',
                    fontSize: '0.86rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    fontStyle: 'normal',
                  }}
                >
                  "{rev.comment}"
                </p>
              )}
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  fontSize: '0.82rem',
                  padding: '7px 18px',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-primary)',
                }}
              >
                {loadingMore ? 'Loading more...' : 'Load More Reviews ↓'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
