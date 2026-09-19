const bcrypt = require('bcryptjs');
const db = require('./database/db');

// Clear all existing users first
db.prepare('DELETE FROM notifications').run();
db.prepare('DELETE FROM bill_members').run();
db.prepare('DELETE FROM bills').run();
db.prepare('DELETE FROM group_members').run();
db.prepare('DELETE FROM groups').run();
db.prepare('DELETE FROM users').run();
console.log('🗑️ Cleared all existing data');

const users = [
  { name: 'Shreya', email: 'shreya@gmail.com', password: '123456' },
  { name: 'Anjali', email: 'anjali@gmail.com', password: '123456' },
  { name: 'Madhura', email: 'madhura@gmail.com', password: '123456' },
  { name: 'Rahul', email: 'rahul@gmail.com', password: '123456' },
  { name: 'Aditya', email: 'aditya@gmail.com', password: '123456' },
];

users.forEach(u => {
  const hashed = bcrypt.hashSync(u.password, 10);
  const avatar = u.name.charAt(0).toUpperCase();
  db.prepare('INSERT INTO users (name, email, password, upi_id, avatar) VALUES (?, ?, ?, ?, ?)')
    .run(u.name, u.email, hashed, '', avatar);
  console.log('✅ Created:', u.name);
});

console.log('✅ All demo accounts ready!');
process.exit();