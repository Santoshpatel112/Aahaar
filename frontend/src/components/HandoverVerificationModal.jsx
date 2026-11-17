import { useState, useRef } from 'react';
import api from '../api/axios';
import { showToast } from './Toast';

export default function HandoverVerificationModal({ isOpen, onClose, delivery, onSuccess }) {
  const [code, setCode] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen || !delivery) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file (JPG, PNG).', 'error');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 4 || !/^\d{4}$/.test(cleanCode)) {
      setErrorMessage('Please enter the 4-digit confirmation code provided by the recipient.');
      return;
    }

    if (!photo) {
      setErrorMessage('Please attach a verification photo of the delivered food cartons.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('code', cleanCode);
      formData.append('dropoffPhoto', photo);

      const res = await api.post(`/aahar/foodInfo/handover/verify/${delivery._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showToast('🎉 Handover confirmed! Food delivery completed and donor notified.', 'success');
      if (onSuccess) onSuccess(res.data);
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to verify handover.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setCode('');
    setPhoto(null);
    setPhotoPreview(null);
    setErrorMessage('');
    onClose();
  };

  const recipientName = delivery.ngoPreference?.ngoName || delivery.pickedUpByNgo?.ngoName || 'Recipient NGO / Shelter';
  const recipientAddress = delivery.ngoPreference?.address || delivery.pickedUpByNgo?.address || delivery.contactDetails?.fullAddress || 'Designated Shelter';

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, borderRadius: 16, overflow: 'hidden', padding: 0 }}
      >
        {/* Header */}
        <div style={{ background: 'var(--grad-green, linear-gradient(135deg, #10b981 0%, #059669 100%))', color: '#fff', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📦</span> Delivery Handover Proof
            </h3>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
              disabled={submitting}
            >
              &times;
            </button>
          </div>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
            Confirm physical drop-off at {recipientName}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Summary Box */}
          <div style={{ background: 'var(--bg-muted, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', marginBottom: 4 }}>
              <strong>Drop-off Location:</strong> {recipientAddress}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
              <strong>Items:</strong> {delivery.foodItemDetails?.map(f => `${f.foodName} (${f.quantity || 1} ${f.quantityType || 'units'})`).join(', ')}
            </div>
          </div>

          {/* 4-Digit Code Input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
              Recipient 4-Digit Confirmation Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCode(val);
                  setErrorMessage('');
                }}
                placeholder="e.g. 5829"
                style={{
                  width: '100%',
                  fontSize: '1.5rem',
                  letterSpacing: '0.5em',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: 8,
                  border: errorMessage && !code ? '2px solid #ef4444' : '2px solid var(--border-color, #cbd5e1)',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: 'var(--bg-input, #fff)',
                  outline: 'none'
                }}
                disabled={submitting}
                autoFocus
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: 6 }}>
              Ask the recipient staff to read the 4-digit code shown on their screen.
            </p>
          </div>

          {/* Drop-off Photo Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
              Food Cartons Verification Photo <span style={{ color: '#ef4444' }}>*</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              disabled={submitting}
            />

            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-color, #cbd5e1)',
                  borderRadius: 10,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-muted, #f8fafc)',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-green, #10b981)' }}>
                  Take Photo or Upload Image
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                  Capture cartons/packages at the delivery location
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <img
                  src={photoPreview}
                  alt="Drop-off Proof Preview"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  disabled={submitting}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: '0.85rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClose}
              disabled={submitting}
              style={{ padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || code.length !== 4 || !photo}
              style={{
                background: (submitting || code.length !== 4 || !photo) ? '#94a3b8' : 'var(--grad-green, #10b981)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: (submitting || code.length !== 4 || !photo) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {submitting ? 'Verifying Handover...' : 'Complete Handover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

