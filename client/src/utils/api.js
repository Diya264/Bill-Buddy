import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ─── Auth ─────────────────────────────────────────────
export const signup = (data) => API.post('/auth/signup', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// ─── Users ────────────────────────────────────────────
export const searchUsers = (query) => API.get(`/users/search?query=${query}`);
export const getAllUsers = () => API.get('/users/all');
export const updateProfile = (data) => API.put('/users/profile', data);

// ─── Bills ────────────────────────────────────────────
export const createBill = (data) => API.post('/bills/create', data);
export const getMyBills = () => API.get('/bills/my');
export const getBill = (id) => API.get(`/bills/${id}`);
export const markAsPaid = (id, note) => API.put(`/bills/${id}/pay`, { note });
export const confirmPayment = (billId, userId) => API.put(`/bills/${billId}/confirm/${userId}`);
export const getDashboardSummary = () => API.get('/bills/summary/dashboard');

// ─── Groups ───────────────────────────────────────────
export const createGroup = (data) => API.post('/groups/create', data);
export const getMyGroups = () => API.get('/groups/my');
export const getGroup = (id) => API.get(`/groups/${id}`);
export const addGroupMember = (groupId, userId) => API.post(`/groups/${groupId}/members`, { userId });
export const deleteGroup = (id) => API.delete(`/groups/${id}`);

// ─── Notifications ────────────────────────────────────
export const getNotifications = () => API.get('/notifications/my');
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put('/notifications/read/all');
export const getUnreadCount = () => API.get('/notifications/unread/count');
export const getSettleData = () => API.get('/bills/settle');
export const sendReminder = (userId) => API.post(`/notifications/remind/${userId}`);