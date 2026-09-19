const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// ─── Get all users (for searching friends) ────────────
router.get('/search', auth, (req, res) => {
  try {
    const { query } = req.query;
    
    const users = db.prepare(`
      SELECT id, name, email, upi_id, avatar 
      FROM users 
      WHERE (name LIKE ? OR email LIKE ?)
      AND id != ?
    `).all(`%${query}%`, `%${query}%`, req.user.id);

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get all users except current user ────────────────
router.get('/all', auth, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, upi_id, avatar 
      FROM users 
      WHERE id != ?
    `).all(req.user.id);

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Update profile ───────────────────────────────────
router.put('/profile', auth, (req, res) => {
  try {
    const { name, upi_id } = req.body;

    db.prepare(`
      UPDATE users SET name = ?, upi_id = ? WHERE id = ?
    `).run(name, upi_id, req.user.id);

    const updatedUser = db.prepare(`
      SELECT id, name, email, upi_id, avatar FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;