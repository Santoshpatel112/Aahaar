import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from './Toast';
import { getSocket } from '../services/socket';

export default function SupportWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [viewState, setViewState] = useState('list'); // 'list', 'create', 'chat'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [issueType, setIssueType] = useState('food_donation');
  const [relatedId, setRelatedId] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);

  // Active chat states
  const [activeTicket, setActiveTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStatus, setChatStatus] = useState('open'); // 'open' or 'resolved'

  const chatEndRef = useRef(null);

  // Fetch user tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/aahar/support/my-tickets');
      setTickets(res.data || []);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load tickets on mount & login state changes
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      await Promise.resolve();
      if (!active) return;
      if (user && !user.isAdmin) {
        fetchTickets();
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [user]);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Socket listener for active chat
  useEffect(() => {
    if (!activeTicket) return;

    let socket = getSocket();
    
    const joinRoom = () => {
      socket = getSocket();
      if (socket) {
        socket.emit('join_ticket_room', activeTicket._id);
      }
    };

    joinRoom();

    // Event handlers
    const handleNewMessage = (data) => {
      if (data.ticketId === activeTicket._id) {
        setChatMessages((prev) => {
          // Avoid duplicate messages in list
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    const handleTicketResolved = (updatedTicket) => {
      if (updatedTicket._id === activeTicket._id) {
        setChatStatus('resolved');
        showToast('📣 Support Ticket marked as resolved and closed.', 'success');
      }
    };

    if (socket) {
      socket.on('connect', joinRoom);
      socket.on('ticket_message_received', handleNewMessage);
      socket.on('ticket_resolved', handleTicketResolved);
    }

    return () => {
      if (socket) {
        socket.emit('leave_ticket_room', activeTicket._id);
        socket.off('connect', joinRoom);
        socket.off('ticket_message_received', handleNewMessage);
        socket.off('ticket_resolved', handleTicketResolved);
      }
    };
  }, [activeTicket]);

  useEffect(() => {
    if (viewState === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, viewState]);

  // Open specific ticket chat
  const handleOpenChat = (ticket) => {
    setActiveTicket(ticket);
    setChatMessages(ticket.messages || []);
    setChatStatus(ticket.status);
    setViewState('chat');
  };

  // Submit new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('⚠️ Please provide a description of the issue.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('issueType', issueType);
      formData.append('relatedId', relatedId.trim());
      formData.append('urgency', urgency);
      formData.append('description', description.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api.post('/aahar/support', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('✅ Support ticket submitted successfully!', 'success');
      
      // Reset form fields
      setIssueType('food_donation');
      setRelatedId('');
      setUrgency('medium');
      setDescription('');
      setImageFile(null);

      // Refresh list and go back
      await fetchTickets();
      setViewState('list');
    } catch (err) {
      console.error('Failed to submit support ticket:', err);
      showToast('❌ Failed to submit ticket. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Send message on active ticket
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeTicket) return;
    if (chatStatus === 'resolved') {
      showToast('⚠️ This ticket is closed and read-only.', 'warning');
      return;
    }

    const text = chatInput.trim();
    setChatInput('');

    try {
      const res = await api.post(`/aahar/support/${activeTicket._id}/message`, {
        message: text,
      });
      
      // Append message locally if not already received via socket
      setChatMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('❌ Failed to send message.', 'error');
    }
  };

  // Only show support widget for logged in regular users (Donors & NGOs, not Admin/Guest)
  if (!user || user.isAdmin) return null;

  const issueLabels = {
    food_donation: '🍱 Food Donation Issue',
    request_fulfillment: '🚚 NGO Fulfillment Issue',
    app_bug: '🛡️ App Bug / Technical',
    feedback: '💬 Feedback',
    other: '📁 Other Issue',
  };

  const urgencyBadges = {
    medium: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', text: 'Medium' },
    urgent: { bg: 'rgba(249,115,22,0.15)', color: '#f97316', text: 'Urgent' },
    critical: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'Critical' },
  };

  return (
    <>
      {/* Floating Headset Icon next to Chatbot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 94,
          zIndex: 1000,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 58,
          height: 58,
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(59,130,246,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          animation: 'float 3.5s ease-in-out infinite',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1) translateY(0)')}
        title="Contact Help & Support"
      >
        {isOpen ? '✕' : '🎧'}
      </button>

      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: 94,
            right: 94,
            width: '400px',
            maxWidth: 'calc(100vw - 48px)',
            height: '560px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-accent)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(29,78,216,0.15))',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {viewState !== 'list' && (
                <button
                  onClick={() => {
                    setViewState('list');
                    fetchTickets();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '4px',
                    marginRight: 6,
                  }}
                >
                  ➔
                </button>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🎧 Support Center
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {viewState === 'list' && 'Track and create support requests'}
                  {viewState === 'create' && 'File a new support ticket'}
                  {viewState === 'chat' && `Chatting about #${activeTicket?.ticketId}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* List View */}
          {viewState === 'list' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading && tickets.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div className="spinner" style={{ width: 28, height: 28 }} />
                  </div>
                ) : tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto 0', padding: 20 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📬</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No Support Tickets</div>
                    <div style={{ fontSize: '0.82rem' }}>Have an issue with a donation, request, or have feedback? Create a ticket and chat with our team.</div>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t._id}
                      onClick={() => handleOpenChat(t)}
                      style={{
                        padding: 14,
                        background: 'var(--bg-card-alt)',
                        borderRadius: 12,
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, background-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.01)';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-card-alt)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#3b82f6' }}>
                          #{t.ticketId}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                              background: urgencyBadges[t.urgency]?.bg,
                              color: urgencyBadges[t.urgency]?.color,
                            }}
                          >
                            {urgencyBadges[t.urgency]?.text}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                              background: t.status === 'resolved' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                              color: t.status === 'resolved' ? '#10b981' : '#3b82f6',
                            }}
                          >
                            {t.status === 'resolved' ? 'RESOLVED' : 'OPEN'}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                        {issueLabels[t.issueType] || t.issueType}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {t.description}
                      </div>
                      {t.relatedId && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
                          🔗 Related ID: {t.relatedId}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex' }}>
                <button
                  onClick={() => setViewState('create')}
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px 0', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', fontWeight: 700, borderRadius: 8 }}
                >
                  ➕ Create New Ticket
                </button>
              </div>
            </div>
          )}

          {/* Create View */}
          {viewState === 'create' && (
            <form onSubmit={handleCreateTicket} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Request Type *
                  </label>
                  <select
                    className="form-input"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                  >
                    <option value="food_donation">🍱 Food Donation Issue</option>
                    <option value="request_fulfillment">🚚 NGO Fulfillment Issue</option>
                    <option value="app_bug">🛡️ App Bug / Technical</option>
                    <option value="feedback">💬 Feedback</option>
                    <option value="other">📁 Other Issue</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Related Donation or Request ID/Token (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 46OK7N or ObjectId"
                    value={relatedId}
                    onChange={(e) => setRelatedId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Urgency Level *
                  </label>
                  <select
                    className="form-input"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                  >
                    <option value="medium">🟡 Medium</option>
                    <option value="urgent">🟠 Urgent</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Detailed Description *
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Please explain the issue or details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', resize: 'vertical' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Upload Image Screenshot (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    style={{
                      width: '100%',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      padding: '8px 0',
                    }}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setViewState('list')}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ flex: 1, padding: '10px 0', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', fontWeight: 700, borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'Submit Request'}
                </button>
              </div>
            </form>
          )}

          {/* Chat View */}
          {viewState === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Ticket Details Panel */}
              <div
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Type: {issueLabels[activeTicket?.issueType] || activeTicket?.issueType}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: chatStatus === 'resolved' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                      color: chatStatus === 'resolved' ? '#10b981' : '#3b82f6',
                      fontWeight: 700,
                    }}
                  >
                    {chatStatus.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                  {activeTicket?.description}
                </div>
                {activeTicket?.imageUrl && (
                  <a
                    href={activeTicket.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                      marginTop: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    🖼️ View Attached Image
                  </a>
                )}
              </div>

              {/* Messages Area */}
              <div
                style={{
                  flex: 1,
                  padding: 20,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: 'var(--bg-primary)',
                }}
              >
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto 0', padding: 20, fontSize: '0.8rem' }}>
                    👋 Support opened. Send a message to start communicating with the administrators.
                  </div>
                ) : (
                  chatMessages.map((m, idx) => {
                    const isAdminMsg = m.senderRole === 'admin';
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isAdminMsg ? 'flex-start' : 'flex-end',
                          maxWidth: '85%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdminMsg ? 'flex-start' : 'flex-end',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: isAdminMsg ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                            background: isAdminMsg ? 'var(--bg-card-alt)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: isAdminMsg ? 'var(--text-primary)' : '#fff',
                            fontSize: '0.84rem',
                            lineHeight: 1.4,
                            border: isAdminMsg ? '1px solid var(--border-color)' : 'none',
                            whiteSpace: 'pre-wrap',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          {m.message}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {isAdminMsg ? 'Admin' : 'You'} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              {chatStatus === 'resolved' ? (
                <div
                  style={{
                    padding: 16,
                    background: 'rgba(16,185,129,0.06)',
                    borderTop: '1px solid rgba(16,185,129,0.2)',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: '#10b981',
                    fontWeight: 700,
                  }}
                >
                  🔒 This issue has been resolved and closed. History is locked.
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type message to admin..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem', borderRadius: 6, flex: 1 }}
                    required
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', borderRadius: 6 }}
                  >
                    Send
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
