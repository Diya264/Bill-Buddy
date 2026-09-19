import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../utils/api';
import { equalSplit } from '../utils/splitCalculator';

// ── API helpers (inline since we're adding to api.js separately) ──
const API_BASE = 'http://localhost:5000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const recurringAPI = {
  getAll:    ()         => fetch(`${API_BASE}/recurring/my`, { headers: authHeaders() }).then(r => r.json()),
  create:    (data)     => fetch(`${API_BASE}/recurring/create`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
  generate:  (id, paidBy) => fetch(`${API_BASE}/recurring/${id}/generate`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ paid_by: paidBy }) }).then(r => r.json()),
  toggle:    (id)       => fetch(`${API_BASE}/recurring/${id}/toggle`, { method: 'PUT', headers: authHeaders() }).then(r => r.json()),
  update:    (id, data) => fetch(`${API_BASE}/recurring/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
  delete:    (id)       => fetch(`${API_BASE}/recurring/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json()),
  getHistory:(id)       => fetch(`${API_BASE}/recurring/${id}/history`, { headers: authHeaders() }).then(r => r.json()),
};

// ── Constants ─────────────────────────────────────────
const categories = ['Food', 'Travel', 'Groceries', 'Entertainment', 'Utilities', 'Other'];
const categoryIcon = { Food: '🍽️', Travel: '✈️', Groceries: '🛒', Entertainment: '🎬', Utilities: '💡', Other: '📋' };
const categoryColor = { Food: '#00C9A7', Travel: '#C4748A', Utilities: '#f59e0b', Groceries: '#3b82f6', Entertainment: '#8b5cf6', Other: '#6b7280' };

const frequencies = [
  { value: 'weekly',    label: 'Weekly',    icon: '📅', desc: 'Every 7 days' },
  { value: 'monthly',   label: 'Monthly',   icon: '🗓️', desc: 'Every month' },
  { value: 'quarterly', label: 'Quarterly', icon: '📆', desc: 'Every 3 months' },
  { value: 'yearly',    label: 'Yearly',    icon: '🎯', desc: 'Every year' },
];

const statusStyle = {
  active: { bg: '#e6f9f5', color: '#007a66', label: 'Active' },
  paused: { bg: '#fff4e5', color: '#d97706', label: 'Paused' },
  ended:  { bg: '#f0f0f0', color: '#888',    label: 'Ended'  },
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628',
  outline: 'none', background: '#fff', marginTop: '6px',
  fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box',
};
const labelStyle = { fontSize: '13px', fontWeight: '500', color: '#555' };

// ── Helpers ───────────────────────────────────────────
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dateStr);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function dueBadge(dateStr, status) {
  if (status !== 'active') return null;
  const days = daysUntil(dateStr);
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, bg: '#fdeef1', color: '#e53e5a' };
  if (days === 0) return { label: 'Due today',  bg: '#fdeef1', color: '#e53e5a' };
  if (days <= 3)  return { label: `Due in ${days}d`, bg: '#fff4e5', color: '#d97706' };
  if (days <= 7)  return { label: `Due in ${days}d`, bg: '#fff4e5', color: '#d97706' };
  return { label: `Due in ${days}d`, bg: '#e6f9f5', color: '#007a66' };
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Main Component ────────────────────────────────────
function Recurring({ user }) {
  const navigate = useNavigate();
  const [recurring, setRecurring]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedId, setSelectedId]     = useState(null);
  const [history, setHistory]           = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [generating, setGenerating]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [generateModal, setGenerateModal] = useState(null);
  const [toast, setToast]               = useState(null);
  const [selectedPayer, setSelectedPayer] = useState(null);

  // Create form state
  const [form, setForm] = useState({
    name: '', amount: '', category: 'Utilities',
    note: '', frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    paid_by: user.id,
  });
  const [people, setPeople]             = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [errors, setErrors]             = useState({});

  useEffect(() => {
    fetchRecurring();
    setPeople([{ id: user.id, name: user.name, avatar: user.avatar, upi: user.upi_id || '', isYou: true }]);
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchUsers(searchQuery);
        setSearchResults(res.data.users.filter(u => !people.find(p => p.id === u.id)));
      } catch (e) { console.error(e); }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, people]);

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const data = await recurringAPI.getAll();
      setRecurring(data.recurring || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchHistory = async (id) => {
    setHistoryLoading(true);
    try {
      const data = await recurringAPI.getHistory(id);
      setHistory(data.history || []);
    } catch (e) { console.error(e); }
    setHistoryLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectCard = (id) => {
    if (selectedId === id) { setSelectedId(null); setHistory([]); return; }
    setSelectedId(id);
    fetchHistory(id);
  };

  const handleGenerate = async (paidById) => {
    const id = generateModal.id;
    setGenerating(id);
    try {
      const res = await recurringAPI.generate(id, paidById);
      if (res.billId) {
        showToast('Bill generated successfully! ✅');
        setGenerateModal(null);
        setSelectedPayer(null);  // ← add this
        fetchRecurring();
        fetchHistory(id);
      } else {
        showToast(res.message || 'Something went wrong', 'error');
      }
    } catch (e) { showToast('Failed to generate bill', 'error'); }
    setGenerating(null);
  };

  const handleToggle = async (id) => {
    try {
      const res = await recurringAPI.toggle(id);
      showToast(`Recurring bill ${res.status === 'active' ? 'resumed ▶️' : 'paused ⏸'}`);
      fetchRecurring();
    } catch (e) { showToast('Failed to update', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await recurringAPI.delete(id);
      setDeleteConfirm(null);
      if (selectedId === id) { setSelectedId(null); setHistory([]); }
      showToast('Deleted successfully 🗑️');
      fetchRecurring();
    } catch (e) { showToast('Failed to delete', 'error'); }
  };

  const addPerson = (u) => {
    setPeople([...people, { id: u.id, name: u.name, avatar: u.avatar, upi: u.upi_id || '', isYou: false }]);
    setSearchQuery(''); setSearchResults([]);
  };

  const removePerson = (id) => { if (id === user.id) return; setPeople(people.filter(p => p.id !== id)); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name   = 'Name is required';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    if (people.length < 2)   e.people = 'Add at least one more person';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const splits = equalSplit(parseFloat(form.amount), people);
      const members = splits.map(p => ({ user_id: p.id, share: p.share }));
      await recurringAPI.create({
        name: form.name, amount: parseFloat(form.amount),
        category: form.category, note: form.note,
        split_type: 'equal', frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date || null,
        paid_by: form.paid_by,
        members,
      });
      showToast('Recurring bill created! 🔁');
      setShowCreate(false);
      resetForm();
      fetchRecurring();
    } catch (e) { showToast('Failed to create', 'error'); }
    setSaving(false);
  };

  const resetForm = () => {
    setForm({ name: '', amount: '', category: 'Utilities', note: '', frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '', paid_by: user.id });
    setPeople([{ id: user.id, name: user.name, avatar: user.avatar, upi: user.upi_id || '', isYou: true }]);
    setSearchQuery(''); setErrors({});
  };

  const selectedRecurring = recurring.find(r => r.id === selectedId);

  if (loading) return <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>Loading recurring bills...</div>;

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar">
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>Recurring</div>
        <div style={{ fontSize: '13px', color: '#888' }}>{recurring.length} active</div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#e53e5a' : '#00C9A7',
          color: '#fff', padding: '12px 24px', borderRadius: '12px',
          fontSize: '14px', fontWeight: '600', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="page" style={{ maxWidth: '960px' }}>

        {/* ── Desktop header ── */}
        <div className="desktop-header" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>Recurring Bills</h1>
              <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
                Set up bills that repeat automatically — rent, subscriptions, utilities
              </p>
            </div>
            {!showCreate && (
              <button onClick={() => { resetForm(); setShowCreate(true); }} style={{
                padding: '10px 20px', background: '#00C9A7', color: '#fff',
                border: 'none', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', cursor: 'pointer', flexShrink: 0,
              }}>
                + New Recurring
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile new button ── */}
        {!showCreate && (
          <div className="mobile-greeting" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>🔁 Recurring Bills</span>
            <button onClick={() => { resetForm(); setShowCreate(true); }} style={{ padding: '8px 16px', background: '#00C9A7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ New</button>
          </div>
        )}

        {/* ── Due soon banner ── */}
        {(() => {
          const dueSoon = recurring.filter(r => r.status === 'active' && daysUntil(r.next_due_date) <= 3);
          if (!dueSoon.length) return null;
          return (
            <div style={{ background: 'linear-gradient(135deg, #0a1628, #1a2f50)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
                  🔔 {dueSoon.length} recurring bill{dueSoon.length > 1 ? 's' : ''} due soon
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '3px' }}>
                  {dueSoon.map(r => r.name).join(', ')}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#00C9A7', fontWeight: '600' }}>
                Click "Generate" to create the bill
              </div>
            </div>
          );
        })()}

        {/* ── Empty state ── */}
        {recurring.length === 0 && !showCreate && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '56px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🔁</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>No recurring bills yet</div>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
              Set up rent, Netflix, electricity — anything you split regularly
            </div>
            <button onClick={() => { resetForm(); setShowCreate(true); }} style={{ padding: '12px 28px', background: '#00C9A7', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              + Create your first recurring bill
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* ── Left: recurring list ── */}
          {recurring.length > 0 && !showCreate && (
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recurring.map(r => {
                  const badge = dueBadge(r.next_due_date, r.status);
                  const ss = statusStyle[r.status] || statusStyle.active;
                  const isSelected = selectedId === r.id;
                  return (
                    <div key={r.id}
                      onClick={() => handleSelectCard(r.id)}
                      style={{
                        background: isSelected ? '#f0faf8' : '#fff',
                        border: `1.5px solid ${isSelected ? '#00C9A7' : '#eee'}`,
                        borderRadius: '14px', padding: '16px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Category icon */}
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                          background: `${categoryColor[r.category]}22`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                        }}>
                          {categoryIcon[r.category] || '📋'}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>{r.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', background: ss.bg, color: ss.color }}>
                              {ss.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#888', marginTop: '3px' }}>
                            ₹{Number(r.amount).toLocaleString()} · {frequencies.find(f => f.value === r.frequency)?.label}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {badge && (
                              <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#aaa' }}>
                              {r.history_count} bill{r.history_count !== 1 ? 's' : ''} generated
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '12px', color: '#ccc', transform: isSelected ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
                        </div>
                      </div>

                      {/* Quick action buttons — shown on card */}
                      {isSelected && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                          {r.status === 'active' && (
                            <button
                              onClick={() => setGenerateModal(r)}
                              disabled={generating === r.id}
                              style={{
                                flex: 1, padding: '9px 12px',
                                background: generating === r.id ? '#aaa' : '#00C9A7',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontSize: '12px', fontWeight: '600',
                                cursor: generating === r.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {generating === r.id ? '⏳ Generating...' : '▶️ Generate Now'}
                            </button>
                          )}
                          <button
                            onClick={() => handleToggle(r.id)}
                            style={{
                              padding: '9px 12px',
                              background: r.status === 'active' ? '#fff4e5' : '#e6f9f5',
                              color: r.status === 'active' ? '#d97706' : '#007a66',
                              border: `1px solid ${r.status === 'active' ? '#f5d5a0' : '#c8f0e8'}`,
                              borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                            }}
                          >
                            {r.status === 'active' ? '⏸ Pause' : '▶️ Resume'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(r.id)}
                            style={{
                              padding: '9px 10px', background: '#fdeef1',
                              color: '#e53e5a', border: '1px solid #f5c0c8',
                              borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Right: detail panel ── */}
          {selectedRecurring && !showCreate && (
            <div style={{ flex: 2, minWidth: '300px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
                    background: `${categoryColor[selectedRecurring.category]}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
                  }}>
                    {categoryIcon[selectedRecurring.category] || '📋'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>{selectedRecurring.name}</div>
                    <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                      {frequencies.find(f => f.value === selectedRecurring.frequency)?.label} · ₹{Number(selectedRecurring.amount).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: 'Next Due', value: formatDate(selectedRecurring.next_due_date) },
                    { label: 'Started', value: formatDate(selectedRecurring.start_date) },
                    { label: 'Ends', value: selectedRecurring.end_date ? formatDate(selectedRecurring.end_date) : 'No end date' },
                    { label: 'Generated', value: `${selectedRecurring.history_count} times` },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#f8f9fc', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Members */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Split Between</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedRecurring.members.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8f9fc', borderRadius: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{m.avatar}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                            {m.name} {m.id === user.id && <span style={{ fontSize: '11px', color: '#aaa' }}>(you)</span>}
                            {m.user_id === selectedRecurring.paid_by && <span style={{ fontSize: '11px', color: '#00C9A7', marginLeft: '4px' }}>pays</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#00C9A7' }}>₹{Number(m.share).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* History */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Generated Bills ({selectedRecurring.history_count})
                  </div>

                  {historyLoading ? (
                    <div style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading history...</div>
                  ) : history.length === 0 ? (
                    <div style={{ background: '#f8f9fc', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                      <div style={{ fontSize: '13px', color: '#888' }}>No bills generated yet</div>
                      <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>Click "Generate Now" to create the first bill</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {history.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8f9fc', borderRadius: '10px', border: '1px solid #eee' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: h.status === 'Settled' ? '#007a66' : h.status === 'Partial' ? '#d97706' : '#e53e5a', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>{h.name}</div>
                            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{formatDate(h.date)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>₹{Number(h.amount).toLocaleString()}</div>
                            <span style={{
                              fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '2px',
                              background: h.status === 'Settled' ? '#e6f9f5' : h.status === 'Partial' ? '#fff4e5' : '#fdeef1',
                              color: h.status === 'Settled' ? '#007a66' : h.status === 'Partial' ? '#d97706' : '#e53e5a',
                            }}>{h.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Create form ── */}
          {showCreate && (
            <div style={{ flex: 1, minWidth: '300px', maxWidth: '620px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#0a1628' }}>New Recurring Bill</div>
                  <button onClick={() => { setShowCreate(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#aaa', padding: '4px' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Name */}
                  <div>
                    <label style={labelStyle}>Bill Name *</label>
                    <input style={{ ...inputStyle, borderColor: errors.name ? '#e53e5a' : '#e8e8e8' }}
                      placeholder="e.g. Monthly Rent, Netflix, Electricity"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    {errors.name && <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
                  </div>

                  {/* Amount */}
                  <div>
                    <label style={labelStyle}>Total Amount (₹) *</label>
                    <input style={{ ...inputStyle, borderColor: errors.amount ? '#e53e5a' : '#e8e8e8' }}
                      placeholder="e.g. 12000" type="number"
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    {errors.amount && <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.amount}</div>}
                  </div>

                  {/* Category */}
                  <div>
                    <label style={labelStyle}>Category</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {categories.map(cat => (
                        <div key={cat} onClick={() => setForm({ ...form, category: cat })} style={{
                          padding: '7px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                          border: `1.5px solid ${form.category === cat ? '#00C9A7' : '#e8e8e8'}`,
                          background: form.category === cat ? '#e6faf6' : '#fff',
                          color: form.category === cat ? '#007a66' : '#555',
                          fontWeight: form.category === cat ? '600' : '400',
                        }}>
                          {categoryIcon[cat]} {cat}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label style={labelStyle}>Frequency *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      {frequencies.map(f => (
                        <div key={f.value} onClick={() => setForm({ ...form, frequency: f.value })} style={{
                          padding: '12px', borderRadius: '10px', cursor: 'pointer',
                          border: `2px solid ${form.frequency === f.value ? '#00C9A7' : '#e8e8e8'}`,
                          background: form.frequency === f.value ? '#e6faf6' : '#fff',
                          transition: 'all 0.15s',
                        }}>
                          <div style={{ fontSize: '18px', marginBottom: '4px' }}>{f.icon}</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: form.frequency === f.value ? '#007a66' : '#0a1628' }}>{f.label}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{f.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>First Due Date *</label>
                      <input style={inputStyle} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>End Date (optional)</label>
                      <input style={inputStyle} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label style={labelStyle}>Note (optional)</label>
                    <input style={inputStyle} placeholder="e.g. Split 3 ways every month"
                      value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                  </div>

                  {/* People */}
                  <div>
                    <label style={labelStyle}>Add People *</label>
                    <input style={{ ...inputStyle, borderColor: errors.people ? '#e53e5a' : '#e8e8e8' }}
                      placeholder="Search by name or email..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    {errors.people && <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.people}</div>}

                    {searchResults.length > 0 && (
                      <div style={{ border: '1.5px solid #eee', borderRadius: '10px', marginTop: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        {searchResults.map(u => (
                          <div key={u.id} onClick={() => addPerson(u)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f5f5f5', background: '#fff' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #0a1628)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '12px' }}>{u.avatar}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>{u.name}</div>
                              <div style={{ fontSize: '11px', color: '#aaa' }}>{u.email}</div>
                            </div>
                            <div style={{ color: '#00C9A7', fontSize: '12px', fontWeight: '600' }}>+ Add</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchLoading && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>Searching...</div>}
                  </div>

                  {/* People list */}
                  {people.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#555', fontWeight: '500', marginBottom: '8px' }}>
                        People ({people.length}) — tap to select who pays · each owes ₹{people.length > 0 && form.amount ? (parseFloat(form.amount) / people.length).toFixed(2) : '—'}
                      </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {people.map(p => (
                            <div key={p.id}
                                onClick={() => setForm({ ...form, paid_by: p.id })}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: form.paid_by === p.id ? '#e6faf6' : '#f8f9fc', borderRadius: '10px', padding: '10px 12px', border: `1.5px solid ${form.paid_by === p.id ? '#00C9A7' : '#eee'}`, cursor: 'pointer' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{p.avatar}</div>
                                <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                                    {p.name}
                                    {p.isYou && <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '4px' }}>(you)</span>}
                                    {form.paid_by === p.id && <span style={{ fontSize: '11px', color: '#007a66', marginLeft: '6px', fontWeight: '600' }}>✓ pays</span>}
                                </div>
                                {!p.isYou && <div onClick={e => { e.stopPropagation(); removePerson(p.id); }} style={{ color: '#e53e5a', cursor: 'pointer', fontSize: '13px' }}>✕</div>}
                            </div>
                        ))}
                        </div>
                    </div>
                  )}

                  {/* Info note */}
                  <div style={{ background: '#f0faf8', borderRadius: '10px', padding: '12px 14px', border: '1px solid #c8f0e8' }}>
                    <div style={{ fontSize: '12px', color: '#007a66', lineHeight: '1.6' }}>
                      💡 <strong>How it works:</strong> This creates a template. When a bill is due, come here and click <strong>"Generate Now"</strong> — it instantly creates a real bill and notifies everyone.
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setShowCreate(false); resetForm(); }} style={{ flex: 1, padding: '12px', border: '1.5px solid #eee', borderRadius: '10px', background: '#fff', color: '#555', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#aaa' : '#00C9A7', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                      {saving ? 'Creating...' : '🔁 Create Recurring Bill'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete modal ── */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '360px', zIndex: 1001 }}>
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', textAlign: 'center', marginBottom: '8px' }}>Delete Recurring Bill?</div>
            <div style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '24px' }}>
              This removes the template. Bills already generated will remain in History.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '12px', border: '1.5px solid #eee', borderRadius: '10px', background: '#fff', color: '#555', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '12px', background: '#e53e5a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </>
      )}
      {/* ── Who paid modal ── */}
{generateModal && (
  <>
    <div onClick={() => { setGenerateModal(null); setSelectedPayer(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '380px', zIndex: 1001 }}>
      <div style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>👑</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', textAlign: 'center', marginBottom: '4px' }}>Who paid this time?</div>
      <div style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '20px' }}>
        Select the person who paid for "{generateModal.name}"
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {generateModal.members.map((m) => {
          const memberId = m.user_id || m.id;
          const isSelected = selectedPayer === memberId;
          return (
            <div
              key={memberId}
              onClick={() => setSelectedPayer(memberId)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '10px',
                border: `1.5px solid ${isSelected ? '#00C9A7' : '#eee'}`,
                background: isSelected ? '#e6faf6' : '#f8f9fc',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
                  {m.name} {memberId === user.id && <span style={{ fontSize: '11px', color: '#aaa' }}>(you)</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>{m.upi_id || 'No UPI ID'}</div>
              </div>
              {isSelected && <div style={{ fontSize: '16px' }}>✓</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => { setGenerateModal(null); setSelectedPayer(null); }}
          style={{ flex: 1, padding: '12px', border: '1.5px solid #eee', borderRadius: '10px', background: '#fff', color: '#555', fontSize: '14px', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => { if (selectedPayer) handleGenerate(selectedPayer); }}
          disabled={!selectedPayer || !!generating}
          style={{
            flex: 1, padding: '12px', border: 'none', borderRadius: '10px',
            background: !selectedPayer || generating ? '#aaa' : '#00C9A7',
            color: '#fff', fontSize: '14px', fontWeight: '600',
            cursor: !selectedPayer || generating ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? '⏳ Generating...' : '▶️ Generate'}
        </button>
      </div>
    </div>
  </>
)}
    </>
  );
}

export default Recurring;