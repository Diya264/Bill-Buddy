import React, { useState, useEffect } from 'react';
import { getMyBills } from '../utils/api';

const categoryIcon = {
  Travel: '✈️', Food: '🍽️', Utilities: '💡',
  Groceries: '🛒', Entertainment: '🎬', Other: '📋',
};

const categoryColors = {
  Travel: '#00C9A7',
  Food: '#C4748A',
  Utilities: '#f59e0b',
  Groceries: '#3b82f6',
  Entertainment: '#8b5cf6',
  Other: '#6b7280',
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function PieChart({ data, size = 160 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#f0f0f0', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', color: '#aaa',
      }}>
        No data
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const innerR = r * 0.55;

  const toXY = (fraction, radius) => {
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // If only one category — draw a full circle
  if (data.length === 1) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill={data[0].color} />
        <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
      </svg>
    );
  }

  let cumulative = 0;
  const paths = data.map((slice, i) => {
    const pct = slice.value / total;
    const startFrac = cumulative;
    cumulative += pct;
    const endFrac = cumulative;
    const largeArc = pct > 0.5 ? 1 : 0;

    const s  = toXY(startFrac, r);
    const e  = toXY(endFrac, r);
    const si = toXY(startFrac, innerR);
    const ei = toXY(endFrac, innerR);

    const d = [
      `M ${s.x} ${s.y}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`,
      `L ${ei.x} ${ei.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${si.x} ${si.y}`,
      'Z',
    ].join(' ');

    return <path key={i} d={d} fill={slice.color} stroke="#fff" strokeWidth="2" />;
  });

  return (
    <svg width={size} height={size}>
      {paths}
    </svg>
  );
}

function Analytics({ user }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try {
      const res = await getMyBills();
      setBills(res.data.bills || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    }
    setLoading(false);
  };

  const filteredBills = bills.filter(bill => {
    if (timeRange === 'all') return true;
    const billDate = new Date(bill.date);
    const now = new Date();
    const monthsBack = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : 6;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
    return billDate >= cutoff;
  });

  // Category breakdown
  const categoryTotals = {};
  filteredBills.forEach(bill => {
    const cat = bill.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(bill.my_share);
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  const totalSpent = categoryData.reduce((sum, d) => sum + d.value, 0);

  // Monthly spending — last 6 months
  const monthlyData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthBills = bills.filter(bill => {
      const bd = new Date(bill.date);
      return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
    });
    const total = monthBills.reduce((sum, b) => sum + Number(b.my_share), 0);
    monthlyData.push({ month: months[d.getMonth()], total });
  }

  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  // Bills I paid that are still pending
  const pendingCollections = filteredBills.filter(
    b => b.paid_by === user.id && b.status !== 'Settled'
  );

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>
        Loading analytics...
      </div>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>Analytics</div>
      </div>

      <div className="page" style={{ maxWidth: '900px' }}>

        {/* Desktop header */}
        <div className="desktop-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>Analytics</h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
            Understand your spending patterns
          </p>
        </div>

        {/* Time range filter */}
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '24px',
          overflowX: 'auto', paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {[
            { label: 'All time', value: 'all' },
            { label: 'Last month', value: '1m' },
            { label: 'Last 3 months', value: '3m' },
            { label: 'Last 6 months', value: '6m' },
          ].map(r => (
            <button key={r.value} onClick={() => setTimeRange(r.value)} style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: timeRange === r.value ? '#0a1628' : '#fff',
              color: timeRange === r.value ? '#fff' : '#888',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>{r.label}</button>
          ))}
        </div>

        {/* Empty state */}
        {bills.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '56px 20px',
            textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
              No data yet
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              Create some splits to see your analytics
            </div>
          </div>
        ) : (
          <>
            {/* Top stats */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, icon: '💰', color: '#00C9A7' },
                { label: 'Bills Tracked', value: filteredBills.length, icon: '🧾', color: '#C4748A' },
                { label: 'Categories', value: categoryData.length, icon: '📂', color: '#3b82f6' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: '14px', padding: '16px',
                  flex: 1, minWidth: '90px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  borderTop: `3px solid ${stat.color}`,
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0a1628' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Pie chart + legend */}
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628', marginBottom: '16px' }}>
                Spending by Category
              </h2>

              {/* On mobile: stacked. On desktop: side by side */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>

                {/* Pie */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '160px' }}>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PieChart data={categoryData} size={160} />
                    {/* Center label */}
                    <div style={{
                      position: 'absolute',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>Total</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a1628' }}>
                        ₹{totalSpent >= 1000
                          ? `${(totalSpent / 1000).toFixed(1)}k`
                          : totalSpent.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ flex: 1, minWidth: '180px' }}>
                  {categoryData.map((cat, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 0', borderBottom: '1px solid #f5f5f5',
                    }}>
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '3px',
                        background: cat.color, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>
                        {categoryIcon[cat.name] || '📋'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                          {cat.name}
                        </div>
                        <div style={{
                          height: '4px', background: '#f0f0f0',
                          borderRadius: '2px', marginTop: '4px',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: cat.color,
                            width: `${(cat.value / totalSpent) * 100}%`,
                          }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>
                          ₹{cat.value.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>
                          {Math.round((cat.value / totalSpent) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628', marginBottom: '16px' }}>
                Monthly Spending
              </h2>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: '8px',
                height: '120px', position: 'relative', paddingBottom: '20px',
              }}>
                {monthlyData.map((m, i) => {
                  const heightPct = (m.total / maxMonthly) * 100;
                  const isCurrent = i === monthlyData.length - 1;
                  return (
                    <div key={i} style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'flex-end',
                      height: '100%', gap: '4px',
                    }}>
                      {m.total > 0 && (
                        <div style={{ fontSize: '9px', color: '#888' }}>
                          {m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : m.total}
                        </div>
                      )}
                      <div style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        background: isCurrent ? '#00C9A7' : '#d1f0ea',
                        height: `${Math.max(heightPct, m.total > 0 ? 6 : 0)}%`,
                        minHeight: m.total > 0 ? '6px' : '0px',
                        transition: 'height 0.4s',
                      }} />
                      <div style={{
                        position: 'absolute', bottom: 0,
                        fontSize: '10px',
                        color: isCurrent ? '#0a1628' : '#aaa',
                        fontWeight: isCurrent ? '700' : '400',
                      }}>
                        {m.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending collections */}
            {pendingCollections.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: '16px', padding: '20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px',
              }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628', marginBottom: '14px' }}>
                  Pending Collections
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingCollections.map(bill => (
                    <div key={bill.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', background: '#f8f9fc',
                      borderRadius: '10px', border: '1px solid #eee',
                    }}>
                      <div style={{ fontSize: '18px' }}>
                        {categoryIcon[bill.category] || '📋'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: '500', color: '#0a1628',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {bill.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                          {bill.date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a1628' }}>
                          ₹{Number(bill.amount).toLocaleString()}
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: '600', padding: '2px 8px',
                          borderRadius: '20px', background: '#fff4e5', color: '#d97706',
                        }}>
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top insight banner */}
            {categoryData.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #0a1628, #1a2f50)',
                borderRadius: '14px', padding: '18px 20px',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  💡 Top spending category
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#00C9A7' }}>
                  {categoryIcon[categoryData[0].name]} {categoryData[0].name}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  ₹{categoryData[0].value.toLocaleString()} · {Math.round((categoryData[0].value / totalSpent) * 100)}% of total spending
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default Analytics;