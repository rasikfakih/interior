const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'etihad.db');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const sqlite = new Database(DB_PATH);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    description TEXT NOT NULL,
    before_image TEXT,
    after_image TEXT,
    model_3d TEXT,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    photo TEXT,
    quote TEXT NOT NULL,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    bio TEXT,
    photo TEXT,
    order_index INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS journal_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  );
`);

// Seed default admin
const bcrypt = require('bcryptjs');
const adminEmail = process.env.ADMIN_EMAIL || 'admin@etihadinteriors.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const passwordHash = bcrypt.hashSync(adminPassword, 10);

const insertAdmin = sqlite.prepare(`
  INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, 'admin')
`);
insertAdmin.run(adminEmail, passwordHash);

// Seed default settings
const defaultSettings = [
  { key: 'site_name', value: 'Etihad Interiors' },
  { key: 'site_tagline', value: 'Premium Interior Design Studio' },
  { key: 'contact_phone', value: '+91 98765 43210' },
  { key: 'contact_email', value: 'hello@etihadinteriors.com' },
  { key: 'contact_address', value: 'Kalyan, Maharashtra, India' },
  { key: 'calendly_link', value: 'https://calendly.com/etihadinteriors' },
  { key: 'instagram_url', value: 'https://instagram.com/etihad.interior' },
  { key: 'footer_text', value: 'Etihad Interiors | Designed with passion' },
];

const insertSetting = sqlite.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

for (const setting of defaultSettings) {
  insertSetting.run(setting.key, setting.value);
}

console.log('Database initialized successfully.');
