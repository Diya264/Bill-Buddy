// All data is stored in localStorage

// ─── Bills ───────────────────────────────────────────
export const saveBill = (bill) => {
  const bills = getBills();
  bills.unshift(bill); // newest first
  localStorage.setItem('bills', JSON.stringify(bills));
};

export const getBills = () => {
  return JSON.parse(localStorage.getItem('bills') || '[]');
};

export const updateBill = (id, updatedBill) => {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === id);
  if (index !== -1) bills[index] = updatedBill;
  localStorage.setItem('bills', JSON.stringify(bills));
};

export const deleteBill = (id) => {
  const bills = getBills().filter(b => b.id !== id);
  localStorage.setItem('bills', JSON.stringify(bills));
};

// ─── Groups ──────────────────────────────────────────
export const saveGroup = (group) => {
  const groups = getGroups();
  groups.unshift(group);
  localStorage.setItem('groups', JSON.stringify(groups));
};

export const getGroups = () => {
  return JSON.parse(localStorage.getItem('groups') || '[]');
};

export const updateGroup = (id, updatedGroup) => {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === id);
  if (index !== -1) groups[index] = updatedGroup;
  localStorage.setItem('groups', JSON.stringify(groups));
};

export const deleteGroup = (id) => {
  const groups = getGroups().filter(g => g.id !== id);
  localStorage.setItem('groups', JSON.stringify(groups));
};

// ─── User Profile ─────────────────────────────────────
export const saveProfile = (profile) => {
  localStorage.setItem('profile', JSON.stringify(profile));
};

export const getProfile = () => {
  return JSON.parse(localStorage.getItem('profile') || '{"name":"You","upi":"your@upi"}');
};

// ─── Helpers ──────────────────────────────────────────
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};