const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// ─── Create a group ───────────────────────────────────
router.post('/create', auth, (req, res) => {
  try {
    const { name, icon, memberIds } = req.body;

    const result = db.prepare(`
      INSERT INTO groups (name, icon, created_by) VALUES (?, ?, ?)
    `).run(name, icon || '👥', req.user.id);

    const groupId = result.lastInsertRowid;

    // Add creator as member
    db.prepare(`
      INSERT INTO group_members (group_id, user_id) VALUES (?, ?)
    `).run(groupId, req.user.id);

    // Add other members
    if (memberIds && memberIds.length > 0) {
      const insertMember = db.prepare(`
        INSERT INTO group_members (group_id, user_id) VALUES (?, ?)
      `);
      memberIds.forEach(memberId => {
        insertMember.run(groupId, memberId);
      });
    }

    res.status(201).json({ message: 'Group created', groupId });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get all groups for current user ──────────────────
router.get('/my', auth, (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, COUNT(gm2.user_id) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      JOIN group_members gm2 ON g.id = gm2.group_id
      WHERE gm.user_id = ?
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `).all(req.user.id);

    // Get members for each group
    const groupsWithMembers = groups.map(group => {
      const members = db.prepare(`
        SELECT u.id, u.name, u.email, u.upi_id, u.avatar
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ?
      `).all(group.id);
      return { ...group, members };
    });

    res.json({ groups: groupsWithMembers });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get single group ─────────────────────────────────
router.get('/:id', auth, (req, res) => {
  try {
    const group = db.prepare(`
      SELECT * FROM groups WHERE id = ?
    `).get(req.params.id);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.upi_id, u.avatar
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `).all(req.params.id);

    const bills = db.prepare(`
      SELECT * FROM bills WHERE group_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({ group, members, bills });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Add member to group ──────────────────────────────
router.post('/:id/members', auth, (req, res) => {
  try {
    const { userId } = req.body;
    db.prepare(`
      INSERT INTO group_members (group_id, user_id) VALUES (?, ?)
    `).run(req.params.id, userId);
    res.json({ message: 'Member added' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Delete group ─────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.id);
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;