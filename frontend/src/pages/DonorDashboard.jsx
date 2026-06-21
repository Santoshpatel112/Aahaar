import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import { useWallet } from '../context/WalletContext';

function SkeletonStatCard() {
  return (
    <div style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', gap: 16 }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
      </div>
    </div>
  );
}

function SkeletonDonation() {
  return (
    <div style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 16, width: '30%' }} />
        <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 99 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 26, width: 90, borderRadius: 99 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div className="skeleton" style={{ height: 12, width: 100 }} />
        <div className="skeleton" style={{ height: 12, width: 80 }} />
      </div>
    </div>
  );
}

const FILTER_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'done'];

// Normalize status for display/filtering
const normalizeStatusForFilter = (status) => {
  const s = (status || '').toUpperCase().replace(/_/g, '');
  if (s === 'PENDINGNGOACCEPTANCE') return 'pending';
  if (s === 'NGOACCEPTED' || s === 'REQUESTACCEPTED' || s === 'APPROVED') return 'approved';
  if (s === 'DONE' || s === 'COMPLETED') return 'done';
  if (s === 'REJECTED') return 'rejected';
  return (status || '').toLowerCase();
};

export default function DonorDashboard() {
  const { user, logout, uploadAadhaar, refreshUser } = useAuth();
  const { contracts, walletAddress, isConnected } = useWallet();
  const [reputation, setReputation] = useState(0);

  useEffect(() => {
    const fetchReputation = async () => {
      if (contracts?.ReputationSystem && walletAddress) {
        try {
          const rep = await contracts.ReputationSystem.getReputation(walletAddress);
          setReputation(Number(rep));
        } catch (err) {
          console.error("Error fetching reputation score:", err);
        }
      }
    };
    fetchReputation();
  }, [contracts, walletAddress]);

  const navigate = useNavigate();
  const location = useLocation();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewPass, setViewPass] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [passType, setPassType] = useState('donation'); // 'donation' | 'request'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('donor_sidebar_collapsed') === 'true');

  const toggleSidebar = () => {
    const val = !sidebarCollapsed;
    setSidebarCollapsed(val);
    localStorage.setItem('donor_sidebar_collapsed', String(val));
  };

  // NGO Requests Fulfillments State
  const [activeRequests, setActiveRequests] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [acceptModal, setAcceptModal] = useState(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [panEdit, setPanEdit] = useState(false);
  const [panValue, setPanValue] = useState(user?.panNumber || '');
  const [savingPan, setSavingPan] = useState(false);
  const [panFile, setPanFile] = useState(null);


  const donorId = user?._id || user?.id;

  const fetchNgoRequestsData = useCallback(async () => {
    try {
      const activeRes = await api.get('/aahar/ngo-food-requests/active');
      setActiveRequests(activeRes.data?.requests || []);
      const fulRes = await api.get('/aahar/ngo-food-requests/my-fulfillments');
      setFulfillments(fulRes.data?.requests || []);
    } catch (err) {
      console.log('Error fetching NGO requests for donor', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!donorId) return;
    setLoading(true);
    try {
      const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
      const data = res.data?.data || res.data;
      setDonations(data?.recentDonations || data?.donations || []);
      await fetchNgoRequestsData();
    } catch {
      showToast('Could not load your donations', 'error');
    } finally {
      setLoading(false);
    }
  }, [donorId, fetchNgoRequestsData]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchData();
      }
    };
    load();
    return () => { active = false; };
  }, [fetchData]);

  // Fetch updated user profile (like verification status) on mount
  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
  }, [refreshUser]);

  // Listen for socket notification events to trigger real-time dashboard data refresh
  useEffect(() => {
    const handleNotification = (e) => {
      const notification = e.detail;
      // Refresh donor dashboard data when a request/donation status changes
      if (
        notification &&
        (notification.type === 'FOOD_REQUEST_ACCEPTED' ||
         notification.type === 'FOOD_REQUEST_FULFILLED' ||
         notification.type === 'DONATION_APPROVED' ||
         notification.type === 'DONATION_REJECTED' ||
         notification.type === 'DONATION_COMPLETED' ||
         notification.type === 'USER_VERIFIED')
      ) {
        fetchData();
        if (notification.type === 'USER_VERIFIED' && refreshUser) {
          refreshUser();
        }
      }
    };
    window.addEventListener('notification-received', handleNotification);
    return () => {
      window.removeEventListener('notification-received', handleNotification);
    };
  }, [fetchData, refreshUser]);


  // Handle auto-opening the Fulfill Request modal when redirected from Navbar notifications dropdown
  useEffect(() => {
    if (location.state?.fulfillRequestId && activeRequests.length > 0) {
      const targetReq = activeRequests.find(r => r._id === location.state.fulfillRequestId);
      if (targetReq) {
        setTimeout(() => {
          setAcceptModal(targetReq);
        }, 0);
        // Clear location state immediately to prevent popping open on page reload
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, activeRequests]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/aahar/foodInfo/deleteFoodInfo/${id}`);
      showToast('Donation deleted successfully', 'success');
      setDonations((prev) => prev.filter((d) => d._id !== id));
      setDeleteConfirm(null);
    } catch {
      showToast('Could not delete donation', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAcceptRequest = async (e) => {
    e.preventDefault();
    if (!expectedDate) {
      showToast('Please specify expected delivery date and time', 'error');
      return;
    }
    setAccepting(true);
    try {
      if (isConnected && contracts?.Donation) {
        try {
          showToast("Initiating Polygon blockchain transaction... 🦊", "info");
          const onChainReqId = acceptModal.verificationToken && acceptModal.verificationToken.startsWith("TX-")
            ? Number(acceptModal.verificationToken.replace("TX-", ""))
            : 1;
          
          const tx = await contracts.Donation.acceptDonation(onChainReqId, "");
          showToast("Confirming transaction... ⏳", "info");
          await tx.wait();
          showToast("Confirmed on Polygon! 🎉", "success");
        } catch (blockchainErr) {
          console.error("Blockchain transaction failed:", blockchainErr);
          showToast("Blockchain transaction failed or skipped, proceeding with database update. ⚠️", "warning");
        }
      }

      const res = await api.put(`/aahar/ngo-food-requests/${acceptModal._id}/accept`, { expectedDeliveryDate: expectedDate });
      showToast('You have accepted this food request! Verification token generated.', 'success');
      setAcceptModal(null);
      setExpectedDate('');
      fetchData();
      if (res.data?.request) {
        setPassType('request');
        setViewPass(res.data.request);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to accept request', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleSavePan = async (e) => {
    e.preventDefault();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panValue.trim().toUpperCase())) {
      showToast('Please enter a valid 10-character PAN (e.g. ABCDE1234F)', 'error');
      return;
    }

    if (!panFile && !user?.panVerificationDocument) {
      showToast('Please upload a PAN card verification document (Image or PDF)', 'error');
      return;
    }

    setSavingPan(true);
    try {
      const formData = new FormData();
      formData.append('panNumber', panValue.trim().toUpperCase());
      if (panFile) {
        formData.append('panVerificationDocument', panFile);
      }

      await api.post('/aahar/users/user-pan-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('PAN details and document submitted successfully! Awaiting admin verification. ⏳', 'success');
      setPanEdit(false);
      setPanFile(null);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit PAN verification request', 'error');
    } finally {
      setSavingPan(false);
    }
  };

  const handleDownloadReceipt = async (donationId) => {
    setDownloadingReceiptId(donationId);
    try {
      showToast('Compiling and generating PDF receipt... ⏳', 'info');
      const res = await api.get(`/aahar/foodInfo/receipt/${donationId}`, {
        responseType: 'blob'
      });
      
      const file = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Donation_Receipt_${donationId.slice(-6).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Tax receipt downloaded successfully! 📄', 'success');
    } catch (err) {
      console.error("Failed to download receipt:", err);
      showToast(err.response?.data?.message || 'Could not download receipt. Please check your network connection.', 'error');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/');
  };

  const completedFulfillmentsList = fulfillments.filter(f => 
    ['fulfilled', 'completed', 'done'].includes((f.status || '').toLowerCase())
  );

  const completedFulfillments = completedFulfillmentsList.length;

  const allDonationsList = [
    ...donations.map(d => ({ ...d, isFulfillment: false })),
    ...completedFulfillmentsList.map(f => ({
      ...f,
      isFulfillment: true,
      status: 'done',
      foodItemDetails: f.foodItemsNeeded?.map(it => ({
        foodName: it.foodName,
        quantity: it.quantity,
        quantityType: it.quantityType,
        category: it.category || 'Fulfillment'
      })),
      pickedUpByNgo: f.ngoId ? {
        ngoName: f.ngoId.ngoName,
        ngoPhone: f.ngoId.ngoPhone || f.contactDetails?.phoneNumber,
        ngoEmail: f.ngoId.ngoEmail || f.contactDetails?.email,
        ngoAddress: f.ngoId.ngoAddress || f.contactDetails?.deliveryAddress,
        ngoCity: f.ngoId.ngoCity || f.contactDetails?.city
      } : null,
      contactDetails: {
        city: f.contactDetails?.city || f.ngoId?.ngoCity,
        contactPersonName: f.contactDetails?.contactPersonName || f.ngoId?.ngoName,
        fullAddress: f.contactDetails?.deliveryAddress || f.ngoId?.ngoAddress,
      },
      completedAt: f.updatedAt || f.createdAt
    }))
  ];

  const total = donations.length + completedFulfillments;
  const pending = donations.filter(d => normalizeStatusForFilter(d.status) === 'pending').length;
  const approved = donations.filter(d => normalizeStatusForFilter(d.status) === 'approved').length;
  const rejected = donations.filter(d => normalizeStatusForFilter(d.status) === 'rejected').length;
  const done = donations.filter(d => normalizeStatusForFilter(d.status) === 'done').length + completedFulfillments;

  const filtered = filter === 'all' ? allDonationsList : allDonationsList.filter(d => normalizeStatusForFilter(d.status) === filter);

  const stats = [
    { label: 'Total Donated', value: total, icon: '📦', grad: 'var(--grad-primary)', sub: 'All time' },
    { label: 'Pending', value: pending, icon: '⏳', grad: 'linear-gradient(135deg,#eab308,#d97706)', sub: 'Awaiting review' },
    { label: 'Approved', value: approved, icon: '✅', grad: 'var(--grad-green)', sub: 'Accepted by NGO' },
    { label: 'Rejected', value: rejected, icon: '❌', grad: 'var(--grad-red)', sub: 'Not accepted' },
    { label: 'Completed', value: done, icon: '🚚', grad: 'var(--grad-purple)', sub: 'Picked up / Done' },
  ];

  const avatarLetter = (user?.firstName || 'U')[0].toUpperCase();
  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-layout" style={{ '--sidebar-w': sidebarCollapsed ? '78px' : '260px' }}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar" style={{ padding: sidebarCollapsed ? '24px 10px' : '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 20 }}>
          {!sidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.05rem', fontWeight: 800 }}>
              <span>🌾</span>
              <span className="gradient-text" style={{ fontWeight: 800 }}>Aahaar</span>
            </div>
          ) : (
            <span style={{ fontSize: '1.4rem' }}>🌾</span>
          )}
          <button 
            onClick={toggleSidebar} 
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              marginLeft: sidebarCollapsed ? 0 : 8,
              marginTop: sidebarCollapsed ? 8 : 0
            }}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-orange)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {!sidebarCollapsed && <div className="dashboard-sidebar__nav-section-title">Navigation</div>}
        {sidebarCollapsed && <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0 8px' }} />}
        <nav className="dashboard-sidebar__nav">
          <div className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active" style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '11px 0' : '11px 14px' }} title={sidebarCollapsed ? "Overview" : undefined}>
            {sidebarCollapsed ? (
              <span style={{ fontSize: '1.2rem' }}>📊</span>
            ) : (
              <><span>📊</span> Overview</>
            )}
          </div>
          <Link to="/donate" className="dashboard-sidebar__nav-item" style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '11px 0' : '11px 14px' }} title={sidebarCollapsed ? "New Donation" : undefined}>
            {sidebarCollapsed ? (
              <span style={{ fontSize: '1.2rem' }}>➕</span>
            ) : (
              <><span>➕</span> New Donation</>
            )}
          </Link>
          <Link to="/ngo-dashboard" className="dashboard-sidebar__nav-item" style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '11px 0' : '11px 14px' }} title={sidebarCollapsed ? "NGO Portal" : undefined}>
            {sidebarCollapsed ? (
              <span style={{ fontSize: '1.2rem' }}>🏢</span>
            ) : (
              <><span>🏢</span> NGO Portal</>
            )}
          </Link>
          <Link to="/" className="dashboard-sidebar__nav-item" style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '11px 0' : '11px 14px' }} title={sidebarCollapsed ? "Home" : undefined}>
            {sidebarCollapsed ? (
              <span style={{ fontSize: '1.2rem' }}>🏠</span>
            ) : (
              <><span>🏠</span> Home</>
            )}
          </Link>
        </nav>

        {!sidebarCollapsed && (
          <>
            <div className="dashboard-sidebar__nav-section-title" style={{ marginTop: 8 }}>Impact</div>
            <div style={{ padding: '12px 14px', background: 'rgba(249,115,22,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(249,115,22,0.15)', margin: '0 0 12px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-orange)' }}>{approved + done}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Donations Approved</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: total > 0 ? `${((approved + done) / total) * 100}%` : '0%', background: 'var(--grad-primary)', borderRadius: 99, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {total > 0 ? Math.round(((approved + done) / total) * 100) : 0}% success rate
              </div>
            </div>
          </>
        )}

        <div className="dashboard-sidebar__user" style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '16px 0 0' : '16px 8px 0' }}>
          <div className="dashboard-sidebar__avatar" title={sidebarCollapsed ? `${user?.firstName} (Donor)` : undefined}>
            {avatarLetter}
          </div>
          {!sidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.surname}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                📍 {user?.city}
              </div>
              {user?.isVerified ? (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✓</span> Verified Donor
                </div>
              ) : user?.adharVerificationDocument ? (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⏳</span> Pending Verify
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✕</span> Unverified Account
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--color-teal)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⭐</span> Reputation: {reputation} pts
              </div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} style={{ width: '100%', marginTop: 10, padding: sidebarCollapsed ? '10px 0' : '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--color-red)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: sidebarCollapsed ? 0 : 8, transition: 'all 0.2s' }}
          title={sidebarCollapsed ? "Logout" : undefined}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}>
          <span>🚪</span> {!sidebarCollapsed && 'Logout'}
        </button>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        {/* Mobile Navigation */}
        <div className="dashboard-mobile-nav">
          <Link to="/donate" className="dashboard-mobile-nav-item dashboard-mobile-nav-item--active">
            ➕ Donate Food
          </Link>
          <Link to="/ngo-dashboard" className="dashboard-mobile-nav-item">
            🏢 NGO Portal
          </Link>
          <Link to="/" className="dashboard-mobile-nav-item">
            🏠 Home
          </Link>
          <button 
            className="dashboard-mobile-nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--color-red)', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            🚪 Logout
          </button>
        </div>

        {/* Header */}
        <div className="dashboard-header">
          <div>
            <div className="breadcrumb">
              <span>🏠</span><span>/</span><span>Dashboard</span>
            </div>
            <h1 className="dashboard-header__title">
              {timeOfDay()}, <span className="gradient-text">{user?.firstName}! 👋</span>
            </h1>
            <p className="dashboard-header__subtitle">
              Manage your food donations and track their impact on the community.
            </p>
          </div>
          <Link to="/donate" className="btn-primary" style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
            ➕ New Donation
          </Link>
        </div>

        {/* Verification Banner */}
        {!user?.isVerified && (
          <div style={{
            background: 'rgba(17,24,39,0.7)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            borderColor: user?.adharVerificationDocument ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'
          }}>
            <div style={{ flex: 1, minWidth: 285 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {user?.adharVerificationDocument ? 'Aadhaar Verification Pending' : 'Verify Your Identity'}
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {user?.adharVerificationDocument
                  ? 'Your Aadhaar document has been uploaded successfully and is currently under review by our admin team.'
                  : 'To build trust in our donation community, please upload your Aadhaar card (PDF, JPG, or PNG). Once verified, you will be able to make approved donations.'}
              </p>
            </div>
            {!user?.adharVerificationDocument && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  📁 Select Aadhaar
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 5 * 1024 * 1024) {
                        showToast('File size must be less than 5MB', 'error');
                        return;
                      }

                      const res = await uploadAadhaar(file);
                      if (res.success) {
                        showToast('Aadhaar uploaded successfully! Awaiting verification.', 'success');
                      } else {
                        showToast(res.error || 'Upload failed', 'error');
                      }
                    }}
                  />
                </label>
              </div>
            )}
            {user?.adharVerificationDocument && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-yellow)', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(234,179,8,0.08)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.15)' }}>
                  <span>⏳</span> Review in Progress
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tax Exemption (PAN) Profile Card */}
        <div style={{
          background: 'rgba(17,24,39,0.7)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          borderColor: user?.isPanVerified || user?.panVerificationStatus === 'approved' ? 'rgba(34,197,94,0.3)' : user?.panVerificationStatus === 'pending' ? 'rgba(234,179,8,0.3)' : user?.panVerificationStatus === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* subtle decorative background glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 120,
            height: 120,
            background: `radial-gradient(circle, ${user?.isPanVerified || user?.panVerificationStatus === 'approved' ? 'rgba(34,197,94,0.15)' : user?.panVerificationStatus === 'pending' ? 'rgba(234,179,8,0.15)' : user?.panVerificationStatus === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.1)'} 0%, transparent 70%)`,
            pointerEvents: 'none'
          }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '1.25rem' }}>📄</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Section 80G Tax Exemption Profile (PAN)
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Provide your Permanent Account Number (PAN) and upload its document. Once verified by our admin, you will receive legal tax exemption benefits under Section 80G for all completed donations.
              </p>
            </div>
            
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: user?.isPanVerified || user?.panVerificationStatus === 'approved' ? 'var(--color-green)' : user?.panVerificationStatus === 'pending' ? 'var(--color-yellow)' : user?.panVerificationStatus === 'rejected' ? 'var(--color-red)' : 'var(--color-orange)', 
              background: `${user?.isPanVerified || user?.panVerificationStatus === 'approved' ? 'var(--color-green)' : user?.panVerificationStatus === 'pending' ? 'var(--color-yellow)' : user?.panVerificationStatus === 'rejected' ? 'var(--color-red)' : 'var(--color-orange)'}15`, 
              padding: '6px 14px', 
              borderRadius: 20, 
              border: `1px solid ${user?.isPanVerified || user?.panVerificationStatus === 'approved' ? 'var(--color-green)' : user?.panVerificationStatus === 'pending' ? 'var(--color-yellow)' : user?.panVerificationStatus === 'rejected' ? 'var(--color-red)' : 'var(--color-orange)'}30`,
              whiteSpace: 'nowrap'
            }}>
              {user?.isPanVerified || user?.panVerificationStatus === 'approved' ? '✓ Verified' : user?.panVerificationStatus === 'pending' ? '⏳ Verification Pending' : user?.panVerificationStatus === 'rejected' ? '✕ Verification Rejected' : '⚠️ No PAN Added'}
            </div>
          </div>

          {((panEdit || !user?.panNumber || user?.panVerificationStatus === 'none' || user?.panVerificationStatus === 'rejected')) ? (
            <form onSubmit={handleSavePan} style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <div className="form-group" style={{ flex: '1 1 250px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>PAN Card Number *</label>
                  <input
                    type="text"
                    placeholder="Enter 10-character PAN (e.g. ABCDE1234F)"
                    value={panValue}
                    onChange={(e) => setPanValue(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="form-input"
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      letterSpacing: 1.5,
                      color: 'var(--text-primary)',
                      background: 'rgba(0,0,0,0.2)',
                      borderColor: 'var(--border-color)',
                      width: '100%',
                    }}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ flex: '1 1 250px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>PAN Verification Document (PDF/Image) *</label>
                  <label className="btn-secondary" style={{ 
                    padding: '10px 16px', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 8,
                    height: '42px',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    📁 {panFile ? panFile.name : 'Select PDF or Image'}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: 'none' }}
                      required={!user?.panVerificationDocument}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showToast('File size must be less than 5MB', 'error');
                            return;
                          }
                          setPanFile(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                {user?.panNumber && (
                  <button type="button" className="btn-ghost" style={{ padding: '10px 20px', fontSize: '0.85rem' }} onClick={() => { setPanEdit(false); setPanValue(user?.panNumber || ''); setPanFile(null); }} disabled={savingPan}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem', border: 'none', color: '#fff' }} disabled={savingPan}>
                  {savingPan ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: 16, 
              borderTop: '1px solid var(--border-color)', 
              paddingTop: 16 
            }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>PAN Number</div>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: 1.5 }}>{user.panNumber}</strong>
                </div>
                {user.panVerificationDocument && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Verification File</div>
                    <a href={user.panVerificationDocument} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--color-teal)', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      📄 Open Document
                    </a>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {user.panVerificationStatus === 'rejected' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginRight: 16 }}>
                    <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>Reason: {user.panRejectedReason}</span>
                  </div>
                )}
                <button className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => { setPanEdit(true); setPanValue(user.panNumber); }}>
                  ✏️ Edit PAN / Resubmit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stat Cards */}
        <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
          {loading ? (
            [1, 2, 3, 4, 5].map(i => <SkeletonStatCard key={i} />)
          ) : stats.map((s, i) => (
            <div key={i} className="dash-stat-card" style={{ animationDelay: `${i * 0.08}s`, animation: 'fadeInUp 0.4s ease both' }}>
              <div className="dash-stat-card__icon" style={{ background: s.grad }}>{s.icon}</div>
              <div>
                <div className="dash-stat-card__value" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {s.value}
                </div>
                <div className="dash-stat-card__label">{s.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Donations Section */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h2 className="dashboard-section__title">My Donations</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {filtered.length} donation{filtered.length !== 1 ? 's' : ''} {filter !== 'all' ? `(${filter})` : 'total'}
              </p>
            </div>
            <Link to="/donate" className="btn-teal" style={{ fontSize: '0.85rem', padding: '8px 18px' }}>
              ➕ Add New
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            {FILTER_OPTIONS.map(opt => (
              <button key={opt} className={`filter-btn ${filter === opt ? 'filter-btn--active' : ''}`} onClick={() => setFilter(opt)}>
                {opt === 'all' ? 'All' : opt === 'done' ? 'Completed' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                {opt !== 'all' && (
                  <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.1)', padding: '0px 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                    {allDonationsList.filter(d => normalizeStatusForFilter(d.status) === opt).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              [1, 2, 3].map(i => <SkeletonDonation key={i} />)
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🍱</div>
                <h3 className="empty-state__title">
                  {filter === 'all' ? 'No donations yet' : `No ${filter} donations`}
                </h3>
                <p className="empty-state__text">
                  {filter === 'all' ? 'Start donating food to make a difference in your community!' : `You have no ${filter} donations right now.`}
                </p>
                {filter === 'all' && (
                  <Link to="/donate" className="btn-primary" style={{ marginTop: 20 }}>
                    🚀 Donate Now
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((donation, idx) => (
                <div key={donation._id} className="donation-card" style={{ animationDelay: `${idx * 0.06}s`, animation: 'fadeInUp 0.4s ease both' }}>
                  <div className="donation-card__header">
                    <div>
                      <div className="donation-card__id">#{String(donation._id).slice(-10).toUpperCase()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <StatusBadge status={(donation.status === 'pending' && donation.adminInReview) ? 'inreview' : donation.status} />
                  </div>

                  <div className="donation-card__items">
                    {(donation.foodItemDetails || []).map((item, i) => (
                      <span key={i} className="donation-card__item-tag">
                        {item.foodName} · {item.quantity}{item.quantityType}
                      </span>
                    ))}
                  </div>

                  <div className="donation-card__meta">
                    {donation.contactDetails?.city && (
                      <span className="donation-card__meta-item">📍 {donation.contactDetails.city}</span>
                    )}
                    {donation.contactDetails?.contactPersonName && (
                      <span className="donation-card__meta-item">👤 {donation.contactDetails.contactPersonName}</span>
                    )}
                    {(donation.foodItemDetails || []).length > 0 && (
                      <span className="donation-card__meta-item">🍽️ {(donation.foodItemDetails || []).length} item{(donation.foodItemDetails || []).length !== 1 ? 's' : ''}</span>
                    )}
                    {donation.status === 'pending' && donation.adminInReview && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--color-teal)' }}>🔍 Under Admin Review</span>
                    )}
                  </div>

                  {donation.status === 'rejected' && donation.rejectedReason && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171' }}>
                      ⚠️ Reason: {donation.rejectedReason}
                    </div>
                  )}

                  <div className="donation-card__actions" style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    {donation.status === 'pending' && (
                      <button className="btn-danger" style={{ fontSize: '0.8rem', padding: '7px 14px', marginRight: 'auto' }} onClick={() => setDeleteConfirm(donation._id)}>
                        🗑 Delete
                      </button>
                    )}
                    <button 
                      type="button"
                      className="btn-secondary" 
                      style={{ fontSize: '0.8rem', padding: '7px 14px', marginLeft: donation.status === 'pending' ? 0 : 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                      onClick={() => setViewDetails(donation)}
                    >
                      ℹ️ Details
                    </button>
                    {donation.verificationToken && normalizeStatusForFilter(donation.status) !== 'rejected' && normalizeStatusForFilter(donation.status) !== 'done' && (
                      <button 
                        className="btn-teal" 
                        style={{ fontSize: '0.8rem', padding: '7px 14px', background: 'var(--grad-teal)', border: 'none', color: '#fff' }}
                        onClick={() => setViewPass(donation)}
                      >
                        🔑 Pickup Pass
                      </button>
                    )}
                    {normalizeStatusForFilter(donation.status) === 'done' && (
                      <button 
                        className="btn-teal" 
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '7px 14px', 
                          background: user?.isPanVerified ? 'var(--grad-teal)' : 'rgba(255,255,255,0.05)', 
                          border: user?.isPanVerified ? 'none' : '1px solid var(--border-color)', 
                          color: user?.isPanVerified ? '#fff' : 'var(--text-muted)',
                          cursor: user?.isPanVerified ? 'pointer' : 'not-allowed'
                        }}
                        onClick={() => {
                          if (!user?.isPanVerified) {
                            showToast('PAN verification is required to download Section 80G tax receipts.', 'warning');
                            return;
                          }
                          handleDownloadReceipt(donation._id);
                        }}
                        disabled={downloadingReceiptId === donation._id}
                        title={!user?.isPanVerified ? "Verify PAN in Profile to download receipt" : "Download Tax Exemption Receipt"}
                      >
                        {downloadingReceiptId === donation._id ? '⏳ Downloading...' : '📄 Download Receipt'}
                      </button>
                    )}
                  </div>

                  {/* Inline QR + code for accepted/NGO-accepted donations */}
                  {donation.verificationToken && (normalizeStatusForFilter(donation.status) === 'approved' || normalizeStatusForFilter(donation.status) === 'pending') && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Verification Code</div>
                        <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-orange)', letterSpacing: 3 }}>{donation.verificationToken}</strong>
                      </div>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=${encodeURIComponent(JSON.stringify({ type: 'donation', donationId: donation._id, verificationCode: donation.verificationToken, token: donation.verificationToken }))}`}
                        alt="QR"
                        style={{ width: 56, height: 56, borderRadius: 4, background: '#fff', padding: 2 }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* NGO Fulfillments Section */}
        {!loading && fulfillments.length > 0 && (
          <div className="dashboard-section" style={{ marginTop: 28 }}>
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">📦 My NGO Fulfillments</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Food requests you accepted to fulfill
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fulfillments.map((ful) => (
                <div key={ful._id} className="donation-card" style={{ borderLeft: '4px solid var(--color-purple)' }}>
                  <div className="donation-card__header">
                    <div>
                      <div className="donation-card__id">#{String(ful._id).slice(-10).toUpperCase()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        NGO: <strong style={{ color: 'var(--text-primary)' }}>{ful.ngoId?.ngoName}</strong>
                      </div>
                    </div>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
                      background: ['fulfilled', 'completed', 'done'].includes((ful.status || '').toLowerCase()) ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                      color: ['fulfilled', 'completed', 'done'].includes((ful.status || '').toLowerCase()) ? '#a78bfa' : '#60a5fa'
                    }}>
                      {['fulfilled', 'completed', 'done'].includes((ful.status || '').toLowerCase()) ? '🚚 Completed' : '⏳ Accepted'}
                    </span>
                  </div>

                  <div className="donation-card__items">
                    {(ful.foodItemsNeeded || []).map((item, i) => (
                      <span key={i} className="donation-card__item-tag" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc' }}>
                        {item.foodName} · {item.quantity}{item.quantityType}
                      </span>
                    ))}
                  </div>

                  <div className="donation-card__meta">
                    <span className="donation-card__meta-item">📍 Delivery to: {ful.contactDetails?.deliveryAddress}, {ful.contactDetails?.city}</span>
                    <span className="donation-card__meta-item">📅 Expected Delivery: {new Date(ful.expectedDeliveryDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {ful.contactDetails && (
                    <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>🏢 NGO Representative: <strong>{ful.contactDetails.contactPersonName}</strong></div>
                      <div>📞 Phone: <strong>{ful.contactDetails.phoneNumber}</strong></div>
                      <div>✉️ Email: <strong>{ful.contactDetails.email}</strong></div>
                    </div>
                  )}

                  {!['fulfilled', 'completed', 'done'].includes((ful.status || '').toLowerCase()) && (
                    <div className="donation-card__actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button 
                        className="btn-teal" 
                        style={{ fontSize: '0.8rem', padding: '7px 14px', background: 'var(--grad-purple)', border: 'none', color: '#fff' }}
                        onClick={() => { setPassType('request'); setViewPass(ful); }}
                      >
                        🔑 Delivery Pass
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open NGO Food Requests Section */}
        {!loading && (
          <div className="dashboard-section" style={{ marginTop: 28 }}>
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">🏥 Active NGO Food Needs</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Help local NGOs by donating food to fulfill these active requests
                </p>
              </div>
            </div>

            {activeRequests.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', margin: '16px 24px' }}>
                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 8 }}>🌾</span>
                No active food requests from NGOs at the moment.
              </div>
            ) : (
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeRequests.map((req) => (
                  <div key={req._id} className="donation-card" style={{ borderLeft: '4px solid var(--color-orange)' }}>
                    <div className="donation-card__header">
                      <div>
                        <div className="donation-card__id">{req.ngoId?.ngoName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          📍 {req.ngoId?.ngoCity}, {req.ngoId?.ngoState}
                        </div>
                      </div>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
                        background: req.urgencyLevel === 'critical' ? 'rgba(239,68,68,0.15)' : req.urgencyLevel === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(234,179,8,0.15)',
                        color: req.urgencyLevel === 'critical' ? '#f87171' : req.urgencyLevel === 'high' ? '#fb923c' : '#fbbf24'
                      }}>
                        ⚡ {req.urgencyLevel?.toUpperCase()} Urgency
                      </span>
                    </div>

                    <div className="donation-card__items">
                      {(req.foodItemsNeeded || []).map((item, i) => (
                        <span key={i} className="donation-card__item-tag" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)' }}>
                          {item.foodName} · {item.quantity}{item.quantityType} ({item.category})
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '8px 0 14px' }}>
                      <strong>Purpose:</strong> {req.purpose}
                    </div>

                    <div className="donation-card__actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-primary" 
                        style={{ fontSize: '0.8rem', padding: '7px 18px', border: 'none', color: '#fff' }}
                        onClick={() => setAcceptModal(req)}
                      >
                        🤝 Fulfill Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick tips */}
        {!loading && donations.length > 0 && (
          <div style={{ marginTop: 24, padding: '20px 24px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-teal)' }}>Pro Tip</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Add accurate expiry dates and food details to increase the chances of your donation being approved quickly.</div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__icon">🗑️</div>
            <h3 className="modal__title">Delete Donation?</h3>
            <p className="modal__text">This action is permanent and cannot be undone. The donation record will be removed from the system.</p>
            <div className="modal__actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <><span className="spinner" /> Deleting...</> : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup/Delivery Pass Modal */}
      {viewPass && (
        <div className="modal-overlay" onClick={() => setViewPass(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <h3 className="modal__title" style={{ fontSize: '1.2rem', marginBottom: 12 }}>
              🎫 Food {passType === 'request' ? 'Delivery' : 'Pickup'} Pass
            </h3>
            <p className="modal__text" style={{ fontSize: '0.82rem', marginBottom: 16, color: 'var(--text-secondary)' }}>
              Show this QR code or share the 6-character token with the NGO representative at the time of delivery to verify.
            </p>
            
            {/* QR Code Container */}
            <div style={{ 
              background: '#ffffff', 
              padding: 16, 
              borderRadius: 12, 
              width: 182, 
              height: 182, 
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({
                  type: passType,
                  id: viewPass._id,
                  donationId: viewPass._id,
                  donorId,
                  ngoId: viewPass.ngoPreference,
                  token: viewPass.verificationToken,
                  verificationCode: viewPass.verificationToken
                }))}`}
                alt="Donation QR Pass"
                style={{ width: 150, height: 150 }}
              />
            </div>

            {/* Token Code */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Verification Token
              </div>
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: '1.6rem', 
                fontWeight: 800, 
                color: 'var(--color-orange)', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '8px 16px',
                display: 'inline-block',
                letterSpacing: 3
              }}>
                {viewPass.verificationToken}
              </div>
            </div>

            <div className="modal__actions" style={{ justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setViewPass(null)}>Close Pass</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Request Modal */}
      {acceptModal && (
        <div className="modal-overlay" onClick={() => !accepting && setAcceptModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 className="modal__title">🤝 Fulfill Food Request</h3>
            <p className="modal__text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are accepting to fulfill the food needs for <strong>{acceptModal.ngoId?.ngoName}</strong>. 
              Please specify when you will deliver or have the food ready for pickup.
            </p>
            
            <form onSubmit={handleAcceptRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div className="form-group">
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

              <div className="modal__actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <button type="button" className="btn-ghost" onClick={() => setAcceptModal(null)} disabled={accepting}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ border: 'none', color: '#fff' }} disabled={accepting}>
                  {accepting ? 'Confirming...' : 'Confirm Fulfillment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donation Details Modal */}
      {viewDetails && (
        <div className="modal-overlay" onClick={() => setViewDetails(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: '95%', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <h3 className="modal__title" style={{ fontSize: '1.25rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🍱 Donation Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Id & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Donation ID</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem' }}>#{viewDetails._id}</div>
                </div>
                <StatusBadge status={(viewDetails.status === 'pending' && viewDetails.adminInReview) ? 'inreview' : viewDetails.status} />
              </div>

              {/* Recipient Details */}
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-teal)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🤝 Recipient Information
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {['done', 'completed', 'fulfilled'].includes((viewDetails.status || '').toLowerCase()) ? (
                    viewDetails.pickedUpByNgo ? (
                      <div>
                        <div>NGO: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.pickedUpByNgo.ngoName}</strong></div>
                        <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.pickedUpByNgo.ngoPhone}</strong></div>
                        <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.pickedUpByNgo.ngoEmail}</strong></div>
                        <div>Location: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.pickedUpByNgo.ngoAddress}, {viewDetails.pickedUpByNgo.ngoCity}</strong></div>
                      </div>
                    ) : viewDetails.ngoPreference && viewDetails.ngoPreference !== 'random' ? (
                      <div>
                        <div>NGO: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoName}</strong></div>
                        <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoPhone}</strong></div>
                        <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoEmail}</strong></div>
                        <div>Location: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoAddress}, {viewDetails.ngoPreference.ngoCity}</strong></div>
                      </div>
                    ) : (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Directly Donated to Platform (Aahaar)</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>Food was collected and distributed directly to the needy by Aahaar volunteers.</div>
                      </div>
                    )
                  ) : (
                    viewDetails.ngoPreference && viewDetails.ngoPreference !== 'random' ? (
                      <div>
                        <div>Assigned NGO: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoName}</strong></div>
                        <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoPhone}</strong></div>
                        <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoEmail}</strong></div>
                        <div>Location: <strong style={{ color: 'var(--text-primary)' }}>{viewDetails.ngoPreference.ngoAddress}, {viewDetails.ngoPreference.ngoCity}</strong></div>
                      </div>
                    ) : (
                      <div>
                        <div>Assigned to: <strong style={{ color: 'var(--text-primary)' }}>Directly Donate to Platform (Aahaar)</strong></div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>Pending administrative matching or direct volunteer pickup.</div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* What was Donated */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, color: 'var(--color-orange)' }}>
                  📦 Food Items Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(viewDetails.foodItemDetails || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.foodName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 8 }}>({item.category})</span>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--color-orange)' }}>
                        {item.quantity}{item.quantityType}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address / Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.82rem', borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Created At</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{viewDetails.createdAt ? new Date(viewDetails.createdAt).toLocaleString('en-IN') : '—'}</div>
                </div>
                {viewDetails.completedAt && (
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Completed At</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-green)' }}>{new Date(viewDetails.completedAt).toLocaleString('en-IN')}</div>
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Pickup Location</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{viewDetails.contactDetails?.fullAddress}, {viewDetails.contactDetails?.city}</div>
                </div>
              </div>

              {/* Rejection Details */}
              {viewDetails.status === 'rejected' && viewDetails.rejectedReason && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, fontSize: '0.82rem', color: '#f87171' }}>
                  ⚠️ <strong>Rejection Reason:</strong> {viewDetails.rejectedReason}
                </div>
              )}
            </div>

            <div className="modal__actions" style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 14, justifyContent: 'flex-end', gap: 10 }}>
              {normalizeStatusForFilter(viewDetails.status) === 'done' && (
                <button 
                  className="btn-teal" 
                  style={{ 
                    fontSize: '0.85rem', 
                    padding: '8px 18px', 
                    background: user?.isPanVerified ? 'var(--grad-teal)' : 'rgba(255,255,255,0.05)', 
                    border: user?.isPanVerified ? 'none' : '1px solid var(--border-color)', 
                    color: user?.isPanVerified ? '#fff' : 'var(--text-muted)',
                    cursor: user?.isPanVerified ? 'pointer' : 'not-allowed'
                  }}
                  onClick={() => { 
                    if (!user?.isPanVerified) {
                      showToast('PAN verification is required to download Section 80G tax receipts.', 'warning');
                      return;
                    }
                    handleDownloadReceipt(viewDetails._id); 
                    setViewDetails(null); 
                  }}
                  disabled={downloadingReceiptId === viewDetails._id}
                  title={!user?.isPanVerified ? "Verify PAN in Profile to download receipt" : "Download Tax Exemption Receipt"}
                >
                  {downloadingReceiptId === viewDetails._id ? '⏳ Downloading...' : '📄 Download Receipt'}
                </button>
              )}
              <button className="btn-ghost" onClick={() => setViewDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
