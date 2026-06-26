import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { openReadonlyDb } from '@/lib/db';

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

        const sqlite = openReadonlyDb();
        const user = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(credentials.email) as any;
        sqlite.close();

        if (!user) return null;

        const isValid = bcrypt.compareSync(credentials.password, user.password_hash);
        if (!isValid) return null;

        return { id: user.id.toString(), email: user.email, name: user.email, role: user.role };
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
