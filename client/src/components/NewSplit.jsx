import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBill, searchUsers } from '../utils/api';
import { equalSplit, itemSplit, generateUPILink } from '../utils/splitCalculator';

const categories = ['Food', 'Travel', 'Groceries', 'Entertainment', 'Utilities', 'Other'];
const categoryIcon = { Food: '🍽️', Travel: '✈️', Groceries: '🛒', Entertainment: '🎬', Utilities: '💡', Other: '📋' };
const steps = ['Bill Details', 'Add People', 'Split', 'UPI Links'];

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628',
  outline: 'none', background: '#fff', marginTop: '6px',
  fontFamily: 'Segoe UI, sans-serif',
};

const labelStyle = { fontSize: '13px', fontWeight: '500', color: '#555' };

function NewSplit({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const groupData = location.state || null;

  const [step, setStep] = useState(0);
  const [bill, setBill] = useState({
    name: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0], note: ''
  });
  const [people, setPeople] = useState([]);
  const [paidBy, setPaidBy] = useState(user.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [splitType, setSplitType] = useState('equal');
  const [items, setItems] = useState([{ id: Date.now(), name: '', price: '', assignedTo: [] }]);
  const [result, setResult] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remainderPeople, setRemainderPeople] = useState([]); // who splits the remainder
  const [showRemainderSection, setShowRemainderSection] = useState(false); // view toggle

  // Pre-fill members from group if coming from Groups page, else just add self
  useEffect(() => {
    if (groupData?.groupMembers) {
      setPeople(groupData.groupMembers);
    } else {
      setPeople([{
        id: user.id,
        name: user.name,
        upi: user.upi_id || '',
        avatar: user.avatar,
        isYou: true,
      }]);
    }
  }, [user]);

  // Search users as you type
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchUsers(searchQuery);
        const filtered = res.data.users.filter(u => !people.find(p => p.id === u.id));
        setSearchResults(filtered);
      } catch (err) { console.error('Search error:', err); }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, people]);

  // ─── Validation ──────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!bill.name.trim()) e.name = 'Bill name is required';
    if (!bill.amount || isNaN(bill.amount) || Number(bill.amount) <= 0)
      e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    if (people.length < 2) {
      setErrors({ people: 'Add at least one more person' });
      return false;
    }
    setErrors({});
    return true;
  };

  // ─── Add / Remove person ─────────────────────────────
  const addPerson = (u) => {
    setPeople([...people, { id: u.id, name: u.name, upi: u.upi_id || '', avatar: u.avatar, isYou: false }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePerson = (id) => {
    if (id === user.id) return;
    setPeople(people.filter(p => p.id !== id));
  };

  // ─── Calculate split ─────────────────────────────────
  const calculateSplit = () => {
    const amount = parseFloat(bill.amount);
    let splitResult = [];

    if (splitType === 'equal') {
      splitResult = equalSplit(amount, people);
    } else {
      // Item split with remainder
      splitResult = itemSplit(items, people);

      // Add remainder share on top of item shares
      if (remainderAmount > 0 && remainderPeople.length > 0) {
        const remainderShare = parseFloat((remainderAmount / remainderPeople.length).toFixed(2));
        splitResult = splitResult.map(p => {
          if (remainderPeople.includes(p.id)) {
            return { ...p, share: parseFloat((p.share + remainderShare).toFixed(2)) };
          }
          return p;
        });
      }
    }

    const payer = people.find(p => p.id === paidBy);
    const withLinks = splitResult.map(p => {
      if (p.id === paidBy) return { ...p, upiLink: null, isPayer: true };
      return {
        ...p,
        upiLink: generateUPILink(payer?.upi || '', payer?.name || '', p.share, bill.name),
        isPayer: false,
      };
    });
    setResult(withLinks);
    setStep(3);
  };

  // ─── Save bill ───────────────────────────────────────
  const handleFinish = async () => {
    setSaving(true);
    try {
      await createBill({
        name: bill.name,
        amount: parseFloat(bill.amount),
        category: bill.category,
        date: bill.date,
        note: bill.note,
        paid_by: paidBy,
        group_id: groupData?.groupId || null,
        split_type: splitType,
        members: result.map(p => ({ user_id: p.id, share: p.share })),
      });
      navigate(groupData?.groupId ? '/groups' : '/');
    } catch (err) {
      console.error('Save bill error:', err);
      alert('Something went wrong saving the bill. Please try again.');
    }
    setSaving(false);
  };

  // ─── Remainder calculation ───────────────────────────
  const totalBillAmount = parseFloat(bill.amount) || 0;
  const assignedAmount = Math.round(items.reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0);
  }, 0) * 100) / 100;
  const remainderAmount = Math.round((totalBillAmount - assignedAmount) * 100) / 100;

  // Clear remainder error whenever items change
  useEffect(() => {
    if (errors.remainder) setErrors({});
  }, [items]);

  // ─── Item handlers ───────────────────────────────────
  const addItem = () => setItems([...items, { id: Date.now(), name: '', price: '', assignedTo: [] }]);
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const toggleItemPerson = (itemId, personId) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const already = item.assignedTo.includes(personId);
      return { ...item, assignedTo: already ? item.assignedTo.filter(id => id !== personId) : [...item.assignedTo, personId] };
    }));
  };

  return (
    <div style={{ padding: '32px', maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>
          {groupData?.groupName ? `New Bill — ${groupData.groupName}` : 'New Split'}
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
          Fill in the details to split a bill
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: i <= step ? '#00C9A7' : '#e8e8e8',
                color: i <= step ? '#fff' : '#aaa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '600', transition: 'all 0.3s',
              }}>{i < step ? '✓' : i + 1}</div>
              <div style={{
                fontSize: '11px', whiteSpace: 'nowrap',
                color: i === step ? '#00C9A7' : '#aaa',
                fontWeight: i === step ? '600' : '400',
              }}>{s}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 6px', marginBottom: '18px',
                background: i < step ? '#00C9A7' : '#e8e8e8', transition: 'all 0.3s',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

        {/* ── Step 0: Bill Details ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={labelStyle}>Bill Name *</label>
              <input style={{ ...inputStyle, borderColor: errors.name ? '#e53e5a' : '#e8e8e8' }}
                placeholder="e.g. Goa Trip Hotel" value={bill.name}
                onChange={e => setBill({ ...bill, name: e.target.value })} />
              {errors.name && <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
            </div>

            <div>
              <label style={labelStyle}>Total Amount (₹) *</label>
              <input style={{ ...inputStyle, borderColor: errors.amount ? '#e53e5a' : '#e8e8e8' }}
                placeholder="e.g. 4800" type="number" value={bill.amount}
                onChange={e => setBill({ ...bill, amount: e.target.value })} />
              {errors.amount && <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.amount}</div>}
            </div>

            <div>
              <label style={labelStyle}>Category</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {categories.map(cat => (
                  <div key={cat} onClick={() => setBill({ ...bill, category: cat })} style={{
                    padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                    border: `1.5px solid ${bill.category === cat ? '#00C9A7' : '#e8e8e8'}`,
                    background: bill.category === cat ? '#e6faf6' : '#fff',
                    color: bill.category === cat ? '#007a66' : '#555',
                    fontWeight: bill.category === cat ? '600' : '400',
                  }}>
                    {categoryIcon[cat]} {cat}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Date</label>
              <input style={inputStyle} type="date" value={bill.date}
                onChange={e => setBill({ ...bill, date: e.target.value })} />
            </div>

            <div>
              <label style={labelStyle}>Note (optional)</label>
              <input style={inputStyle} placeholder="e.g. Includes breakfast"
                value={bill.note} onChange={e => setBill({ ...bill, note: e.target.value })} />
            </div>

          </div>
        )}

        {/* ── Step 1: Add People ── */}
        {step === 1 && (
          <div>
            {groupData?.groupMembers ? (
              /* Locked group members */
              <div>
                <div style={{
                  background: '#f0faf8', borderRadius: '10px', padding: '12px 14px',
                  border: '1px solid #c8f0e8', marginBottom: '16px',
                  fontSize: '13px', color: '#007a66',
                }}>
                  👥 Members pre-filled from <strong>{groupData.groupName}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {people.map(person => (
                    <div key={person.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: '#f8f9fc', borderRadius: '10px', padding: '12px 16px',
                      border: '1.5px solid #eee',
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: '600', fontSize: '13px', flexShrink: 0,
                      }}>{person.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
                          {person.name} {person.isYou ? '(You)' : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>{person.upi || 'No UPI ID'}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#aaa' }}>🔒</div>
                    </div>
                  ))}
                </div>

                {/* Who Paid — group view */}
                <div style={{ marginTop: '20px' }}>
                  <label style={labelStyle}>Who paid? *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {people.map(p => (
                      <div key={p.id} onClick={() => setPaidBy(p.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                        border: `1.5px solid ${paidBy === p.id ? '#00C9A7' : '#eee'}`,
                        background: paidBy === p.id ? '#e6faf6' : '#f8f9fc',
                      }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
                        }}>{p.avatar}</div>
                        <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                          {p.name}
                          {p.isYou && <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '4px' }}>(you)</span>}
                          {paidBy === p.id && <span style={{ fontSize: '11px', color: '#007a66', marginLeft: '6px', fontWeight: '600' }}>✓ paid</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
                    💡 Tap to select who paid for this bill
                  </div>
                </div>
              </div>
            ) : (
              /* Normal flow — search and add */
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Search and add people</label>
                  <input style={inputStyle} placeholder="Type a name or email..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

                  {searchResults.length > 0 && (
                    <div style={{ border: '1.5px solid #eee', borderRadius: '10px', marginTop: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {searchResults.map(u => (
                        <div key={u.id} onClick={() => addPerson(u)} style={{
                          padding: '12px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          borderBottom: '1px solid #f5f5f5', background: '#fff',
                        }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '600', fontSize: '13px',
                          }}>{u.avatar}</div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>{u.name}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{u.email}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', color: '#00C9A7', fontSize: '13px' }}>+ Add</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {loading && <div style={{ fontSize: '13px', color: '#aaa', marginTop: '8px' }}>Searching...</div>}
                  {searchQuery.length >= 2 && !loading && searchResults.length === 0 && (
                    <div style={{ fontSize: '13px', color: '#aaa', marginTop: '8px' }}>No users found. Make sure they have an account.</div>
                  )}
                </div>

                <div style={{ fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '10px' }}>
                  People in this split ({people.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {people.map(person => (
                    <div key={person.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: '#f8f9fc', borderRadius: '10px', padding: '12px 16px',
                      border: '1.5px solid #eee',
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: '600', fontSize: '13px', flexShrink: 0,
                      }}>{person.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
                          {person.name} {person.isYou ? '(You)' : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>{person.upi || 'No UPI ID'}</div>
                      </div>
                      {!person.isYou && (
                        <div onClick={() => removePerson(person.id)} style={{ color: '#e53e5a', cursor: 'pointer', fontSize: '13px' }}>✕</div>
                      )}
                    </div>
                  ))}
                </div>

                {errors.people && (
                  <div style={{ color: '#e53e5a', fontSize: '13px', marginTop: '10px' }}>⚠️ {errors.people}</div>
                )}

                {/* Who Paid — normal flow */}
                <div style={{ marginTop: '20px' }}>
                  <label style={labelStyle}>Who paid? *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {people.map(p => (
                      <div key={p.id} onClick={() => setPaidBy(p.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                        border: `1.5px solid ${paidBy === p.id ? '#00C9A7' : '#eee'}`,
                        background: paidBy === p.id ? '#e6faf6' : '#f8f9fc',
                      }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
                        }}>{p.avatar}</div>
                        <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                          {p.name}
                          {p.isYou && <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '4px' }}>(you)</span>}
                          {paidBy === p.id && <span style={{ fontSize: '11px', color: '#007a66', marginLeft: '6px', fontWeight: '600' }}>✓ paid</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
                    💡 Tap to select who paid for this bill
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Split Type ── */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {['equal', 'items'].map(type => (
                <div key={type} onClick={() => setSplitType(type)} style={{
                  flex: 1, padding: '14px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${splitType === type ? '#00C9A7' : '#e8e8e8'}`,
                  background: splitType === type ? '#e6faf6' : '#fff',
                }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{type === 'equal' ? '⚖️' : '🧾'}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: splitType === type ? '#007a66' : '#0a1628' }}>
                    {type === 'equal' ? 'Equal Split' : 'By Items'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    {type === 'equal' ? 'Divide equally among all' : 'Assign items per person'}
                  </div>
                </div>
              ))}
            </div>

            {splitType === 'equal' && (
              <div style={{ background: '#f8f9fc', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px', fontWeight: '500' }}>Each person pays:</div>
                {people.map(person => (
                  <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: '14px', color: '#0a1628' }}>
                      {person.avatar} {person.name} {person.isYou ? '(You)' : ''}
                      {person.id === paidBy ? ' 👑 paid' : ''}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#00C9A7' }}>
                      ₹{(parseFloat(bill.amount) / people.length).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitType === 'items' && (
              <div>

                {/* ── View 1: Items list (shown when showRemainderSection is false) ── */}
                {!showRemainderSection && (
                  <div>
                    {items.map((item, index) => (
                      <div key={item.id} style={{ background: '#f8f9fc', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1.5px solid #eee' }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <input style={{ ...inputStyle, marginTop: 0 }}
                            placeholder={`Item ${index + 1} name`} value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)} />
                          <input style={{ ...inputStyle, marginTop: 0, maxWidth: '100px' }}
                            placeholder="₹ Price" type="number" value={item.price}
                            onChange={e => updateItem(item.id, 'price', e.target.value)} />
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Assign to:</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {people.map(person => (
                            <div key={person.id} onClick={() => toggleItemPerson(item.id, person.id)} style={{
                              padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                              border: `1.5px solid ${item.assignedTo.includes(person.id) ? '#00C9A7' : '#ddd'}`,
                              background: item.assignedTo.includes(person.id) ? '#e6faf6' : '#fff',
                              color: item.assignedTo.includes(person.id) ? '#007a66' : '#555',
                            }}>{person.name}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={addItem} style={{ width: '100%', padding: '10px', border: '1.5px dashed #00C9A7', borderRadius: '10px', background: 'transparent', color: '#00C9A7', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>+ Add Item</button>

                    {/* Live counter */}
                    <div style={{ background: '#f8f9fc', borderRadius: '12px', padding: '14px 16px', border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#555' }}>Assigned so far</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#007a66' }}>₹{assignedAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: '#555' }}>Remaining</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: remainderAmount > 0 ? '#e53e5a' : '#007a66' }}>
                          ₹{remainderAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Exceeds total bill error */}
                    {remainderAmount < 0 && (
                      <div style={{
                        background: '#fdeef1', border: '1px solid #f5c0c8',
                        borderRadius: '10px', padding: '12px 14px', marginTop: '12px',
                        fontSize: '13px', color: '#e53e5a', fontWeight: '500',
                      }}>
                        😵 Math isn't mathing! You've assigned ₹{assignedAmount.toFixed(2)} but the bill is only ₹{totalBillAmount.toFixed(2)}. Go back and fix those numbers!
                      </div>
                    )}

                    {/* Remainder button — only shown if remainder > 0 */}
                    {remainderAmount > 0 && (
                      <button
                        onClick={() => { setShowRemainderSection(true); setErrors({}); }}
                        style={{
                          width: '100%', marginTop: '12px', padding: '12px',
                          background: '#0a1628', color: '#fff', border: 'none',
                          borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Split remaining ₹{remainderAmount.toFixed(2)} →
                      </button>
                    )}
                  </div>
                )}

                {/* ── View 2: Remainder section ── */}
                {showRemainderSection && (
                  <div>

                    {/* Back button */}
                    <button
                      onClick={() => { setShowRemainderSection(false); setRemainderPeople([]); setErrors({}); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'none', border: 'none', color: '#00C9A7',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        padding: '0', marginBottom: '16px',
                      }}
                    >
                      ← Edit items
                    </button>

                    {/* Remainder info */}
                    <div style={{ background: '#fdeef1', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid #f5c0c8' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#e53e5a' }}>₹{remainderAmount.toFixed(2)} remaining</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Who splits this amount?</div>
                    </div>

                    {/* Quick select buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button
                        onClick={() => setRemainderPeople(people.map(p => p.id))}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid #00C9A7',
                          background: '#e6faf6', color: '#007a66', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Everyone
                      </button>
                      <button
                        onClick={() => {
                          // Unassigned = people with 0 item share
                          const assignedPeopleIds = new Set(items.flatMap(item => item.assignedTo));
                          const unassigned = people.filter(p => !assignedPeopleIds.has(p.id)).map(p => p.id);
                          setRemainderPeople(unassigned.length > 0 ? unassigned : people.map(p => p.id));
                        }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid #0a1628',
                          background: '#f8f9fc', color: '#0a1628', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Unassigned only
                      </button>
                    </div>

                    {/* People checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {people.map(p => {
                        const isChecked = remainderPeople.includes(p.id);
                        const itemShare = items.reduce((sum, item) => {
                          if (item.assignedTo.includes(p.id)) {
                            return sum + (parseFloat(item.price) || 0) / item.assignedTo.length;
                          }
                          return sum;
                        }, 0);
                        const remainderShare = remainderPeople.length > 0 && isChecked
                          ? remainderAmount / remainderPeople.length : 0;
                        const totalShare = parseFloat((itemShare + remainderShare).toFixed(2));

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setRemainderPeople(prev =>
                                prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                              );
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                              border: `1.5px solid ${isChecked ? '#00C9A7' : '#eee'}`,
                              background: isChecked ? '#e6faf6' : '#f8f9fc',
                            }}
                          >
                            {/* Checkbox */}
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                              border: `2px solid ${isChecked ? '#00C9A7' : '#ccc'}`,
                              background: isChecked ? '#00C9A7' : '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', color: '#fff',
                            }}>
                              {isChecked ? '✓' : ''}
                            </div>

                            {/* Avatar */}
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
                            }}>{p.avatar}</div>

                            {/* Name */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a1628' }}>
                                {p.name} {p.isYou ? '(you)' : ''}
                              </div>
                              <div style={{ fontSize: '11px', color: '#aaa' }}>
                                Items: ₹{itemShare.toFixed(2)}
                                {isChecked ? ` + ₹${remainderShare.toFixed(2)} remainder` : ''}
                              </div>
                            </div>

                            {/* Final total */}
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a1628' }}>
                              ₹{totalShare.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Error */}
                    {errors.remainder && (
                      <div style={{
                        background: '#fdeef1', border: '1px solid #f5c0c8',
                        borderRadius: '10px', padding: '12px 14px',
                        fontSize: '13px', color: '#e53e5a', marginBottom: '12px',
                      }}>
                        {errors.remainder}
                      </div>
                    )}

                    {/* Summary */}
                    {remainderPeople.length > 0 && (
                      <div style={{ background: '#f0faf8', borderRadius: '10px', padding: '12px 14px', border: '1px solid #c8f0e8' }}>
                        <div style={{ fontSize: '12px', color: '#007a66' }}>
                          ₹{remainderAmount.toFixed(2)} ÷ {remainderPeople.length} people = <strong>₹{(remainderAmount / remainderPeople.length).toFixed(2)} each</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error shown when trying to proceed with unassigned remainder */}
                {!showRemainderSection && errors.remainder && (
                  <div style={{
                    background: '#fdeef1', border: '1px solid #f5c0c8',
                    borderRadius: '10px', padding: '12px 14px',
                    fontSize: '13px', color: '#e53e5a', marginTop: '12px',
                  }}>
                    {errors.remainder}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: UPI Links ── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>
              Share these links with each person so they can pay you back instantly.
            </div>
            {result.map((person, i) => (
              <div key={i} style={{ background: '#f8f9fc', borderRadius: '14px', padding: '18px', marginBottom: '14px', border: '1.5px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: '600', fontSize: '14px',
                    }}>{person.avatar}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1628' }}>
                        {person.name}
                        {person.id === paidBy ? ' (Paid ✓)' : ''}
                        {person.isYou && person.id !== paidBy ? ' (You)' : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{person.upi || 'No UPI ID'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#00C9A7' }}>₹{person.share}</div>
                </div>

                {person.id !== paidBy && person.upiLink && (
                  <a href={person.upiLink} style={{
                    display: 'block', width: '100%', padding: '11px',
                    background: '#0a1628', color: '#fff', borderRadius: '10px',
                    textAlign: 'center', fontSize: '13px', fontWeight: '600',
                    textDecoration: 'none', boxSizing: 'border-box',
                  }}>📲 Open in UPI App</a>
                )}

                {person.id !== paidBy && !person.upiLink && (
                  <div style={{ padding: '10px', background: '#fff4e5', borderRadius: '8px', fontSize: '12px', color: '#d97706' }}>
                    ⚠️ {people.find(p => p.id === paidBy)?.name} hasn't set their UPI ID. Payment link unavailable.
                  </div>
                )}
              </div>
            ))}

            <button onClick={handleFinish} disabled={saving} style={{
              width: '100%', padding: '14px',
              background: saving ? '#aaa' : '#00C9A7',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer', marginTop: '8px',
            }}>
              {saving ? 'Saving...' : '✅ Save & Go to Dashboard'}
            </button>
          </div>
        )}

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', gap: '12px' }}>
          {step > 0 && step < 3 && (
            <button onClick={() => setStep(step - 1)} style={{
              padding: '12px 24px', borderRadius: '10px',
              border: '1.5px solid #e8e8e8', background: '#fff',
              color: '#555', fontSize: '14px', cursor: 'pointer', fontWeight: '500',
            }}>← Back</button>
          )}
          {step === 0 && (
            <button onClick={() => { if (validateStep1()) setStep(1); }} style={{
              marginLeft: 'auto', padding: '12px 28px', borderRadius: '10px',
              background: '#00C9A7', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}>Next →</button>
          )}
          {step === 1 && (
            <button onClick={() => { if (validateStep2()) setStep(2); }} style={{
              marginLeft: 'auto', padding: '12px 28px', borderRadius: '10px',
              background: '#00C9A7', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}>Next →</button>
          )}
          {step === 2 && (
            <button onClick={() => {
              if (splitType === 'items' && remainderAmount < 0) {
                setErrors({ remainder: `😵 Math isn't mathing! You've assigned ₹${assignedAmount.toFixed(2)} but the bill is only ₹${totalBillAmount.toFixed(2)}. Go back and fix those numbers!` });
                return;
              }
              if (splitType === 'items' && remainderAmount > 0 && remainderPeople.length === 0) {
                setErrors({ remainder: `👀 Psst... ₹${remainderAmount} still needs to be split! Pick who pays it.` });
                return;
              }
              setErrors({});
              calculateSplit();
            }} style={{
              marginLeft: 'auto', padding: '12px 28px', borderRadius: '10px',
              background: '#00C9A7', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}>Generate UPI Links →</button>
          )}
              
        </div>
      </div>
    </div>
  );
}

export default NewSplit;