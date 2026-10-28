import { useState } from 'react';

/**
 * StarRating component
 * Supports interactive star selection (1-5) and read-only display with fractional fills.
 */
export default function StarRating({
  rating = 0,
  onRatingChange,
  readOnly = false,
  size = 'md',
  showValue = false,
  maxStars = 5,
  ariaLabel = 'Rating',
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizes = {
    xs: { px: 14, gap: 2, fontSize: '0.75rem' },
    sm: { px: 18, gap: 4, fontSize: '0.82rem' },
    md: { px: 24, gap: 6, fontSize: '0.95rem' },
    lg: { px: 32, gap: 8, fontSize: '1.2rem' },
  };

  const currentSize = starSizes[size] || starSizes.md;
  const activeRating = readOnly ? rating : (hoverRating || rating);

  const handleKeyDown = (e, starIndex) => {
    if (readOnly || !onRatingChange) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRatingChange(starIndex);
    } else if (e.key === 'ArrowRight' && starIndex < maxStars) {
      e.preventDefault();
      onRatingChange(starIndex + 1);
    } else if (e.key === 'ArrowLeft' && starIndex > 1) {
      e.preventDefault();
      onRatingChange(starIndex - 1);
    }
  };

  return (
    <div
      className={`star-rating star-rating--${size} ${readOnly ? 'star-rating--readonly' : 'star-rating--interactive'}`}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`${ariaLabel}: ${rating} out of ${maxStars} stars`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.gap,
      }}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const fillPercent = Math.max(0, Math.min(100, (activeRating - index) * 100));

        if (readOnly) {
          return (
            <span
              key={starValue}
              style={{
                position: 'relative',
                display: 'inline-block',
                width: currentSize.px,
                height: currentSize.px,
                flexShrink: 0,
              }}
              title={`${rating} / ${maxStars} stars`}
            >
              {/* Background empty star */}
              <svg
                width={currentSize.px}
                height={currentSize.px}
                viewBox="0 0 24 24"
                fill="rgba(255, 255, 255, 0.15)"
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>

              {/* Foreground filled star with clipped width */}
              {fillPercent > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${fillPercent}%`,
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <svg
                    width={currentSize.px}
                    height={currentSize.px}
                    viewBox="0 0 24 24"
                    fill="url(#star-gold-gradient)"
                  >
                    <defs>
                      <linearGradient id="star-gold-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              )}
            </span>
          );
        }

        const isFilled = starValue <= activeRating;

        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={rating === starValue}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            tabIndex={readOnly ? -1 : (rating === starValue || (rating === 0 && starValue === 1) ? 0 : -1)}
            onClick={() => onRatingChange && onRatingChange(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            onKeyDown={(e) => handleKeyDown(e, starValue)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease',
              transform: hoverRating >= starValue ? 'scale(1.18)' : 'scale(1)',
            }}
          >
            <svg
              width={currentSize.px}
              height={currentSize.px}
              viewBox="0 0 24 24"
              fill={isFilled ? '#fbbf24' : 'rgba(255, 255, 255, 0.18)'}
              stroke={isFilled ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)'}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: isFilled ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.45))' : 'none',
                transition: 'fill 0.15s ease, filter 0.15s ease',
              }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}

      {showValue && (
        <span
          style={{
            marginLeft: 6,
            fontSize: currentSize.fontSize,
            fontWeight: 700,
            color: activeRating > 0 ? '#fbbf24' : 'var(--text-muted)',
          }}
        >
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}
