// import React, { useState, useEffect } from 'react';
// import { getDashboardSummary, getMyBills } from '../utils/api';
// import { generateUPILink } from '../utils/splitCalculator';

// const statusColor = {
//   Settled: { bg: '#e6f9f5', color: '#007a66' },
//   Pending: { bg: '#fdeef1', color: '#e53e5a' },
//   Partial: { bg: '#fff4e5', color: '#d97706' },
// };

// const categoryIcon = {
//   Travel: '✈️', Food: '🍽️', Utilities: '💡',
//   Groceries: '🛒', Entertainment: '🎬', Other: '📋',
// };

// function MetricCard({ label, amount, sub, accent, icon }) {
//   return (
//     <div style={{
//       background: '#fff', borderRadius: '16px', padding: '24px',
//       flex: 1, minWidth: '180px',
//       boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
//       borderTop: `4px solid ${accent}`,
//     }}>
//       <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
//       <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>{label}</div>
//       <div style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>
//         ₹{Number(amount || 0).toLocaleString()}
//       </div>
//       {sub && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{sub}</div>}
//     </div>
//   );
// }

// function Dashboard({ user }) {
//   const [summary, setSummary] = useState({
//     you_owe: 0, owed_to_you: 0, total_spent: 0, net_balance: 0
//   });
//   const [bills, setBills] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       const [summaryRes, billsRes] = await Promise.all([
//         getDashboardSummary(),
//         getMyBills(),
//       ]);
//       setSummary(summaryRes.data);
//       setBills(billsRes.data.bills || []);
//     } catch (err) {
//       console.error('Dashboard fetch error:', err);
//     }
//     setLoading(false);
//   };

//   // Get people who owe current user
//   const pendingBills = bills.filter(b => b.status !== 'Settled');
//   const recentBills = bills.slice(0, 5);

//   if (loading) {
//     return (
//       <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>
//         Loading your dashboard...
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '32px', maxWidth: '960px' }}>

//       {/* Header */}
//       <div style={{ marginBottom: '28px' }}>
//         <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>
//           Hey {user?.name?.split(' ')[0]} 👋
//         </h1>
//         <p style={{ color: '#888', marginTop: '4px', fontSize: '14px' }}>
//           Here's your expense overview
//         </p>
//       </div>

//       {/* Metric Cards */}
//       <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
//         <MetricCard label="Total Spent" amount={summary.total_spent}
//           sub="All time" accent="#00C9A7" icon="💰" />
//         <MetricCard label="You Owe" amount={summary.you_owe}
//           sub="Pending payment" accent="#e53e5a" icon="📤" />
//         <MetricCard label="You're Owed" amount={summary.owed_to_you}
//           sub="Awaiting payment" accent="#007a66" icon="📥" />
//         <MetricCard label="Net Balance" amount={Math.abs(summary.net_balance)}
//           sub={summary.net_balance >= 0 ? 'In your favour' : 'You owe more'}
//           accent="#C4748A" icon="⚖️" />
//       </div>

//       {/* Unsettled Banner */}
//       {pendingBills.length > 0 && (
//         <div style={{
//           background: 'linear-gradient(135deg, #0a1628, #1a2f50)',
//           borderRadius: '14px', padding: '18px 24px',
//           display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//           marginBottom: '28px', flexWrap: 'wrap', gap: '12px'
//         }}>
//           <div>
//             <div style={{ color: '#fff', fontWeight: '600', fontSize: '15px' }}>
//               🔔 {pendingBills.length} bill{pendingBills.length > 1 ? 's' : ''} still unsettled
//             </div>
//             <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
//               Check your notifications to follow up
//             </div>
//           </div>
//           <button style={{
//             background: '#00C9A7', color: '#fff', border: 'none',
//             borderRadius: '8px', padding: '10px 20px',
//             fontWeight: '600', fontSize: '13px', cursor: 'pointer'
//           }}>
//             View Bills
//           </button>
//         </div>
//       )}

//       {/* Empty state */}
//       {bills.length === 0 && (
//         <div style={{
//           background: '#fff', borderRadius: '16px', padding: '48px',
//           textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
//           marginBottom: '24px'
//         }}>
//           <div style={{ fontSize: '48px', marginBottom: '12px' }}>💸</div>
//           <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
//             No bills yet!
//           </div>
//           <div style={{ fontSize: '14px', color: '#888' }}>
//             Create your first split to get started
//           </div>
//         </div>
//       )}

//       {bills.length > 0 && (
//         <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

//           {/* Recent Bills */}
//           <div style={{ flex: 2, minWidth: '300px' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
//               <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628' }}>Recent Bills</h2>
//             </div>

//             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//               {recentBills.map(bill => (
//                 <div key={bill.id} style={{
//                   background: '#fff', borderRadius: '12px', padding: '16px 20px',
//                   display: 'flex', alignItems: 'center', gap: '14px',
//                   boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
//                 }}>
//                   <div style={{
//                     width: '42px', height: '42px', borderRadius: '10px',
//                     background: '#f0faf8', display: 'flex', alignItems: 'center',
//                     justifyContent: 'center', fontSize: '20px', flexShrink: 0
//                   }}>
//                     {categoryIcon[bill.category] || '📋'}
//                   </div>
//                   <div style={{ flex: 1 }}>
//                     <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
//                       {bill.name}
//                     </div>
//                     <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
//                       {bill.date} · Paid by {bill.paid_by_name}
//                     </div>
//                   </div>
//                   <div style={{ textAlign: 'right' }}>
//                     <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>
//                       ₹{Number(bill.amount).toLocaleString()}
//                     </div>
//                     <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
//                       Your share: ₹{Number(bill.my_share).toLocaleString()}
//                     </div>
//                     <span style={{
//                       fontSize: '11px', fontWeight: '500', padding: '2px 8px',
//                       borderRadius: '20px', marginTop: '4px', display: 'inline-block',
//                       background: statusColor[bill.status]?.bg || '#eee',
//                       color: statusColor[bill.status]?.color || '#888',
//                     }}>
//                       {bill.status}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Quick Actions */}
//           <div style={{ flex: 1, minWidth: '240px' }}>
//             <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '14px' }}>
//               Quick Actions
//             </h2>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//               {[
//                 { icon: '➕', label: 'New Split', path: '/new-split' },
//                 { icon: '📲', label: 'View UPI Links', path: '/upi-links' },
//                 { icon: '🔔', label: 'Notifications', path: '/notifications' },
//                 { icon: '👥', label: 'My Groups', path: '/groups' },
//               ].map((action, i) => (
//                 <button key={i} onClick={() => window.location.href = action.path} style={{
//                   display: 'flex', alignItems: 'center', gap: '10px',
//                   background: '#fff', border: '1.5px solid #eee',
//                   borderRadius: '10px', padding: '12px 16px',
//                   cursor: 'pointer', fontSize: '13px', fontWeight: '500',
//                   color: '#0a1628',
//                 }}>
//                   <span>{action.icon}</span> {action.label}
//                 </button>
//               ))}
//             </div>

//             {/* Your UPI ID card */}
//             <div style={{
//               background: 'linear-gradient(135deg, #0a1628, #1a2f50)',
//               borderRadius: '12px', padding: '16px', marginTop: '16px'
//             }}>
//               <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
//                 Your UPI ID
//               </div>
//               <div style={{ fontSize: '14px', fontWeight: '600', color: '#00C9A7' }}>
//                 {user?.upi_id || 'Not set — add in settings'}
//               </div>
//               {user?.upi_id && (
//                 <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
//                   Share this with friends to receive payments
//                 </div>
//               )}
//             </div>
//           </div>

//         </div>
//       )}
//     </div>
//   );
// }
// export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, getMyBills, getUnreadCount } from '../utils/api';

const statusColor = {
  Settled: { bg: '#e6f9f5', color: '#007a66' },
  Pending: { bg: '#fdeef1', color: '#e53e5a' },
  Partial: { bg: '#fff4e5', color: '#d97706' },
};

const categoryIcon = {
  Travel: '✈️', Food: '🍽️', Utilities: '💡',
  Groceries: '🛒', Entertainment: '🎬', Other: '📋',
};

function MetricCard({ label, amount, sub, accent, icon }) {
  return (
    <div className="metric-card" style={{ borderTop: `4px solid ${accent}` }}>
      <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#0a1628' }}>
        ₹{Number(amount || 0).toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    you_owe: 0, owed_to_you: 0, total_spent: 0, net_balance: 0
  });
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, billsRes, unreadRes] = await Promise.all([
        getDashboardSummary(),
        getMyBills(),
        getUnreadCount(),
      ]);
      setSummary(summaryRes.data);
      setBills(billsRes.data.bills || []);
      setUnreadCount(unreadRes.data.count || 0);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
    setLoading(false);
  };

  const pendingBills = bills.filter(b => b.status !== 'Settled');
  const recentBills = bills.slice(0, 5);

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>
        Loading your dashboard...
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="mobile-topbar">
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#00C9A7' }}>💸 ShareSettle</div>
        <div
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative', cursor: 'pointer', padding: '6px' }}
        >
          <span style={{ fontSize: '22px' }}>🔔</span>
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: '2px', right: '2px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#e53e5a', color: '#fff',
              fontSize: '10px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="page" style={{ maxWidth: '960px' }}>

        {/* Desktop Header — hidden on mobile */}
        <div className="desktop-header" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>
            Hey {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#888', marginTop: '4px', fontSize: '14px' }}>
            Here's your expense overview
          </p>
        </div>

        {/* Mobile greeting — shown only on mobile */}
        <div className="mobile-greeting">
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>
            Hey {user?.name?.split(' ')[0]} 👋
          </span>
          <span style={{ fontSize: '13px', color: '#888', marginLeft: '8px' }}>
            Here's your overview
          </span>
        </div>

        {/* Metric Cards — 4 in a row desktop, 2x2 on mobile */}
        <div className="metric-cards">
          <MetricCard label="Total Spent" amount={summary.total_spent}
            sub="All time" accent="#00C9A7" icon="💰" />
          <MetricCard label="You Owe" amount={summary.you_owe}
            sub="Pending" accent="#e53e5a" icon="📤" />
          <MetricCard label="You're Owed" amount={summary.owed_to_you}
            sub="Awaiting" accent="#007a66" icon="📥" />
          <MetricCard label="Net Balance" amount={Math.abs(summary.net_balance)}
            sub={summary.net_balance >= 0 ? 'In your favour' : 'You owe more'}
            accent="#C4748A" icon="⚖️" />
        </div>

        {/* Unsettled Banner */}
        {pendingBills.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #0a1628, #1a2f50)',
            borderRadius: '14px', padding: '18px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '28px', flexWrap: 'wrap', gap: '12px'
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: '600', fontSize: '15px' }}>
                🔔 {pendingBills.length} bill{pendingBills.length > 1 ? 's' : ''} still unsettled
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                Check notifications to follow up
              </div>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              style={{
                background: '#00C9A7', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '10px 20px',
                fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                width: 'auto',
              }}
            >
              View Bills
            </button>
          </div>
        )}

        {/* Empty State */}
        {bills.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '48px',
            textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💸</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
              No bills yet!
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              Create your first split to get started
            </div>
            <button
              onClick={() => navigate('/new-split')}
              style={{
                marginTop: '16px', background: '#00C9A7', color: '#fff',
                border: 'none', borderRadius: '10px', padding: '12px 24px',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              ➕ Create Split
            </button>
          </div>
        )}

        {bills.length > 0 && (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

            {/* Recent Bills */}
            <div style={{ flex: 2, minWidth: '300px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '14px'
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628' }}>
                  Recent Bills
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentBills.map(bill => (
                  <div key={bill.id} className="bill-row" style={{
                    background: '#fff', borderRadius: '12px', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: '#f0faf8', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '18px', flexShrink: 0
                    }}>
                      {categoryIcon[bill.category] || '📋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: '500', color: '#0a1628',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {bill.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                        {bill.date} · {bill.paid_by_name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1628' }}>
                        ₹{Number(bill.amount).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                        Your: ₹{Number(bill.my_share).toLocaleString()}
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: '500', padding: '2px 8px',
                        borderRadius: '20px', marginTop: '4px', display: 'inline-block',
                        background: statusColor[bill.status]?.bg || '#eee',
                        color: statusColor[bill.status]?.color || '#888',
                      }}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions — hidden on mobile (accessible via bottom nav) */}
            <div className="quick-actions-panel" style={{ flex: 1, minWidth: '240px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '14px' }}>
                Quick Actions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { icon: '➕', label: 'New Split', path: '/new-split' },
                  { icon: '📲', label: 'View UPI Links', path: '/upi-links' },
                  { icon: '🔔', label: 'Notifications', path: '/notifications' },
                  { icon: '👥', label: 'My Groups', path: '/groups' },
                ].map((action, i) => (
                  <button key={i} onClick={() => navigate(action.path)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: '#fff', border: '1.5px solid #eee',
                    borderRadius: '10px', padding: '12px 16px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                    color: '#0a1628',
                  }}>
                    <span>{action.icon}</span> {action.label}
                  </button>
                ))}
              </div>

              {/* UPI ID card */}
              <div style={{
                background: 'linear-gradient(135deg, #0a1628, #1a2f50)',
                borderRadius: '12px', padding: '16px', marginTop: '16px'
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  Your UPI ID
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#00C9A7' }}>
                  {user?.upi_id || 'Not set — add in settings'}
                </div>
                {user?.upi_id && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                    Share this with friends to receive payments
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Mobile UPI card — shown below bills only on mobile */}
        {user?.upi_id && (
          <div className="mobile-upi-card" style={{
            background: 'linear-gradient(135deg, #0a1628, #1a2f50)',
            borderRadius: '12px', padding: '16px', marginTop: '16px'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
              Your UPI ID
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#00C9A7' }}>
              {user.upi_id}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              Share with friends to receive payments
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default Dashboard;