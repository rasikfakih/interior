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

// Fail closed: there is intentionally NO hardcoded fallback secret.
// A previously shipped fallback ('etihad-interiors-secret-key-2026')
// lived in the source, so anyone who read the repo could forge session
// tokens when the env var was missing. NEXTAUTH_SECRET is required in
// .env.local / the deploy env; this throws at import time instead of
// degrading. next-auth's own dev-mode auto-generation would otherwise
// paper over a missing secret.
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Add it to .env.local (see .env.local.example) " +
      "or the deploy environment before running the app."
  );
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
  secret: NEXTAUTH_SECRET,
};
