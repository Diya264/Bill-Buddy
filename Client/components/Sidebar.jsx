import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const allDesktopItems = [
  { icon: '⊞', label: 'Dashboard', path: '/' },
  { icon: '➕', label: 'New Split', path: '/new-split' },
  { icon: '👥', label: 'Groups', path: '/groups' },
  { icon: '🕐', label: 'History', path: '/history' },
  { icon: '📊', label: 'Analytics', path: '/analytics' },
  { icon: '🔁', label: 'Recurring', path: '/recurring' },
  { icon: '🤝', label: 'Settle Up', path: '/settle' },
];

const bottomItems = [
  { icon: '📲', label: 'UPI Links', path: '/upi-links' },
  { icon: '🔔', label: 'Notifications', path: '/notifications' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

const moreItems = [
  { icon: '🕐', label: 'History', path: '/history' },
  { icon: '📊', label: 'Analytics', path: '/analytics' },
  { icon: '🔁', label: 'Recurring', path: '/recurring' },
  { icon: '🤝', label: 'Settle Up', path: '/settle' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const NavItem = ({ icon, label, path }) => {
    const active = location.pathname === path;
    return (
      <div onClick={() => navigate(path)} style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 20px', cursor: 'pointer', borderRadius: '10px',
        margin: '2px 10px',
        background: active ? 'rgba(0,201,167,0.15)' : 'transparent',
        color: active ? '#00C9A7' : 'rgba(255,255,255,0.7)',
        fontWeight: active ? '600' : '400', fontSize: '14px',
        transition: 'all 0.2s',
      }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        {label}
        {active && (
          <div style={{
            marginLeft: 'auto', width: '4px', height: '4px',
            borderRadius: '50%', background: '#00C9A7'
          }} />
        )}
      </div>
    );
  };

  // Bottom nav: Dashboard | Groups | [+] | Notifications | More
  const bottomNavItems = [
    { icon: '⊞', path: '/' },
    { icon: '👥', path: '/groups' },
    null, // center plus button
    { icon: '🔔', path: '/notifications' },
    { icon: '⋯', path: null }, // more drawer
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <div className="sidebar">
        <div style={{ padding: '0 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#00C9A7' }}>💸 ShareSettle</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
            Split smart, pay instant
          </div>
        </div>
        <div style={{ flex: 1, paddingTop: '16px' }}>
          {allDesktopItems.map(item => <NavItem key={item.path} {...item} />)}
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />
        <div style={{ paddingTop: '8px', paddingBottom: '16px' }}>
          {bottomItems.map(item => <NavItem key={item.path} {...item} />)}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '600', color: 'white', flexShrink: 0
            }}>{user?.avatar || 'U'}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'white' }}>{user?.name || 'You'}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{user?.upi_id || 'No UPI ID'}</div>
            </div>
          </div>
          <div onClick={onLogout} style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', paddingLeft: '4px'
          }}>
            🚪 Logout
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <div className="bottom-nav">
        {bottomNavItems.map((item, i) => {
          // Center ➕ button
          if (item === null) {
            return (
              <div
                key="plus"
                onClick={() => navigate('/new-split')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '44px', height: '44px',
                  fontSize: '35px', color: 'rgba(255,255,255,0.9)',
                  cursor: 'pointer',
                }}>
                +
                </div>
              </div>
            );
          }

          // More button
          if (item.path === null) {
            return (
              <div
                key="more"
                onClick={() => setShowMore(!showMore)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '44px', height: '44px', borderRadius: '12px',
                  cursor: 'pointer',
                  color: showMore ? '#00C9A7' : 'rgba(255,255,255,0.5)',
                  fontSize: '22px',
                  transition: 'color 0.2s',
                }}
              >
                {item.icon}
              </div>
            );
          }

          // Regular nav icon
          const active = location.pathname === item.path;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '44px', height: '44px', borderRadius: '12px',
                cursor: 'pointer',
                color: active ? '#00C9A7' : 'rgba(255,255,255,0.5)',
                fontSize: '22px',
                transition: 'color 0.2s',
                position: 'relative',
              }}
            >
              {item.icon}
              {/* Active dot */}
              {active && (
                <div style={{
                  position: 'absolute', bottom: '2px',
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: '#00C9A7',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── More Drawer (mobile) ── */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowMore(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.45)', zIndex: 150,
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', bottom: '64px', left: 0, right: 0,
            background: '#0a1628', borderRadius: '20px 20px 0 0',
            padding: '16px 20px 20px', zIndex: 200,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
          }}>
            {/* Handle */}
            <div style={{
              width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)',
              borderRadius: '2px', margin: '0 auto 20px'
            }} />

            {/* Grid of extra nav items */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px', marginBottom: '16px'
            }}>
              {moreItems.map(item => (
                <div
                  key={item.path}
                  onClick={() => { navigate(item.path); setShowMore(false); }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '6px',
                    padding: '14px 8px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
                    color: location.pathname === item.path
                      ? '#00C9A7' : 'rgba(255,255,255,0.7)',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{item.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* User info + logout */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '600', color: 'white',
                }}>{user?.avatar || 'U'}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'white' }}>{user?.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    {user?.upi_id || 'No UPI ID'}
                  </div>
                </div>
              </div>
              <div
                onClick={() => { onLogout(); setShowMore(false); }}
                style={{ fontSize: '13px', color: '#e53e5a', cursor: 'pointer', fontWeight: '500' }}
              >
                🚪 Logout
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Sidebar;