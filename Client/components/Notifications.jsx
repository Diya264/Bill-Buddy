import React, { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../utils/api';

const typeIcon = {
  new_bill: '🧾',
  payment_done: '💰',
  payment_confirmed: '✅',
  reminder: '🔔',
};

const typeColor = {
  new_bill: { bg: '#fff4e5', color: '#d97706' },
  payment_done: { bg: '#e6f9f5', color: '#007a66' },
  payment_confirmed: { bg: '#e6f9f5', color: '#007a66' },
  reminder: { bg: '#fdeef1', color: '#e53e5a' },
};

function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
    setLoading(false);
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: 1 } : n
      ));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>
        Loading notifications...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '10px', fontSize: '14px', fontWeight: '600',
                background: '#e53e5a', color: '#fff',
                padding: '2px 10px', borderRadius: '20px',
              }}>{unreadCount}</span>
            )}
          </h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
            Stay updated on your bills and payments
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={{
            padding: '10px 18px', borderRadius: '10px',
            border: '1.5px solid #e8e8e8', background: '#fff',
            color: '#555', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer',
          }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '48px',
          textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
            No notifications yet
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            You'll see updates here when someone adds you to a bill or pays you back
          </div>
        </div>
      )}

      {/* Notifications list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.map(n => (
          <div key={n.id} onClick={() => !n.is_read && handleMarkRead(n.id)} style={{
            background: n.is_read ? '#fff' : '#f0faf8',
            borderRadius: '14px', padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: `1.5px solid ${n.is_read ? '#eee' : '#00C9A7'}`,
            cursor: n.is_read ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>

              {/* Icon */}
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                background: typeColor[n.type]?.bg || '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>
                {typeIcon[n.type] || '🔔'}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: '600', fontSize: '11px', flexShrink: 0
                  }}>{n.from_avatar}</div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a1628' }}>
                    {n.from_name}
                  </span>
                  {!n.is_read && (
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#00C9A7', display: 'inline-block', marginLeft: 'auto'
                    }} />
                  )}
                </div>
                <div style={{ fontSize: '14px', color: '#444', lineHeight: '1.5' }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
                  {new Date(n.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Notifications;