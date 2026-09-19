const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// ── Helper: calculate next due date ──────────────────
function calcNextDue(fromDate, frequency) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'weekly':     d.setDate(d.getDate() + 7);        break;
    case 'monthly':    d.setMonth(d.getMonth() + 1);       break;
    case 'quarterly':  d.setMonth(d.getMonth() + 3);       break;
    case 'yearly':     d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

// ── Add recurring_bills table if not exists ───────────
db.exec(`
  CREATE TABLE IF NOT EXISTS recurring_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT DEFAULT 'Other',
    note TEXT,
    paid_by INTEGER NOT NULL,
    split_type TEXT DEFAULT 'equal',
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_due_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    members TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paid_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS recurring_bill_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurring_id INTEGER NOT NULL,
    bill_id INTEGER NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recurring_id) REFERENCES recurring_bills(id),
    FOREIGN KEY (bill_id) REFERENCES bills(id)
  );
`);

// ── GET all recurring bills for current user ──────────
router.get('/my', auth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, u.name as paid_by_name, u.avatar as paid_by_avatar
      FROM recurring_bills r
      JOIN users u ON r.paid_by = u.id
      WHERE r.members LIKE ?
      ORDER BY r.created_at DESC
    `).all(`%"user_id":${req.user.id}%`);

    const enriched = rows.map(r => {
      const members = JSON.parse(r.members);
      const memberDetails = members.map(m => {
        const u = db.prepare('SELECT id, name, avatar, upi_id FROM users WHERE id = ?').get(m.user_id);
        return { ...m, ...u };
      });
      const historyCount = db.prepare(
        'SELECT COUNT(*) as count FROM recurring_bill_history WHERE recurring_id = ?'
      ).get(r.id);
      return { ...r, members: memberDetails, history_count: historyCount.count };
    });

    res.json({ recurring: enriched });
  } catch (err) {
    console.error('Get recurring error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET history for a specific recurring bill ─────────
router.get('/:id/history', auth, (req, res) => {
  try {
    const history = db.prepare(`
      SELECT rbh.*, b.name, b.amount, b.date, b.status
      FROM recurring_bill_history rbh
      JOIN bills b ON rbh.bill_id = b.id
      WHERE rbh.recurring_id = ?
      ORDER BY rbh.generated_at DESC
    `).all(req.params.id);
    res.json({ history });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST create a new recurring bill ─────────────────
router.post('/create', auth, (req, res) => {
  try {
    const { name, amount, category, note, split_type, frequency, start_date, end_date, members, paid_by } = req.body;

    const result = db.prepare(`
      INSERT INTO recurring_bills
        (name, amount, category, note, paid_by, split_type, frequency, start_date, end_date, next_due_date, members)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, amount, category || 'Other', note || '',
      paid_by || req.user.id, split_type || 'equal',
      frequency, start_date, end_date || null,
      start_date,
      JSON.stringify(members)
    );

    res.status(201).json({ message: 'Recurring bill created', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Create recurring error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST generate a bill NOW from a recurring template ─
router.post('/:id/generate', auth, (req, res) => {
  try {
    const recurring = db.prepare('SELECT * FROM recurring_bills WHERE id = ?').get(req.params.id);
    if (!recurring) return res.status(404).json({ message: 'Not found' });
    if (recurring.status !== 'active') return res.status(400).json({ message: 'Recurring bill is not active' });

    const members = JSON.parse(recurring.members);
    const today = new Date().toISOString().split('T')[0];

    const paidBy = req.body.paid_by ? Number(req.body.paid_by) : Number(recurring.paid_by);
    const generatorId = Number(req.user.id);

    const billResult = db.prepare(`
      INSERT INTO bills (name, amount, category, date, note, paid_by, split_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      recurring.name, recurring.amount, recurring.category,
      today, recurring.note || '', paidBy, recurring.split_type
    );
    const billId = billResult.lastInsertRowid;

    const insertMember = db.prepare(
      'INSERT INTO bill_members (bill_id, user_id, share, is_paid) VALUES (?, ?, ?, ?)'
    );
    members.forEach(m => {
      const isPaid = Number(m.user_id) === paidBy ? 1 : 0;
      insertMember.run(billId, m.user_id, m.share, isPaid);
    });

    const payer = db.prepare('SELECT name FROM users WHERE id = ?').get(paidBy);
    const generator = db.prepare('SELECT name FROM users WHERE id = ?').get(generatorId);
    const insertNotif = db.prepare(
      'INSERT INTO notifications (to_user_id, from_user_id, message, bill_id, type) VALUES (?, ?, ?, ?, ?)'
    );

    members.forEach(m => {
      if (Number(m.user_id) !== paidBy) {
        insertNotif.run(
          m.user_id, generatorId,
          `${generator.name} generated recurring bill "${recurring.name}". ${payer.name} paid — you owe ₹${m.share}`,
          billId, 'new_bill'
        );
      }
    });

    if (generatorId !== paidBy) {
      insertNotif.run(
        paidBy, generatorId,
        `${generator.name} generated the recurring bill "${recurring.name}" and marked you as paid ✅`,
        billId, 'new_bill'
      );
    }

    db.prepare(
      'INSERT INTO recurring_bill_history (recurring_id, bill_id) VALUES (?, ?)'
    ).run(recurring.id, billId);

    const nextDue = calcNextDue(recurring.next_due_date, recurring.frequency);
    let newStatus = 'active';
    if (recurring.end_date && nextDue > recurring.end_date) newStatus = 'ended';

    db.prepare(
      'UPDATE recurring_bills SET next_due_date = ?, status = ? WHERE id = ?'
    ).run(nextDue, newStatus, recurring.id);

    res.json({ message: 'Bill generated successfully', billId });
  } catch (err) {
    console.error('Generate bill error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT pause / resume ────────────────────────────────
router.put('/:id/toggle', auth, (req, res) => {
  try {
    const recurring = db.prepare('SELECT * FROM recurring_bills WHERE id = ?').get(req.params.id);
    if (!recurring) return res.status(404).json({ message: 'Not found' });
    const newStatus = recurring.status === 'active' ? 'paused' : 'active';
    db.prepare('UPDATE recurring_bills SET status = ? WHERE id = ?').run(newStatus, recurring.id);
    res.json({ message: `Recurring bill ${newStatus}`, status: newStatus });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT edit ──────────────────────────────────────────
router.put('/:id', auth, (req, res) => {
  try {
    const { name, amount, category, note, frequency, end_date, members } = req.body;
    db.prepare(`
      UPDATE recurring_bills
      SET name=?, amount=?, category=?, note=?, frequency=?, end_date=?, members=?
      WHERE id=? AND paid_by=?
    `).run(name, amount, category, note || '', frequency, end_date || null, JSON.stringify(members), req.params.id, req.user.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Edit recurring error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE ────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM recurring_bill_history WHERE recurring_id = ?').run(req.params.id);
    db.prepare('DELETE FROM recurring_bills WHERE id = ? AND paid_by = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete recurring error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;