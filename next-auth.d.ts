import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "donor" | "ngo" | "volunteer" | "admin";
    };
  }

  interface User {
    id: string;
    role: "donor" | "ngo" | "volunteer" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "donor" | "ngo" | "volunteer" | "admin";
  }
}