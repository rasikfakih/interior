import Database from 'better-sqlite3';
const db = new Database('data/etihad.db', { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
for (const t of tables) {
  const r = db.prepare(`SELECT COUNT(*) as n FROM "${t.name}"`).get();
  console.log(`${t.name}: ${r.n} rows`);
}
db.close();
