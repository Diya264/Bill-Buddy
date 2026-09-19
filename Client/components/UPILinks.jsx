import React, { useState, useEffect } from 'react';
import { getMyBills, markAsPaid, confirmPayment } from '../utils/api';
import { generateUPILink } from '../utils/splitCalculator';
import QRCode from 'qrcode';

function UPILinks({ user }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [payNote, setPayNote] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [qrCodes, setQrCodes] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await getMyBills();
      setBills(res.data.bills || []);
    } catch (err) {
      console.error('Fetch bills error:', err);
    }
    setLoading(false);
  };

  const fetchBillDetails = async (bill) => {
    try {
      const { getBill } = await import('../utils/api');
      const res = await getBill(bill.id);
      setBillDetails(res.data);
      setSelectedBill(bill);

      // Generate QR codes for each member
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
            } catch (e) {
              console.error('QR error:', e);
            }
          }
        }
      }
      setQrCodes(qrs);
    } catch (err) {
      console.error('Fetch bill details error:', err);
    }
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    try {
      await markAsPaid(selectedBill.id, payNote);
      setShowPayModal(false);
      setPayNote('');
      await fetchBills();
      await fetchBillDetails(selectedBill);
    } catch (err) {
      console.error('Mark paid error:', err);
    }
    setSaving(false);
  };

  const handleConfirmPayment = async (userId) => {
    try {
      await confirmPayment(selectedBill.id, userId);
      await fetchBillDetails(selectedBill);
      await fetchBills();
    } catch (err) {
      console.error('Confirm payment error:', err);
    }
  };

  const statusColor = {
    Settled: { bg: '#e6f9f5', color: '#007a66' },
    Pending: { bg: '#fdeef1', color: '#e53e5a' },
    Partial: { bg: '#fff4e5', color: '#d97706' },
  };

  if (loading) {
    return <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>UPI Links & Payments</h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
          View payment links and track who has paid
        </p>
      </div>

      {bills.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '48px',
          textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📲</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
            No bills yet
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            Create a split to generate UPI payment links
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

        {/* Bills list */}
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '12px' }}>
            Select a bill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bills.map(bill => (
              <div key={bill.id} onClick={() => fetchBillDetails(bill)} style={{
                background: selectedBill?.id === bill.id ? '#e6faf6' : '#fff',
                border: `1.5px solid ${selectedBill?.id === bill.id ? '#00C9A7' : '#eee'}`,
                borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>{bill.name}</div>
                  <span style={{
                    fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px',
                    background: statusColor[bill.status]?.bg || '#eee',
                    color: statusColor[bill.status]?.color || '#888',
                  }}>{bill.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                  ₹{Number(bill.amount).toLocaleString()} · {bill.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bill details */}
        {selectedBill && billDetails && (
          <div style={{ flex: 2, minWidth: '320px' }}>
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.07)'
            }}>

              {/* Bill header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>
                    {billDetails.bill.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                    Paid by {billDetails.bill.paid_by_name} · ₹{Number(billDetails.bill.amount).toLocaleString()}
                  </div>
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: '500', padding: '4px 12px', borderRadius: '20px',
                  background: statusColor[billDetails.bill.status]?.bg || '#eee',
                  color: statusColor[billDetails.bill.status]?.color || '#888',
                }}>{billDetails.bill.status}</span>
              </div>

              {/* Settlement progress */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Settlement Progress</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>
                    {billDetails.members.filter(m => m.is_paid).length}/{billDetails.members.length} paid
                  </span>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px' }}>
                  <div style={{
                    width: `${(billDetails.members.filter(m => m.is_paid).length / billDetails.members.length) * 100}%`,
                    height: '100%', borderRadius: '4px', background: '#00C9A7',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              {/* Members */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {billDetails.members.map(member => {
                  const isMe = member.user_id === user.id;
                  const isPayer = member.user_id === billDetails.bill.paid_by;
                  const upiLink = !isPayer && billDetails.bill.paid_by_upi
                    ? generateUPILink(
                        billDetails.bill.paid_by_upi,
                        billDetails.bill.paid_by_name,
                        member.share,
                        billDetails.bill.name
                      )
                    : null;

                  return (
                    <div key={member.user_id} style={{
                      background: '#f8f9fc', borderRadius: '12px',
                      padding: '16px', border: '1.5px solid #eee'
                    }}>
                      {/* Member info */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '600', fontSize: '14px'
                          }}>{member.avatar}</div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1628' }}>
                              {member.name} {isMe ? '(You)' : ''} {isPayer ? '👑 Paid' : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>
                              {member.upi_id || 'No UPI ID'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628' }}>
                            ₹{Number(member.share).toLocaleString()}
                          </div>
                          <span style={{
                            fontSize: '11px', fontWeight: '500', padding: '2px 8px',
                            borderRadius: '20px', display: 'inline-block', marginTop: '2px',
                            background: member.is_paid ? '#e6f9f5' : '#fdeef1',
                            color: member.is_paid ? '#007a66' : '#e53e5a',
                          }}>
                            {member.is_paid ? '✅ Paid' : '⏳ Unpaid'}
                          </span>
                        </div>
                      </div>

                      {/* QR code — show for all members who haven't paid */}
                      {!isPayer && !member.is_paid && qrCodes[member.user_id] && (
                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                          <img src={qrCodes[member.user_id]} alt="QR Code"
                            style={{ borderRadius: '8px', border: '1px solid #eee' }} />
                          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                            Scan to pay ₹{member.share}
                          </div>
                        </div>
                      )}

                      {/* No UPI warning */}
                      {!isPayer && !member.is_paid && !billDetails.bill.paid_by_upi && (
                        <div style={{
                          background: '#fff4e5', borderRadius: '8px', padding: '10px',
                          fontSize: '12px', color: '#d97706', marginBottom: '12px'
                        }}>
                          ⚠️ {billDetails.bill.paid_by_name} hasn't set their UPI ID yet.
                          Payment link unavailable.
                        </div>
                      )}

                      {/* Pay button — show if this is me and I haven't paid and I'm not the payer */}
                      {isMe && !isPayer && !member.is_paid && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {upiLink && (
                            <a href={upiLink} style={{
                              flex: 1, display: 'block', padding: '10px',
                              background: '#0a1628', color: '#fff', borderRadius: '10px',
                              textAlign: 'center', fontSize: '13px', fontWeight: '600',
                              textDecoration: 'none',
                            }}>
                              📲 Pay via UPI App
                            </a>
                          )}
                          <button onClick={() => setShowPayModal(true)} style={{
                            flex: 1, padding: '10px', background: '#00C9A7',
                            color: '#fff', border: 'none', borderRadius: '10px',
                            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                          }}>
                            ✅ Mark as Paid
                          </button>
                        </div>
                      )}

                      {/* Confirm button — show if I'm the payer and this person marked as paid */}
                      {!isMe && billDetails.bill.paid_by === user.id && member.is_paid && member.note && (
                        <div style={{
                          background: '#e6f9f5', borderRadius: '8px', padding: '10px',
                          fontSize: '12px', color: '#007a66'
                        }}>
                          ✅ Payment confirmed · {member.note}
                        </div>
                      )}

                      {/* Confirm payment button */}
                      {!isMe && billDetails.bill.paid_by === user.id && !member.is_paid && !isPayer && (
                        <button onClick={() => handleConfirmPayment(member.user_id)} style={{
                          width: '100%', padding: '10px', background: '#fff',
                          border: '1.5px solid #00C9A7', borderRadius: '10px',
                          color: '#00C9A7', fontSize: '13px', fontWeight: '600',
                          cursor: 'pointer',
                        }}>
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

      {/* Mark as paid modal */}
      {showPayModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '28px',
            width: '100%', maxWidth: '400px', margin: '20px',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628', marginBottom: '8px' }}>
              Mark as Paid
            </div>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
              Add a note so {billDetails?.bill.paid_by_name} knows how you paid
            </div>
            <input
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628',
                outline: 'none', marginBottom: '16px', boxSizing: 'border-box',
                fontFamily: 'Segoe UI, sans-serif',
              }}
              placeholder="e.g. Paid via GPay on 18 May"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPayModal(false)} style={{
                flex: 1, padding: '12px', border: '1.5px solid #eee',
                borderRadius: '10px', background: '#fff', color: '#555',
                fontSize: '14px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleMarkPaid} disabled={saving} style={{
                flex: 1, padding: '12px', background: saving ? '#aaa' : '#00C9A7',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '14px', fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UPILinks;