const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// ─── Get all notifications for current user ───────────
router.get('/my', auth, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*, u.name as from_name, u.avatar as from_avatar
      FROM notifications n
      JOIN users u ON n.from_user_id = u.id
      WHERE n.to_user_id = ?
      ORDER BY n.created_at DESC
    `).all(req.user.id);

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Mark notification as read ────────────────────────
router.put('/:id/read', auth, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE id = ? AND to_user_id = ?
    `).run(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Mark all notifications as read ──────────────────
router.put('/read/all', auth, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE to_user_id = ?
    `).run(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get unread count ─────────────────────────────────
router.get('/unread/count', auth, (req, res) => {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE to_user_id = ? AND is_read = 0
    `).get(req.user.id);
    res.json({ count: result.count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/remind/:userId', auth, (req, res) => {
  try {
    const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    db.prepare(`
      INSERT INTO notifications (to_user_id, from_user_id, message, type)
      VALUES (?, ?, ?, ?)
    `).run(
      req.params.userId,
      req.user.id,
      `👋 ${fromUser.name} is reminding you to settle up your dues!`,
      'reminder'
    );
    res.json({ message: 'Reminder sent' });
  } catch (err) {
    console.error('Remind error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;