import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { ensureMigrated, pgOne } from '@/lib/pg';

/**
 * Credentials provider for Studio OS v2.0.
 *
 * Supabase (Postgres) is the single database; users live in the app's
 * public.users table (id, email, password_hash, role). Login reads via
 * the pg surface, so there is no SQLite path anywhere in auth.
 */

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
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'etihad-interiors-secret-key-2026',
};
