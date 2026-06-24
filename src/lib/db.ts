import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('./data/etihad.db');
sqlite.pragma('journal_mode = DELETE');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });
