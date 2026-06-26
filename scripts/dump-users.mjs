import fs from 'fs';
import path from 'path';
import url from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'etihad.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare('SELECT id, email, role, length(password_hash) as phl, substr(password_hash,1,4) as prefix FROM users').all();
console.log('users:', JSON.stringify(rows, null, 2));
const envFile = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envFile, 'utf8');
const adm = env.split(/\r?\n/).find(l => l.startsWith('ADMIN_EMAIL'));
console.log('env ADMIN_EMAIL line:', adm);
sqlite.close();
