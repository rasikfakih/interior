/**
 * NextAuth credentials provider. Phase 1 of v1.1.2: when DATABASE_URL is
 * set, the user lookup queries Supabase via pg; otherwise the existing
 * SQLite path. Phase 2 will collapse this into a single driver-branched
 * helper. For now we keep the two code paths explicit so we can verify
 * each independently before they are unified.
 */
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { openReadonlyDb } from '@/lib/db';
import pg from 'pg';

export async function lookupUser(email: string, password: string): Promise<{ id: string; email: string; name: string; role: string } | null> {
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const pool = new pg.Pool({
      connectionString: url,
      ssl: url.includes('supabase.com') || url.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    });
    try {
      const r = await pool.query('SELECT id::text as id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1', [email]);
      const row = r.rows[0];
      if (!row) return null;
      const ok = bcrypt.compareSync(password, row.password_hash);
      if (!ok) return null;
      return { id: row.id, email: row.email, name: row.email, role: row.role };
    } finally {
      await pool.end().catch(() => {});
    }
  }

  const sqlite = openReadonlyDb();
  try {
    const user = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return null;
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) return null;
    return { id: user.id.toString(), email: user.email, name: user.email, role: user.role };
  } finally {
    sqlite.close();
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
        return await lookupUser(credentials.email, credentials.password);
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
        session.user = { ...session.user, id: token.sub, role: token.role } as any;
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
