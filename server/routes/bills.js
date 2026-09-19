const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// ─── Create a new bill ────────────────────────────────
router.post('/create', auth, (req, res) => {
  try {
    const { name, amount, category, date, note, paid_by, group_id, split_type, members } = req.body;

    // Insert bill
    const billResult = db.prepare(`
      INSERT INTO bills (name, amount, category, date, note, paid_by, group_id, split_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, amount, category, date, note || '', paid_by, group_id || null, split_type || 'equal');

    const billId = billResult.lastInsertRowid;

    // Insert bill members
    const insertMember = db.prepare(`
      INSERT INTO bill_members (bill_id, user_id, share, is_paid)
      VALUES (?, ?, ?, ?)
    `);

    members.forEach(member => {
      // Person who paid is already settled
      const isPaid = member.user_id === paid_by ? 1 : 0;
      insertMember.run(billId, member.user_id, member.share, isPaid);
    });

    // Create notifications for all members except the one who paid
    const insertNotification = db.prepare(`
      INSERT INTO notifications (to_user_id, from_user_id, message, bill_id, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    const payer = db.prepare('SELECT name FROM users WHERE id = ?').get(paid_by);

    members.forEach(member => {
      if (member.user_id !== paid_by) {
        insertNotification.run(
          member.user_id,
          paid_by,
          `${payer.name} added you to "${name}". You owe ₹${member.share}`,
          billId,
          'new_bill'
        );
      }
    });

    res.status(201).json({ message: 'Bill created successfully', billId });

  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get all bills for current user ───────────────────
router.get('/my', auth, (req, res) => {
  try {
    const bills = db.prepare(`
      SELECT b.*, u.name as paid_by_name, u.upi_id as paid_by_upi,
             bm.share as my_share, bm.is_paid as i_paid
      FROM bills b
      JOIN bill_members bm ON b.id = bm.bill_id
      JOIN users u ON b.paid_by = u.id
      WHERE bm.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    res.json({ bills });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get settle up data ───────────────────────────────
router.get('/settle', auth, (req, res) => {
  try {
    const userId = req.user.id;

    const allDebts = db.prepare(`
      SELECT 
        b.id as bill_id,
        b.name as bill_name,
        b.paid_by,
        bm.user_id,
        bm.share,
        bm.is_paid,
        u_payer.name as payer_name,
        u_payer.upi_id as payer_upi,
        u_payer.avatar as payer_avatar,
        u_member.name as member_name,
        u_member.upi_id as member_upi,
        u_member.avatar as member_avatar
      FROM bill_members bm
      JOIN bills b ON bm.bill_id = b.id
      JOIN users u_payer ON b.paid_by = u_payer.id
      JOIN users u_member ON bm.user_id = u_member.id
      WHERE bm.is_paid = 0
        AND b.paid_by != bm.user_id
        AND (b.paid_by = ? OR bm.user_id = ?)
    `).all(userId, userId);

    const youOweMap = {};
    allDebts
      .filter(d => d.user_id === userId && d.paid_by !== userId)
      .forEach(d => {
        const key = d.paid_by;
        if (!youOweMap[key]) {
          youOweMap[key] = {
            user_id: d.paid_by,
            name: d.payer_name,
            avatar: d.payer_avatar,
            upi_id: d.payer_upi,
            total: 0,
            bills: [],
          };
        }
        youOweMap[key].total = Math.round((youOweMap[key].total + d.share) * 100) / 100;
        youOweMap[key].bills.push({ bill_id: d.bill_id, bill_name: d.bill_name, share: d.share });
      });

// ─── Get single bill details ──────────────────────────
router.get('/:id', auth, (req, res) => {
  try {
    const bill = db.prepare(`
      SELECT b.*, u.name as paid_by_name, u.upi_id as paid_by_upi
      FROM bills b
      JOIN users u ON b.paid_by = u.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // Get all members of this bill
    const members = db.prepare(`
      SELECT bm.*, u.name, u.email, u.upi_id, u.avatar
      FROM bill_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.bill_id = ?
    `).all(req.params.id);

    res.json({ bill, members });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Mark payment as paid ─────────────────────────────
router.put('/:id/pay', auth, (req, res) => {
  try {
    const { note } = req.body;
    const billId = req.params.id;
    const userId = req.user.id;

    // Update payment status
    db.prepare(`
      UPDATE bill_members 
      SET is_paid = 1, paid_at = CURRENT_TIMESTAMP, note = ?
      WHERE bill_id = ? AND user_id = ?
    `).run(note || '', billId, userId);

    // Get bill details for notification
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    const payer = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);

    // Notify the person who paid the bill
    if (bill.paid_by !== userId) {
      db.prepare(`
        INSERT INTO notifications (to_user_id, from_user_id, message, bill_id, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        bill.paid_by,
        userId,
        `${payer.name} marked their payment as done for "${bill.name}". Please confirm!`,
        billId,
        'payment_done'
      );
    }

    // Check if all members have paid and update bill status
    const unpaidCount = db.prepare(`
      SELECT COUNT(*) as count FROM bill_members 
      WHERE bill_id = ? AND is_paid = 0
    `).get(billId);

    if (unpaidCount.count === 0) {
      db.prepare('UPDATE bills SET status = ? WHERE id = ?').run('Settled', billId);
    } else {
      db.prepare('UPDATE bills SET status = ? WHERE id = ?').run('Partial', billId);
    }

    res.json({ message: 'Payment marked as done' });

  } catch (error) {
    console.error('Pay error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Confirm someone's payment ────────────────────────
router.put('/:id/confirm/:userId', auth, (req, res) => {
  try {
    const { id: billId, userId } = req.params;

    db.prepare(`
  UPDATE bill_members SET is_paid = 1 WHERE bill_id = ? AND user_id = ?
  `).run(Number(billId), Number(userId));

  // Recalculate bill status
  const unpaidCount = db.prepare(`
    SELECT COUNT(*) as count FROM bill_members 
    WHERE bill_id = ? AND is_paid = 0
    `).get(Number(billId));
  db.prepare('UPDATE bills SET status = ? WHERE id = ?')
    .run(Number(unpaidCount.count) === 0 ? 'Settled' : 'Partial', Number(billId));

    // Notify the person their payment was confirmed
    const bill = db.prepare('SELECT name FROM bills WHERE id = ?').get(billId);
    const confirmer = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

    db.prepare(`
      INSERT INTO notifications (to_user_id, from_user_id, message, bill_id, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      req.user.id,
      `${confirmer.name} confirmed your payment for "${bill.name}". You're all settled! ✅`,
      billId,
      'payment_confirmed'
    );

    res.json({ message: 'Payment confirmed' });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get dashboard summary ────────────────────────────
router.get('/summary/dashboard', auth, (req, res) => {
  try {
    const userId = req.user.id;

    // Total you owe (others paid, you haven't paid)
    const youOwe = db.prepare(`
      SELECT COALESCE(SUM(bm.share), 0) as total
      FROM bill_members bm
      JOIN bills b ON bm.bill_id = b.id
      WHERE bm.user_id = ? AND b.paid_by != ? AND bm.is_paid = 0
    `).get(userId, userId);

    // Total owed to you (you paid, others haven't paid)
    const owedToYou = db.prepare(`
      SELECT COALESCE(SUM(bm.share), 0) as total
      FROM bill_members bm
      JOIN bills b ON bm.bill_id = b.id
      WHERE b.paid_by = ? AND bm.user_id != ? AND bm.is_paid = 0
    `).get(userId, userId);

    // Total spent (all bills you are part of)
    const totalSpent = db.prepare(`
      SELECT COALESCE(SUM(bm.share), 0) as total
      FROM bill_members bm
      WHERE bm.user_id = ?
    `).get(userId);

    res.json({
      you_owe: youOwe.total,
      owed_to_you: owedToYou.total,
      total_spent: totalSpent.total,
      net_balance: owedToYou.total - youOwe.total
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

    const owesYouMap = {};
    allDebts
      .filter(d => d.paid_by === userId && d.user_id !== userId)
      .forEach(d => {
        const key = d.user_id;
        if (!owesYouMap[key]) {
          owesYouMap[key] = {
            user_id: d.user_id,
            name: d.member_name,
            avatar: d.member_avatar,
            upi_id: d.member_upi,
            total: 0,
            bills: [],
          };
        }
        owesYouMap[key].total = Math.round((owesYouMap[key].total + d.share) * 100) / 100;
        owesYouMap[key].bills.push({ bill_id: d.bill_id, bill_name: d.bill_name, share: d.share });
      });

    const netMap = {};
    netMap[userId] = { user_id: userId, name: 'You', avatar: null, upi_id: null, net: 0 };

    allDebts.forEach(d => {
      if (!netMap[d.paid_by]) {
        netMap[d.paid_by] = { user_id: d.paid_by, name: d.payer_name, avatar: d.payer_avatar, upi_id: d.payer_upi, net: 0 };
      }
      if (!netMap[d.user_id]) {
        netMap[d.user_id] = { user_id: d.user_id, name: d.member_name, avatar: d.member_avatar, upi_id: d.member_upi, net: 0 };
      }
      netMap[d.paid_by].net = Math.round((netMap[d.paid_by].net + d.share) * 100) / 100;
      netMap[d.user_id].net = Math.round((netMap[d.user_id].net - d.share) * 100) / 100;
    });

    const creditors = Object.values(netMap).filter(p => p.net > 0).sort((a, b) => b.net - a.net);
    const debtors = Object.values(netMap).filter(p => p.net < 0).sort((a, b) => a.net - b.net);

    const simplified = [];
    const creds = creditors.map(c => ({ ...c }));
    const debts = debtors.map(d => ({ ...d }));

    let i = 0, j = 0;
    while (i < debts.length && j < creds.length) {
      const debtor = debts[i];
      const creditor = creds[j];
      const amount = Math.min(Math.abs(debtor.net), creditor.net);
      const roundedAmount = Math.round(amount * 100) / 100;

      if (roundedAmount > 0) {
        simplified.push({
          from_user_id: debtor.user_id,
          from_name: debtor.user_id === userId ? 'You' : debtor.name,
          from_avatar: debtor.avatar,
          to_user_id: creditor.user_id,
          to_name: creditor.user_id === userId ? 'You' : creditor.name,
          to_avatar: creditor.avatar,
          to_upi: creditor.upi_id,
          amount: roundedAmount,
        });
      }

      debtor.net = Math.round((debtor.net + amount) * 100) / 100;
      creditor.net = Math.round((creditor.net - amount) * 100) / 100;

      if (Math.abs(debtor.net) < 0.01) i++;
      if (Math.abs(creditor.net) < 0.01) j++;
    }

    res.json({
      you_owe: Object.values(youOweMap),
      owes_you: Object.values(owesYouMap),
      simplified,
    });

  } catch (error) {
    console.error('Settle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;