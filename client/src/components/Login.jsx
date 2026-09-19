import React, { useState } from 'react';
import { login, signup } from '../utils/api';

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628',
  outline: 'none', background: '#fff', marginTop: '6px',
  fontFamily: 'Segoe UI, sans-serif',
};

const labelStyle = {
  fontSize: '13px', fontWeight: '500', color: '#555',
};

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', upi_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Basic validation
      if (!form.email || !form.password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }
      if (isSignup && !form.name) {
        setError('Name is required');
        setLoading(false);
        return;
      }

      let res;
      if (isSignup) {
        res = await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          upi_id: form.upi_id,
        });
      } else {
        res = await login({
          email: form.email,
          password: form.password,
        });
      }

      // Save token and user to localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Tell App.jsx that login was successful
      onLogin(res.data.user);

    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f8fc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💸</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0a1628' }}>
            ShareSettle
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            Split smart, pay instant
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '20px', padding: '32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: '#f7f8fc', borderRadius: '10px',
            padding: '4px', marginBottom: '24px',
          }}>
            {['Login', 'Sign Up'].map((tab, i) => (
              <div key={tab} onClick={() => { setIsSignup(i === 1); setError(''); }}
                style={{
                  flex: 1, textAlign: 'center', padding: '10px',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                  fontWeight: '500', transition: 'all 0.2s',
                  background: (i === 0 && !isSignup) || (i === 1 && isSignup) ? '#fff' : 'transparent',
                  color: (i === 0 && !isSignup) || (i === 1 && isSignup) ? '#0a1628' : '#888',
                  boxShadow: (i === 0 && !isSignup) || (i === 1 && isSignup) ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}>
                {tab}
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isSignup && (
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} placeholder="e.g. Rahul Sharma"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} placeholder="e.g. rahul@gmail.com"
                type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div>
              <label style={labelStyle}>Password *</label>
              <input style={inputStyle} placeholder="Enter password"
                type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            {isSignup && (
              <div>
                <label style={labelStyle}>UPI ID (optional)</label>
                <input style={inputStyle} placeholder="e.g. rahul@gpay"
                  value={form.upi_id}
                  onChange={e => setForm({ ...form, upi_id: e.target.value })} />
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                  You can add this later in settings
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                background: '#fdeef1', border: '1px solid #f5c0c8',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: '#e53e5a',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: loading ? '#aaa' : '#00C9A7',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px', transition: 'background 0.2s',
              }}>
              {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Login'}
            </button>
          </div>
        </div>

        {/* Switch mode */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#888' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{ color: '#00C9A7', fontWeight: '600', cursor: 'pointer' }}>
            {isSignup ? 'Login' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;