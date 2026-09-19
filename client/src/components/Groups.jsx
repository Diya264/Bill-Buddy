import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyGroups, createGroup, deleteGroup, searchUsers } from '../utils/api';

const groupIcons = ['👥', '🏠', '✈️', '🎉', '🍽️', '💼', '🏋️', '🎮', '🎓', '❤️'];

const statusColor = {
  Settled: { bg: '#e6f9f5', color: '#007a66' },
  Pending: { bg: '#fdeef1', color: '#e53e5a' },
  Partial:  { bg: '#fff4e5', color: '#d97706' },
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e8e8e8', fontSize: '14px', color: '#0a1628',
  outline: 'none', background: '#fff', marginTop: '6px',
  fontFamily: 'Segoe UI, sans-serif',
};

const labelStyle = { fontSize: '13px', fontWeight: '500', color: '#555' };

function Groups({ user }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('👥');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  // Search users as you type
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await searchUsers(searchQuery);
        const filtered = res.data.users.filter(u => !members.find(m => m.id === u.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search error:', err);
      }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, members]);

  const fetchGroups = async () => {
    try {
      const res = await getMyGroups();
      setGroups(res.data.groups || []);
    } catch (err) {
      console.error('Fetch groups error:', err);
    }
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    const e = {};
    if (!groupName.trim()) e.name = 'Group name is required';
    if (members.length === 0) e.members = 'Add at least one member';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      await createGroup({
        name: groupName.trim(),
        icon: groupIcon,
        memberIds: members.map(m => m.id),
      });
      setGroupName('');
      setGroupIcon('👥');
      setMembers([]);
      setSearchQuery('');
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      console.error('Create group error:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (groupId) => {
    try {
      await deleteGroup(groupId);
      setDeleteConfirm(null);
      if (selectedGroup?.id === groupId) setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const addMember = (u) => {
    setMembers([...members, { id: u.id, name: u.name, avatar: u.avatar, upi_id: u.upi_id }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMember = (id) => setMembers(members.filter(m => m.id !== id));

  const resetCreate = () => {
    setShowCreate(false);
    setGroupName('');
    setGroupIcon('👥');
    setMembers([]);
    setSearchQuery('');
    setErrors({});
  };

  if (loading) {
    return <div style={{ padding: '32px', color: '#888', fontSize: '14px' }}>Loading groups...</div>;
  }

  return (
    <div className="page" style={{ maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0a1628' }}>Groups</h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
            Manage your shared expense groups
          </p>
        </div>
        <button
          onClick={() => { resetCreate(); setShowCreate(true); }}
          style={{
            padding: '10px 20px', background: '#00C9A7', color: '#fff',
            border: 'none', borderRadius: '10px', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          + New Group
        </button>
      </div>

      {/* Empty state */}
      {groups.length === 0 && !showCreate && (
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '56px',
          textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1628', marginBottom: '8px' }}>
            No groups yet
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
            Create a group for trips, flatmates, or regular hangouts
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '12px 28px', background: '#00C9A7', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer',
            }}
          >
            + Create your first group
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Groups list */}
        {groups.length > 0 && (
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(selectedGroup?.id === group.id ? null : group)}
                  style={{
                    borderRadius: '14px', padding: '16px 18px',
                    cursor: 'pointer', transition: 'all 0.2s',
                    border: `1.5px solid ${selectedGroup?.id === group.id ? '#00C9A7' : '#eee'}`,
                    background: selectedGroup?.id === group.id ? '#f0faf8' : '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Icon */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: '#f0faf8', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                    }}>
                      {group.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1628' }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Member avatars */}
                    <div style={{ display: 'flex', marginRight: '8px' }}>
                      {group.members.slice(0, 3).map((m, i) => (
                        <div key={m.id} style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: '700', color: '#fff',
                          marginLeft: i === 0 ? 0 : '-8px',
                          border: '2px solid #fff', zIndex: 3 - i,
                          position: 'relative',
                        }}>
                          {m.avatar}
                        </div>
                      ))}
                      {group.members.length > 3 && (
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: '#e8e8e8', color: '#888',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: '600',
                          marginLeft: '-8px', border: '2px solid #fff',
                          position: 'relative', zIndex: 0,
                        }}>
                          +{group.members.length - 3}
                        </div>
                      )}
                    </div>

                    <div style={{
                      fontSize: '12px', color: '#ccc',
                      transform: selectedGroup?.id === group.id ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }}>▼</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group detail panel */}
        {selectedGroup && !showCreate && (
          <div style={{ flex: 2, minWidth: '300px' }}>
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
            }}>
              {/* Group header */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: '#f0faf8', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '26px',
                  }}>
                    {selectedGroup.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1628' }}>
                      {selectedGroup.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#aaa' }}>
                      {selectedGroup.member_count} members
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => navigate('/new-split', {
                      state: {
                        groupId: selectedGroup.id,
                        groupName: selectedGroup.name,
                        groupMembers: selectedGroup.members.map(m => ({
                          id: m.id,
                          name: m.name,
                          upi: m.upi_id || '',
                          avatar: m.avatar,
                          isYou: m.id === user.id,
                        }))
                      }
                    })}
                    style={{
                      padding: '8px 14px', background: '#00C9A7', color: '#fff',
                      border: 'none', borderRadius: '8px', fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    + Add Bill
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(selectedGroup.id)}
                    style={{
                      padding: '8px 14px', background: '#fdeef1', color: '#e53e5a',
                      border: '1px solid #f5c0c8', borderRadius: '8px', fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Members */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: '600', color: '#888',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px',
                }}>
                  Members
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedGroup.members.map(member => (
                    <div key={member.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', background: '#f8f9fc',
                      borderRadius: '10px', border: '1px solid #f0f0f0',
                    }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00C9A7, #C4748A)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0,
                      }}>
                        {member.avatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
                          {member.name}
                          {member.id === user.id && (
                            <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '6px' }}>(you)</span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>
                          {member.upi_id || 'No UPI ID'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bills in this group */}
              {selectedGroup.bills && selectedGroup.bills.length > 0 ? (
                <div>
                  <div style={{
                    fontSize: '12px', fontWeight: '600', color: '#888',
                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px',
                  }}>
                    Bills
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedGroup.bills.map(bill => (
                      <div key={bill.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', background: '#f8f9fc',
                        borderRadius: '10px', border: '1px solid #f0f0f0',
                      }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
                            {bill.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                            {bill.date}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1628' }}>
                            ₹{Number(bill.amount).toLocaleString()}
                          </div>
                          <span style={{
                            fontSize: '11px', fontWeight: '500', padding: '2px 8px',
                            borderRadius: '20px', display: 'inline-block', marginTop: '2px',
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
              ) : (
                <div style={{
                  background: '#f8f9fc', borderRadius: '12px', padding: '24px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628', marginBottom: '4px' }}>
                    No bills yet
                  </div>
                  <div style={{ fontSize: '13px', color: '#aaa' }}>
                    Add a bill to track expenses for this group
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create group panel */}
        {showCreate && (
          <div style={{ flex: 2, minWidth: '300px' }}>
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
            }}>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#0a1628', marginBottom: '20px' }}>
                Create New Group
              </div>

              {/* Group name */}
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Group Name *</label>
                <input
                  style={{ ...inputStyle, borderColor: errors.name ? '#e53e5a' : '#e8e8e8' }}
                  placeholder="e.g. Goa Trip, Flat 4B, Office Lunch"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
                {errors.name && (
                  <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>
                )}
              </div>

              {/* Icon picker */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Icon</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {groupIcons.map(icon => (
                    <div
                      key={icon}
                      onClick={() => setGroupIcon(icon)}
                      style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', cursor: 'pointer',
                        border: `2px solid ${groupIcon === icon ? '#00C9A7' : '#eee'}`,
                        background: groupIcon === icon ? '#e6faf6' : '#f8f9fc',
                        transition: 'all 0.15s',
                      }}
                    >
                      {icon}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add members */}
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Add Members *</label>
                <input
                  style={{ ...inputStyle, borderColor: errors.members ? '#e53e5a' : '#e8e8e8' }}
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {errors.members && (
                  <div style={{ color: '#e53e5a', fontSize: '12px', marginTop: '4px' }}>{errors.members}</div>
                )}

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div style={{
                    border: '1.5px solid #eee', borderRadius: '10px',
                    marginTop: '8px', overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}>
                    {searchResults.map(u => (
                      <div
                        key={u.id}
                        onClick={() => addMember(u)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          borderBottom: '1px solid #f5f5f5', background: '#fff',
                        }}
                      >
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: '600', fontSize: '13px', flexShrink: 0,
                        }}>{u.avatar}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>{u.name}</div>
                          <div style={{ fontSize: '12px', color: '#aaa' }}>{u.email}</div>
                        </div>
                        <div style={{ color: '#00C9A7', fontSize: '13px', fontWeight: '600' }}>+ Add</div>
                      </div>
                    ))}
                  </div>
                )}

                {searchLoading && (
                  <div style={{ fontSize: '13px', color: '#aaa', marginTop: '8px' }}>Searching...</div>
                )}
              </div>

              {/* Added members */}
              {members.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '8px' }}>
                    Added ({members.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {members.map(m => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: '#f8f9fc', borderRadius: '10px', padding: '10px 14px',
                        border: '1px solid #eee',
                      }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00C9A7, #0a1628)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: '600', fontSize: '12px', flexShrink: 0,
                        }}>{m.avatar}</div>
                        <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#0a1628' }}>
                          {m.name}
                        </div>
                        <div
                          onClick={() => removeMember(m.id)}
                          style={{ color: '#e53e5a', cursor: 'pointer', fontSize: '13px', padding: '2px 6px' }}
                        >
                          ✕
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note: you are auto-added */}
              <div style={{
                background: '#f0faf8', borderRadius: '8px', padding: '10px 14px',
                fontSize: '12px', color: '#007a66', marginBottom: '20px',
              }}>
                💡 You are automatically added as a member
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={resetCreate}
                  style={{
                    flex: 1, padding: '12px', border: '1.5px solid #eee',
                    borderRadius: '10px', background: '#fff', color: '#555',
                    fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={saving}
                  style={{
                    flex: 2, padding: '12px',
                    background: saving ? '#aaa' : '#00C9A7',
                    color: '#fff', border: 'none', borderRadius: '10px',
                    fontSize: '14px', fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Creating...' : '✅ Create Group'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <>
          <div
            onClick={() => setDeleteConfirm(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: '16px', padding: '28px',
            width: '100%', maxWidth: '360px', margin: '0 20px',
            zIndex: 1001, boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1628', textAlign: 'center', marginBottom: '8px' }}>
              Delete Group?
            </div>
            <div style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '24px' }}>
              This will delete the group but not the bills inside it.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '12px', border: '1.5px solid #eee',
                  borderRadius: '10px', background: '#fff', color: '#555',
                  fontSize: '14px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: 1, padding: '12px', background: '#e53e5a',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Groups;