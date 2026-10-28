import { useState } from 'react';
import StarRating from './StarRating';
import api from '../api/axios';
import { showToast } from './Toast';

const RATING_LABELS = {
  1: '1 Star — Poor Experience',
  2: '2 Stars — Below Expectations',
  3: '3 Stars — Good / Satisfactory',
  4: '4 Stars — Very Good & Efficient',
  5: '5 Stars — Outstanding & Generous!',
};

export default function RatingModal({
  isOpen,
  onClose,
  donation,
  userRole = 'donor', // 'donor' rating NGO or 'ngo' rating donor
  recipientName = '',
  onSuccess,
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !donation) return null;

  const donationId = donation._id || donation.id;
  const shortId = String(donationId).slice(-8).toUpperCase();
  const isDonorRatingNgo = userRole === 'donor';

  // Extract food items summary
  const items = donation.foodItemDetails || donation.foodItemsNeeded || [];
  const itemsSummary = items
    .map((it) => `${it.foodName} (${it.quantity}${it.quantityType || 'kg'})`)
    .join(', ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/aahar/ratings', {
        donationId,
        rating,
        comment: comment.trim(),
      });

      showToast(res.data?.message || 'Thank you! Rating submitted successfully.', 'success');
      if (onSuccess) {
        onSuccess(res.data?.rating);
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit rating:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to submit rating. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 24, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          background: 'var(--bg-card, #111827)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 30px rgba(249, 115, 22, 0.1)',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.06) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: isDonorRatingNgo ? 'rgba(6, 182, 212, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
              }}
            >
              {isDonorRatingNgo ? '🏢' : '🎁'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isDonorRatingNgo ? 'Rate Receiving NGO' : 'Rate Food Donor'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Donation #{shortId}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.4rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              padding: '4px',
              borderRadius: '6px',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Target Recipient Card */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md, 12px)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>
              {isDonorRatingNgo ? 'NGO Partner' : 'Donor'}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {recipientName || (isDonorRatingNgo ? 'Assigned NGO' : 'Food Donor')}
            </div>
            {itemsSummary && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                📦 {itemsSummary}
              </div>
            )}
          </div>

          {/* Star Selection Section */}
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 10,
              }}
            >
              How was your experience? <span style={{ color: 'var(--color-orange)' }}>*</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
              <StarRating
                rating={rating}
                onRatingChange={(newVal) => {
                  setRating(newVal);
                  setError('');
                }}
                size="lg"
                ariaLabel="Select Star Rating"
              />
            </div>

            <div
              style={{
                minHeight: '22px',
                marginTop: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: rating > 0 ? '#fbbf24' : 'var(--text-muted)',
              }}
            >
              {RATING_LABELS[rating] || 'Select from 1 to 5 stars'}
            </div>
          </div>

          {/* Comment Textarea */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label
                htmlFor="rating-comment"
                style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                Written Review (Optional)
              </label>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: comment.length > 900 ? 'var(--color-red)' : 'var(--text-muted)',
                }}
              >
                {comment.length} / 1000
              </span>
            </div>
            <textarea
              id="rating-comment"
              rows={4}
              maxLength={1000}
              placeholder={
                isDonorRatingNgo
                  ? 'Share how smoothly the food pickup and distribution went...'
                  : 'Share how well-packed and ready the donation was...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-orange)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || rating < 1}
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--grad-primary)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading || rating < 1 ? 'not-allowed' : 'pointer',
                opacity: rating < 1 ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Submitting...
                </>
              ) : (
                'Submit Review ⭐'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
