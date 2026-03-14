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
          phone: user.phone,
          address: user.address,
          location: user.location,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.address = user.address;
        token.location = user.location;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "donor" | "ngo" | "volunteer" | "admin";
        session.user.phone = token.phone as string | undefined;
        session.user.address = token.address as string | undefined;
        session.user.location = token.location as { lat: number; lng: number } | undefined;
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