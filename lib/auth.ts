import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        await connectMongo();
        const user = await User.findOne({ email: credentials.email }).lean();

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(credentials.password, user.password);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "donor" | "ngo" | "volunteer" | "admin";
      }

      return session;
    },
    async redirect({ baseUrl, url }) {
      if (url.startsWith("/dashboard")) {
        return `${baseUrl}${url}`;
      }

      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};