export default function ProofModal({ isOpen, onClose, photoUrl, timestamp, details }) {
  if (!isOpen || !photoUrl) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, borderRadius: 16, overflow: 'hidden', padding: 0 }}
      >
        <div style={{ background: 'var(--grad-blue, linear-gradient(135deg, #1e293b 0%, #0f172a 100%))', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📸</span> Handover Delivery Proof
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)', background: '#000', marginBottom: 16 }}>
            <img
              src={photoUrl}
              alt="Delivered Cartons Proof"
              style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }}
            />
          </div>

          <div style={{ background: 'var(--bg-muted, #f8fafc)', borderRadius: 10, padding: 14, fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Verification Timestamp:</span>
              <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
                {timestamp ? new Date(timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Verified at drop-off'}
              </strong>
            </div>
            {details && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Drop-off Recipient:</span>
                <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{details}</strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button className="btn-ghost" onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8 }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

