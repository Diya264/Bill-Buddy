const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// ─── Signup ───────────────────────────────────────────
router.post('/signup', (req, res) => {
  try {
    const { name, email, password, upi_id } = req.body;

    // Check if email already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Get first letter of name as avatar
    const avatar = name.charAt(0).toUpperCase();

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (name, email, password, upi_id, avatar) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, hashedPassword, upi_id || '', avatar);

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, name, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: result.lastInsertRowid,
        name,
        email,
        upi_id: upi_id || '',
        avatar
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Login ────────────────────────────────────────────
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        upi_id: user.upi_id,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get current user ─────────────────────────────────
router.get('/me', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, upi_id, avatar FROM users WHERE id = ?').get(decoded.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;