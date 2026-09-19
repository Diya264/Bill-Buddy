import React, { useState, useEffect } from 'react';
import { getSettleData, sendReminder, getMyBills, markAsPaid, confirmPayment } from '../utils/api';
import { generateUPILink } from '../utils/splitCalculator';
import QRCode from 'qrcode';

const tabs = ['You Owe', 'Owes You', 'Simplified', 'Bill by Bill'];

function Settle({ user }) {
  const [activeTab, setActiveTab] = useState(0);
  const [settleData, setSettleData] = useState({ you_owe: [], owes_you: [], simplified: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Bill by bill state
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [qrCodes, setQrCodes] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettleData(); }, []);

  const fetchSettleData = async () => {
    setLoading(true);
    try {
      const res = await getSettleData();
      setSettleData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchBills = async () => {
    setBillsLoading(true);
    try {
      const res = await getMyBills();
      setBills(res.data.bills || []);
    } catch (e) { console.error(e); }
    setBillsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 3 && bills.length === 0) fetchBills();
  }, [activeTab]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemind = async (userId) => {
    try {
      await sendReminder(userId);
      showToast('Reminder sent! 👋');
    } catch (e) { showToast('Failed to send reminder', 'error'); }
  };

  const fetchBillDetails = async (bill) => {
    try {
      const { getBill } = await import('../utils/api');
      const res = await getBill(bill.id);
      setBillDetails(res.data);
      setSelectedBill(bill);
      const qrs = {};
      for (const member of res.data.members) {
        if (member.user_id !== bill.paid_by) {
          const link = generateUPILink(
            res.data.bill.paid_by_upi,
            res.data.bill.paid_by_name,
            member.share,
            bill.name
          );
          if (res.data.bill.paid_by_upi) {
            try {
              qrs[member.user_id] = await QRCode.toDataURL(link, {
                width: 180, margin: 2,
                color: { dark: '#0a1628', light: '#ffffff' }
              });
            } catch (e) { console.error('QR error:', e); }
          }
        }
      }
      setQrCodes(qrs);
    } catch (e) { console.error(e); }
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    try {
      await markAsPaid(selectedBill.id, payNote);
      setShowPayModal(false);
      setPayNote('');
      await fetchBills();
      await fetchBillDetails(selectedBill);
      fetchSettleData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleConfirmPayment = async (userId) => {
    try {
      await confirmPayment(selectedBill.id, userId);
      await fetchBillDetails(selectedBill);
      await fetchBills();
      fetchSettleData();
    } catch (e) { console.error(e); }
  };

  const statusColor = {
    Settled: { bg: '#e6f9f5', color: '#007a66' },
    Pending: { bg: '#fdeef1', color: '#e53e5a' },
    Partial: { bg: '#fff4e5', color: '#d97706' },
  };

  if (loading) return <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>Loading...</div>;

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>Settle Up</div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#e53e5a' : '#00C9A7',
          color: '#fff', padding: '12px 24px', borderRadius: '12px',
          fontSize: '14px', fontWeight: '600', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="page" style={{ maxWidth: '860px' }}>

        {/* Desktop header */}
        <div className="desktop-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>Settle Up</h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
            See who you owe and who owes you — across all bills
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            {
              label: 'You owe',
              value: `₹${settleData.you_owe.reduce((s, p) => s + p.total, 0).toLocaleString()}`,
              sub: `to ${settleData.you_owe.length} people`,
              color: '#e53e5a',
              icon: '📤',
            },
            {
              label: 'Owed to you',
              value: `₹${settleData.owes_you.reduce((s, p) => s + p.total, 0).toLocaleString()}`,
              sub: `from ${settleData.owes_you.length} people`,
              color: '#007a66',
              icon: '📥',
            },
            {
              label: 'Simplified to',
              value: `${settleData.simplified.length} payments`,
              sub: 'to settle everything',
              color: '#00C9A7',
              icon: '✨',
            },
          ].map((s, i) => (
            <div key={i} onClick={() => setActiveTab(i)} style={{
              background: '#fff', borderRadius: '14px', padding: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              borderTop: `3px solid ${s.color}`,
              cursor: 'pointer',
              border: activeTab === i ? `1.5px solid ${s.color}` : '1.5px solid transparent',
              borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '20px',
          background: '#f0f0f0', borderRadius: '12px', padding: '4px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: activeTab === i ? '#fff' : 'transparent',
              color: activeTab === i ? '#0a1628' : '#888',
              boxShadow: activeTab === i ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}>{tab}</button>
          ))}
        </div>

        {/* ── Tab 0: You Owe ── */}
        {activeTab === 0 && (
          <div>
            {settleData.you_owe.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>You're all clear!</div>
                <div style={{ fontSize: '14px', color: '#888' }}>You don't owe anyone anything right now</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {settleData.you_owe.map((person, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #e53e5a, #C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                        {person.avatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>{person.name}</div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                          {person.bills.length} bill{person.bills.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#e53e5a' }}>₹{person.total.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>you owe</div>
                      </div>
                    </div>

                    {/* Bills breakdown */}
                    {person.bills.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f5f5f5' }}>
                        {person.bills.map((b, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                            <span style={{ color: '#888' }}>{b.bill_name}</span>
                            <span style={{ color: '#0a1628', fontWeight: '500' }}>₹{b.share.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pay button */}
                    {person.upi_id ? (
                      <a
                        href={generateUPILink(person.upi_id, person.name, person.total, 'Settle up')}
                        style={{
                          display: 'block', marginTop: '12px', padding: '10px',
                          background: '#0a1628', color: '#fff', borderRadius: '10px',
                          textAlign: 'center', fontSize: '13px', fontWeight: '600',
                          textDecoration: 'none',
                        }}
                      >
                        📲 Pay ₹{person.total.toLocaleString()} via UPI
                      </a>
                    ) : (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff4e5', borderRadius: '8px', fontSize: '12px', color: '#d97706' }}>
                        ⚠️ {person.name} hasn't set their UPI ID yet
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Owes You ── */}
        {activeTab === 1 && (
          <div>
            {settleData.owes_you.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>😅</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>Nobody owes you!</div>
                <div style={{ fontSize: '14px', color: '#888' }}>Create a split to start tracking</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {settleData.owes_you.map((person, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #007a66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                        {person.avatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>{person.name}</div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                          {person.bills.length} bill{person.bills.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#007a66' }}>₹{person.total.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>owes you</div>
                      </div>
                    </div>

                    {/* Bills breakdown */}
                    {person.bills.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f5f5f5' }}>
                        {person.bills.map((b, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                            <span style={{ color: '#888' }}>{b.bill_name}</span>
                            <span style={{ color: '#0a1628', fontWeight: '500' }}>₹{b.share.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remind button */}
                    <button
                      onClick={() => handleRemind(person.user_id)}
                      style={{
                        width: '100%', marginTop: '12px', padding: '10px',
                        background: '#f0faf8', color: '#007a66',
                        border: '1.5px solid #c8f0e8', borderRadius: '10px',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      }}
                    >
                      👋 Remind {person.name}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Simplified ── */}
        {activeTab === 2 && (
          <div>
            {settleData.simplified.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>All settled!</div>
                <div style={{ fontSize: '14px', color: '#888' }}>No pending transactions to simplify</div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'linear-gradient(135deg, #0a1628, #1a2f50)', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px' }}>
                  <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>✨ Settle everything in {settleData.simplified.length} payment{settleData.simplified.length !== 1 ? 's' : ''}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>Instead of multiple back-and-forth payments</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {settleData.simplified.map((txn, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        {/* From */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #e53e5a, #C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                            {txn.from_user_id === user.id ? '👤' : txn.from_avatar}
                          </div>
                          <div style={{ fontSize: '11px', color: '#0a1628', fontWeight: '600' }}>{txn.from_name}</div>
                        </div>

                        {/* Arrow + amount */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628' }}>₹{txn.amount.toLocaleString()}</div>
                          <div style={{ fontSize: '18px', color: '#00C9A7' }}>→</div>
                        </div>

                        {/* To */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #007a66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                            {txn.to_user_id === user.id ? '👤' : txn.to_avatar}
                          </div>
                          <div style={{ fontSize: '11px', color: '#0a1628', fontWeight: '600' }}>{txn.to_name}</div>
                        </div>
                      </div>

                      {/* Pay button — only show if current user is the one who needs to pay */}
                      {txn.from_user_id === user.id && (
                        txn.to_upi ? (
                          <a
                            href={generateUPILink(txn.to_upi, txn.to_name, txn.amount, 'Settle up')}
                            style={{
                              display: 'block', padding: '10px',
                              background: '#0a1628', color: '#fff', borderRadius: '10px',
                              textAlign: 'center', fontSize: '13px', fontWeight: '600',
                              textDecoration: 'none',
                            }}
                          >
                            📲 Pay ₹{txn.amount.toLocaleString()} via UPI
                          </a>
                        ) : (
                          <div style={{ padding: '10px', background: '#fff4e5', borderRadius: '8px', fontSize: '12px', color: '#d97706' }}>
                            ⚠️ {txn.to_name} hasn't set their UPI ID yet
                          </div>
                        )
                      )}

                      {/* Receive indicator */}
                      {txn.to_user_id === user.id && (
                        <div style={{ padding: '10px', background: '#e6f9f5', borderRadius: '8px', fontSize: '12px', color: '#007a66', textAlign: 'center', fontWeight: '500' }}>
                          ✅ You'll receive ₹{txn.amount.toLocaleString()} from {txn.from_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Bill by Bill ── */}
        {activeTab === 3 && (
          <div>
            {billsLoading ? (
              <div style={{ color: '#888', fontSize: '14px', padding: '20px' }}>Loading bills...</div>
            ) : bills.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📲</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>No bills yet</div>
                <div style={{ fontSize: '14px', color: '#888' }}>Create a split to generate UPI payment links</div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

                {/* Bills list */}
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '12px' }}>Select a bill</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bills.map(bill => (
                      <div key={bill.id} onClick={() => fetchBillDetails(bill)} style={{
                        background: selectedBill?.id === bill.id ? '#e6faf6' : '#fff',
                        border: `1.5px solid ${selectedBill?.id === bill.id ? '#00C9A7' : '#eee'}`,
                        borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>{bill.name}</div>
                          <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', background: statusColor[bill.status]?.bg || '#eee', color: statusColor[bill.status]?.color || '#888' }}>{bill.status}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>₹{Number(bill.amount).toLocaleString()} · {bill.date}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bill details */}
                {selectedBill && billDetails && (
                  <div style={{ flex: 2, minWidth: '300px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

                      {/* Bill header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>{billDetails.bill.name}</div>
                          <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>Paid by {billDetails.bill.paid_by_name} · ₹{Number(billDetails.bill.amount).toLocaleString()}</div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '500', padding: '4px 12px', borderRadius: '20px', background: statusColor[billDetails.bill.status]?.bg || '#eee', color: statusColor[billDetails.bill.status]?.color || '#888' }}>{billDetails.bill.status}</span>
                      </div>

                      {/* Progress */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#555' }}>Settlement Progress</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>{billDetails.members.filter(m => m.is_paid).length}/{billDetails.members.length} paid</span>
                        </div>
                        <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: `${(billDetails.members.filter(m => m.is_paid).length / billDetails.members.length) * 100}%`, height: '100%', borderRadius: '4px', background: '#00C9A7' }} />
                        </div>
                      </div>

                      {/* Members */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {billDetails.members.map(member => {
                          const isMe = member.user_id === user.id;
                          const isPayer = member.user_id === billDetails.bill.paid_by;
                          const upiLink = !isPayer && billDetails.bill.paid_by_upi
                            ? generateUPILink(billDetails.bill.paid_by_upi, billDetails.bill.paid_by_name, member.share, billDetails.bill.name)
                            : null;

                          return (
                            <div key={member.user_id} style={{ background: '#f8f9fc', borderRadius: '12px', padding: '14px', border: '1.5px solid #eee' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9A7, #0a1628)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '13px' }}>{member.avatar}</div>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1628' }}>{member.name} {isMe ? '(You)' : ''} {isPayer ? '👑' : ''}</div>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>{member.upi_id || 'No UPI ID'}</div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0a1628' }}>₹{Number(member.share).toLocaleString()}</div>
                                  <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '2px', background: member.is_paid ? '#e6f9f5' : '#fdeef1', color: member.is_paid ? '#007a66' : '#e53e5a' }}>
                                    {member.is_paid ? '✅ Paid' : '⏳ Unpaid'}
                                  </span>
                                </div>
                              </div>

                              {/* QR code */}
                              {!isPayer && !member.is_paid && qrCodes[member.user_id] && (
                                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                  <img src={qrCodes[member.user_id]} alt="QR" style={{ borderRadius: '8px', border: '1px solid #eee' }} />
                                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Scan to pay ₹{member.share}</div>
                                </div>
                              )}

                              {/* Pay button */}
                              {isMe && !isPayer && !member.is_paid && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {upiLink && (
                                    <a href={upiLink} style={{ flex: 1, display: 'block', padding: '10px', background: '#0a1628', color: '#fff', borderRadius: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                                      📲 Pay via UPI
                                    </a>
                                  )}
                                  <button onClick={() => setShowPayModal(true)} style={{ flex: 1, padding: '10px', background: '#00C9A7', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                    ✅ Mark Paid
                                  </button>
                                </div>
                              )}

                              {/* Confirm button */}
                              {!isMe && billDetails.bill.paid_by === user.id && !member.is_paid && !isPayer && (
                                <button onClick={() => handleConfirmPayment(member.user_id)} style={{ width: '100%', padding: '10px', background: '#fff', border: '1.5px solid #00C9A7', borderRadius: '10px', color: '#00C9A7', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                  Confirm {member.name} paid manually
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mark as paid modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', margin: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>Mark as Paid</div>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>Add a note so {billDetails?.bill.paid_by_name} knows how you paid</div>
            <input
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628', outline: 'none', marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'Segoe UI, sans-serif' }}
              placeholder="e.g. Paid via GPay"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '12px', border: '1.5px solid #eee', borderRadius: '10px', background: '#fff', color: '#555', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleMarkPaid} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#aaa' : '#00C9A7', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settle;