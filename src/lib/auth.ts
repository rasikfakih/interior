import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { ensureMigrated, getPool } from '@/lib/pg';

/**
 * Postgres-backed credentials provider for the v1.1.2 runtime.
 *
 * Reads the users table on every credentials submit. The boot
 * migrate hook (`ensureMigrated()`) is awaited once on first call
 * which is the seam for cold-start schema sync.
 *
 * Roles: 'admin' or 'superadmin'. JWT callback stamps role into
 * the token; session callback exposes it on session.user.role.
 * Client-side route guards use the session.user.role value.
 */
async function findUserByEmail(email: string) {
  await ensureMigrated();
  const r = await getPool().query(
    'SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return r.rows[0] ?? null;
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

        const user = await findUserByEmail(credentials.email);
        if (!user) return null;

        const hash = user.password_hash as string;
        const ok = bcrypt.compareSync(credentials.password, hash);
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
