const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const [, , username, password] = process.argv;
if (!username || !password) {
  console.log('Usage: node add-admin.js <username> <password>');
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
let users = [];
try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) {}

users = users.filter(u => u.username !== username);
users.push({ username, passwordHash: bcrypt.hashSync(password, 10) });

fs.writeFileSync(USERS_FILE, JSON.stringify(users));
console.log('Admin account "' + username + '" saved.');
