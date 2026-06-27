import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { ensureMigrated, pgOne } from '@/lib/pg';

/**
 * Credentials provider for v1.1.2 runtime.
 *
 * Postgres is the canonical surface when DATABASE_URL is set.
 * When DATABASE_URL is unset (Vercel hasn't received its env
 * value yet), the auth path falls through to the SQLite hot-copy
 * so login keeps working. This keeps login robust across operator
 * actions between env-var setup and the Postgres-only cutover.
 *
 * The hot-copy lives at /tmp/etihad-{region}.db on Vercel. The
 * file is copied on first request from data/etihad.db which is
 * generated at install time by scripts/migrate.mjs (postinstall
 * on Vercel).
 */

function isVercelSqlitePath(): boolean {
  return !process.env.DATABASE_URL && Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function getVercelHotCopy(): Database.Database | null {
  if (!isVercelSqlitePath()) return null;
  try {
    const id = process.env.VERCEL_REGION || 'global';
    const target = `/tmp/etihad-${id}.db`;
    if (!fs.existsSync(target)) {
      const source = path.join(process.cwd(), 'data', 'etihad.db');
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
      } else {
        const seed = new Database(target);
        seed.pragma('journal_mode = DELETE');
        seed.close();
        return null;
      }
    }
    const db = new Database(target, { readonly: true, fileMustExist: false });
    db.pragma('journal_mode = DELETE');
    return db;
  } catch {
    return null;
  }
}

type UserRow = {
  id: number | string;
  email: string;
  password_hash: string;
  role: string | null;
};

async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureMigrated();
  return await pgOne<UserRow>(
    `SELECT id, email, password_hash, role FROM users
     WHERE email = $1 LIMIT 1`,
    [email]
  );
}

function findUserByEmailLegacy(email: string): UserRow | null {
  const db = getVercelHotCopy();
  if (!db) return null;
  try {
    const row = db
      .prepare(`SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1`)
      .get(email) as UserRow | undefined;
    return row ?? null;
  } finally {
    try { db.close(); } catch { /* ignore */ }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user: UserRow | null = null;
        try {
          user = await findUserByEmail(credentials.email);
        } catch {
          user = null;
        }
        if (!user) {
          user = findUserByEmailLegacy(credentials.email);
        }
        if (!user) return null;

        const ok = bcrypt.compareSync(credentials.password, user.password_hash);
        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.email,
          role: user.role || 'admin',
        };
      },
    }),
  ],
  pages: {
    signIn: '/admin',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.sub as string,
          role: token.role as string,
        } as any;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'etihad-interiors-secret-key-2026',
};
