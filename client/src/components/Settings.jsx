import React, { useState } from 'react';
import { updateProfile } from '../utils/api';

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628',
  outline: 'none', background: '#fff', marginTop: '6px',
  fontFamily: 'Segoe UI, sans-serif',
};

const labelStyle = { fontSize: '13px', fontWeight: '500', color: '#555' };

function Settings({ user, onUpdateUser }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    upi_id: user?.upi_id || '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      if (!form.name.trim()) {
        setError('Name cannot be empty');
        setLoading(false);
        return;
      }

      const res = await updateProfile({ name: form.name, upi_id: form.upi_id });

      // Update localStorage with new user data
      const updatedUser = res.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdateUser(updatedUser);
      setSuccess('Profile updated successfully!');

    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '32px', maxWidth: '560px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>Settings</h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
          Update your profile and UPI ID
        </p>
      </div>

      {/* Profile card */}
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '28px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)', marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: '700', color: '#fff',
          }}>{user?.avatar || 'U'}</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#0a1628' }}>{user?.name}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input style={inputStyle} placeholder="Your name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label style={labelStyle}>UPI ID</label>
            <input style={inputStyle} placeholder="e.g. yourname@gpay"
              value={form.upi_id}
              onChange={e => setForm({ ...form, upi_id: e.target.value })} />
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
              This is used to generate payment links for your friends to pay you back
            </div>
          </div>

          {/* UPI format hint */}
          <div style={{
            background: '#f0faf8', borderRadius: '10px', padding: '14px',
            border: '1px solid #c8f0e8'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#007a66', marginBottom: '6px' }}>
              💡 Valid UPI ID formats
            </div>
            <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.8' }}>
              yourname@gpay — Google Pay<br />
              yourname@paytm — Paytm<br />
              yourname@ybl — PhonePe<br />
              9876543210@upi — Phone number based<br />
              <span style={{ color: '#aaa' }}>Leave blank if you don't want to receive UPI payments</span>
            </div>
          </div>

          {success && (
            <div style={{
              background: '#e6f9f5', border: '1px solid #c8f0e8',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#007a66',
            }}>
              ✅ {success}
            </div>
          )}

          {error && (
            <div style={{
              background: '#fdeef1', border: '1px solid #f5c0c8',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#e53e5a',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSave} disabled={loading} style={{
            width: '100%', padding: '14px',
            background: loading ? '#aaa' : '#00C9A7',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '15px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Account info card */}
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '24px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628', marginBottom: '16px' }}>
          Account Info
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Email', value: user?.email },
            { label: 'Account ID', value: `#${user?.id}` },
            { label: 'UPI ID', value: user?.upi_id || 'Not set' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid #f5f5f5'
            }}>
              <span style={{ fontSize: '13px', color: '#888' }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;