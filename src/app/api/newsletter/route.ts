import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'etihad.db')

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const sqlite = new Database(DB_PATH)
    
    // Create newsletter table if not exists
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1
      )
    `)
    
    const stmt = sqlite.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)')
    const result = stmt.run(email)
    sqlite.close()
    
    if (result.changes === 0) {
      return NextResponse.json({ message: 'Already subscribed!' })
    }
    
    return NextResponse.json({ message: 'Successfully subscribed!' })
  } catch (error) {
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
