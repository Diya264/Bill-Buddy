import React, { useState, useEffect } from 'react';
import { getMyBills, getBill, markAsPaid, confirmPayment } from '../utils/api';

const statusColor = {
  Settled: { bg: '#e6f9f5', color: '#007a66' },
  Pending: { bg: '#fdeef1', color: '#e53e5a' },
  Partial:  { bg: '#fff4e5', color: '#d97706' },
};

const categoryColor = {
  Travel: '#C4748A', Food: '#00C9A7', Utilities: '#d97706',
  Groceries: '#007a66', Entertainment: '#6c63ff', Other: '#888',
};

const categoryIcon = {
  Travel: '✈️', Food: '🍽️', Utilities: '💡',
  Groceries: '🛒', Entertainment: '🎬', Other: '📋',
};

const statuses   = ['All', 'Pending', 'Partial', 'Settled'];
const categories = ['All', 'Food', 'Travel', 'Utilities', 'Groceries', 'Entertainment', 'Other'];

// ── PDF export ────────────────────────────────────────
const exportBillPDF = async (bill, expandedBill, currentUser) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 20, contentW = pageW - margin * 2;
  const teal = [0,201,167], dark = [10,22,40], grey = [136,136,136];
  const lightBg = [247,248,252], white = [255,255,255];
  let y = 0;

  doc.setFillColor(...teal); doc.rect(0,0,pageW,32,'F');
  doc.setTextColor(...white); doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('BillBuddy', margin, 14);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Expense Reconciliation & Settlement System', margin, 22);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}`, pageW-margin, 22, {align:'right'});
  y = 44;

  doc.setTextColor(...dark); doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text(expandedBill.bill.name, margin, y); y += 8;

  const status = expandedBill.bill.status;
  const badgeColors = {Settled:[0,122,102],Pending:[229,62,90],Partial:[217,119,6]};
  doc.setFillColor(...(badgeColors[status]||[136,136,136]));
  doc.roundedRect(margin,y,22,6,1,1,'F');
  doc.setTextColor(...white); doc.setFontSize(7); doc.setFont('helvetica','bold');
  doc.text(status.toUpperCase(),margin+11,y+4,{align:'center'}); y += 12;

  const col1 = margin+6, col2 = margin+contentW/2;
  doc.setFillColor(...lightBg); doc.roundedRect(margin,y,contentW,28,3,3,'F');
  doc.setTextColor(...grey); doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('TOTAL AMOUNT',col1,y+8); doc.text('PAID BY',col2,y+8);
  doc.text('DATE',col1,y+20); doc.text('CATEGORY',col2,y+20);
  doc.setTextColor(...dark); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(`Rs. ${Number(expandedBill.bill.amount).toLocaleString('en-IN')}`,col1,y+15);
  doc.text(expandedBill.bill.paid_by_name,col2,y+15);
  doc.setFontSize(10);
  doc.text(expandedBill.bill.date,col1,y+26);
  doc.text(expandedBill.bill.category||'Other',col2,y+26); y += 36;

  doc.setTextColor(...grey); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('SPLIT BETWEEN',margin,y); y += 6;
  doc.setDrawColor(230,230,230); doc.line(margin,y,margin+contentW,y); y += 5;
  doc.setFillColor(240,250,248); doc.rect(margin,y,contentW,7,'F');
  doc.setTextColor(...grey); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('NAME',margin+4,y+5);
  doc.text('SHARE',margin+contentW*0.55,y+5);
  doc.text('STATUS',margin+contentW*0.75,y+5); y += 10;

  expandedBill.members.forEach((member,i) => {
    const isMe = member.user_id === currentUser.id;
    doc.setFillColor(...(isMe?[240,250,248]:(i%2===0?white:[252,252,252])));
    doc.rect(margin,y-3,contentW,9,'F');
    doc.setFillColor(...(isMe?teal:[196,116,138]));
    doc.circle(margin+5,y+1.5,3,'F');
    doc.setTextColor(...white); doc.setFontSize(6); doc.setFont('helvetica','bold');
    doc.text(member.avatar||'?',margin+5,y+3.5,{align:'center'});
    doc.setTextColor(...dark); doc.setFontSize(9);
    doc.setFont('helvetica',isMe?'bold':'normal');
    doc.text(member.name+(isMe?' (You)':'')+(member.user_id===expandedBill.bill.paid_by?' *':''),margin+11,y+3.5);
    doc.setFont('helvetica','bold');
    doc.text(`Rs. ${Number(member.share).toLocaleString('en-IN')}`,margin+contentW*0.55,y+3.5);
    doc.setFillColor(...(member.is_paid?[0,122,102]:[229,62,90]));
    doc.roundedRect(margin+contentW*0.74,y-1,14,5.5,1,1,'F');
    doc.setTextColor(...white); doc.setFontSize(6.5); doc.setFont('helvetica','bold');
    doc.text(member.is_paid?'PAID':'UNPAID',margin+contentW*0.74+7,y+2.5,{align:'center'});
    y += 10;
  });

  y += 4;
  doc.setDrawColor(230,230,230); doc.line(margin,y,margin+contentW,y); y += 8;
  const paidCount = expandedBill.members.filter(m=>m.is_paid).length;
  const myMember  = expandedBill.members.find(m=>m.user_id===currentUser.id);
  doc.setFillColor(...lightBg); doc.roundedRect(margin,y,contentW,22,3,3,'F');
  doc.setTextColor(...grey); doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('SETTLEMENT',col1,y+8); doc.text('YOUR SHARE',col2,y+8);
  doc.setTextColor(...dark); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(`${paidCount} of ${expandedBill.members.length} paid`,col1,y+16);
  if (myMember) {
    doc.setTextColor(...(myMember.is_paid?[0,122,102]:[229,62,90]));
    doc.text(`Rs. ${Number(myMember.share).toLocaleString('en-IN')} - ${myMember.is_paid?'Paid':'Unpaid'}`,col2,y+16);
  }
  doc.setFillColor(...dark); doc.rect(0,282,pageW,15,'F');
  doc.setTextColor(...white); doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('BillBuddy - Expense Reconciliation & Settlement System',margin,291);
  doc.setTextColor(...teal);
  doc.text('* = paid for this bill',pageW-margin,291,{align:'right'});
  doc.save(`BillBuddy_${expandedBill.bill.name.replace(/\s+/g,'_')}_${expandedBill.bill.date}.pdf`);
};

// ─────────────────────────────────────────────────────

function History({ user }) {
  const [bills,         setBills]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('All');
  const [filterCat,     setFilterCat]     = useState('All');
  const [expandedId,    setExpandedId]    = useState(null);
  const [expandedBill,  setExpandedBill]  = useState(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [payNote,       setPayNote]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting,     setExporting]     = useState(false);

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try { const res = await getMyBills(); setBills(res.data.bills || []); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleExpand = async (bill) => {
    if (expandedId === bill.id) { setExpandedId(null); setExpandedBill(null); return; }
    setExpandedId(bill.id); setExpandLoading(true);
    try { const res = await getBill(bill.id); setExpandedBill(res.data); }
    catch (err) { console.error(err); }
    setExpandLoading(false);
  };

  const handleMarkPaid = async (billId) => {
    setActionLoading(true);
    try {
      await markAsPaid(billId, payNote); setPayNote('');
      const res = await getBill(billId); setExpandedBill(res.data);
      fetchBills();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleConfirm = async (billId, userId) => {
    setActionLoading(true);
    try {
      await confirmPayment(billId, userId);
      const res = await getBill(billId); setExpandedBill(res.data);
      fetchBills();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleExportPDF = async (bill) => {
    if (!expandedBill) return;
    setExporting(true);
    try { await exportBillPDF(bill, expandedBill, user); }
    catch (err) { console.error(err); }
    setExporting(false);
  };

  const filtered = bills.filter(bill => {
    const matchSearch = bill.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || bill.status === filterStatus;
    const matchCat    = filterCat === 'All'    || bill.category === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  const totalBills   = bills.length;
  const settledCount = bills.filter(b => b.status === 'Settled').length;
  const pendingCount = bills.filter(b => b.status !== 'Settled').length;

  if (loading) return (
    <div style={{ padding: '16px', color: '#888', fontSize: '14px' }}>
      Loading history...
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar">
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>History</div>
        <div style={{ fontSize: '13px', color: '#888' }}>
          {totalBills} bill{totalBills !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Page ── */}
      <div className="page">

        {/* Desktop header */}
        <div className="desktop-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>History</h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>All your bills in one place</p>
        </div>

        {/* Stats — 3 columns, no min-width */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'Total',   value: totalBills,   color: '#0a1628' },
            { label: 'Settled', value: settledCount, color: '#007a66' },
            { label: 'Pending', value: pendingCount, color: '#e53e5a' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: '12px', padding: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bills..."
            style={{
              width: '100%', padding: '11px 12px 11px 36px',
              borderRadius: '12px', border: '1.5px solid #eee',
              fontSize: '14px', color: '#0a1628', outline: 'none',
              background: '#fff', fontFamily: 'Segoe UI, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{
          display: 'flex', gap: '6px', marginBottom: '16px',
          overflowX: 'auto', paddingBottom: '4px',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: filterStatus === s ? '#0a1628' : '#fff',
              color: filterStatus === s ? '#fff' : '#666',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>{s}</button>
          ))}
          <div style={{ width: '1px', background: '#eee', flexShrink: 0, margin: '0 2px' }} />
          {categories.slice(1).map(c => (
            <button key={c} onClick={() => setFilterCat(filterCat === c ? 'All' : c)} style={{
              padding: '6px 12px', borderRadius: '20px', border: 'none',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: filterCat === c ? '#00C9A7' : '#fff',
              color: filterCat === c ? '#fff' : '#666',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>{categoryIcon[c]} {c}</button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '40px 20px',
            textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628', marginBottom: '4px' }}>No bills found</div>
            <div style={{ fontSize: '13px', color: '#aaa' }}>Try a different search or filter</div>
          </div>
        )}

        {/* Bill list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(bill => {
            const isExpanded = expandedId === bill.id;
            const iOwePayer  = bill.paid_by !== user.id && bill.i_paid === 0;
            const iAmPayer   = bill.paid_by === user.id;
            const avatarBg   = categoryColor[bill.category] || '#888';

            return (
              <div key={bill.id} style={{
                background: '#fff', borderRadius: '14px',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden',
                border: isExpanded ? '1.5px solid #00C9A7' : '1.5px solid transparent',
                transition: 'border 0.2s',
              }}>

                {/* Row */}
                <div onClick={() => handleExpand(bill)} style={{
                  padding: '12px 14px', display: 'flex',
                  alignItems: 'center', gap: '10px', cursor: 'pointer',
                }}>
                  {/* Initials avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: avatarBg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700', color: '#fff',
                  }}>
                    {bill.name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Name + date — flex 1 + minWidth 0 so it truncates */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: '600', color: '#0a1628',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{bill.name}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                      {bill.paid_by_name} · {bill.date}
                    </div>
                  </div>

                  {/* Amount + status — fixed width so it never pushes layout */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a1628' }}>
                      ₹{Number(bill.amount).toLocaleString()}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: '600', padding: '2px 8px',
                      borderRadius: '20px', display: 'inline-block', marginTop: '3px',
                      background: statusColor[bill.status]?.bg || '#eee',
                      color: statusColor[bill.status]?.color || '#888',
                    }}>{bill.status}</span>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid #f0f0f0',
                    padding: '12px 14px',
                    background: '#fafafa',
                  }}>
                    {expandLoading ? (
                      <div style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                        Loading...
                      </div>
                    ) : expandedBill ? (
                      <>
                        {/* Your share */}
                        <div style={{
                          background: '#fff', borderRadius: '10px',
                          padding: '10px 12px', marginBottom: '12px',
                          border: '1px solid #eee',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontSize: '12px', color: '#888' }}>Your share</span>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#0a1628' }}>
                            ₹{Number(bill.my_share).toLocaleString()}
                          </span>
                        </div>

                        {/* Members label */}
                        <div style={{
                          fontSize: '11px', fontWeight: '700', color: '#aaa',
                          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                        }}>Split between</div>

                        {/* Members */}
                        {expandedBill.members.map(member => (
                          <div key={member.user_id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 0', borderBottom: '1px solid #f0f0f0',
                          }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: '700', color: '#fff', flexShrink: 0,
                            }}>{member.avatar}</div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                                {member.name}
                                {member.user_id === user.id && (
                                  <span style={{ fontSize: '10px', color: '#aaa', marginLeft: '4px' }}>(you)</span>
                                )}
                                {member.user_id === expandedBill.bill.paid_by && (
                                  <span style={{ fontSize: '10px', color: '#00C9A7', marginLeft: '4px' }}>paid</span>
                                )}
                              </div>
                              {member.note && (
                                <div style={{ fontSize: '11px', color: '#aaa' }}>"{member.note}"</div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>
                                ₹{Number(member.share).toLocaleString()}
                              </div>
                              <div style={{
                                fontSize: '10px', fontWeight: '500', marginTop: '2px',
                                color: member.is_paid ? '#007a66' : '#e53e5a',
                              }}>
                                {member.is_paid ? '✓ Paid' : 'Unpaid'}
                              </div>
                            </div>

                            {iAmPayer && member.user_id !== user.id && member.is_paid === 1 && (
                              <button
                                onClick={() => handleConfirm(bill.id, member.user_id)}
                                disabled={actionLoading}
                                style={{
                                  padding: '4px 8px', background: '#e6f9f5',
                                  color: '#007a66', border: '1px solid #c8f0e8',
                                  borderRadius: '6px', fontSize: '11px',
                                  fontWeight: '600', cursor: 'pointer', flexShrink: 0,
                                }}
                              >Confirm</button>
                            )}
                          </div>
                        ))}

                        {/* Export PDF */}
                        <button
                          onClick={() => handleExportPDF(bill)}
                          disabled={exporting}
                          style={{
                            width: '100%', padding: '10px', marginTop: '12px',
                            background: '#fff', color: '#0a1628',
                            border: '1.5px solid #eee', borderRadius: '10px',
                            fontSize: '13px', fontWeight: '600',
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {exporting ? '⏳ Generating...' : '📄 Export as PDF'}
                        </button>

                        {/* Mark as paid */}
                        {iOwePayer && (
                          <div style={{
                            marginTop: '10px', background: '#fff',
                            borderRadius: '10px', padding: '12px', border: '1px solid #eee',
                          }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
                              Mark your payment as done
                            </div>
                            <input
                              value={payNote} onChange={e => setPayNote(e.target.value)}
                              placeholder="Add a note (optional)"
                              style={{
                                width: '100%', padding: '10px 12px',
                                borderRadius: '8px', border: '1.5px solid #eee',
                                fontSize: '13px', color: '#0a1628', outline: 'none',
                                marginBottom: '8px', fontFamily: 'Segoe UI, sans-serif',
                                boxSizing: 'border-box',
                              }}
                            />
                            <a
                              href={`upi://pay?pa=${expandedBill.bill.paid_by_upi}&pn=${encodeURIComponent(expandedBill.bill.paid_by_name)}&am=${bill.my_share}&cu=INR&tn=${encodeURIComponent(bill.name)}`}
                              style={{
                                display: 'block', width: '100%', padding: '11px',
                                background: '#0a1628', color: '#fff', borderRadius: '8px',
                                fontSize: '13px', fontWeight: '600', textAlign: 'center',
                                textDecoration: 'none', marginBottom: '8px',
                                boxSizing: 'border-box',
                              }}
                            >📲 Pay via UPI</a>
                            <button
                              onClick={() => handleMarkPaid(bill.id)}
                              disabled={actionLoading}
                              style={{
                                width: '100%', padding: '11px',
                                background: actionLoading ? '#aaa' : '#00C9A7',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                boxSizing: 'border-box',
                              }}
                            >{actionLoading ? '...' : '✓ Mark Paid'}</button>
                          </div>
                        )}

                        {/* Already paid */}
                        {!iAmPayer && bill.i_paid === 1 && (
                          <div style={{
                            marginTop: '10px', background: '#e6f9f5',
                            borderRadius: '10px', padding: '12px',
                            fontSize: '13px', color: '#007a66',
                            fontWeight: '500', textAlign: 'center',
                          }}>
                            ✅ You've paid your share
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#ccc' }}>
            Showing {filtered.length} of {totalBills} bills
          </div>
        )}

      </div>
    </>
  );
}

export default History;