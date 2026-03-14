import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "donor" | "ngo" | "volunteer" | "admin";
      phone?: string;
      address?: string;
      location?: {
        lat: number;
        lng: number;
      };
    };
  }

  interface User {
    id: string;
    role: "donor" | "ngo" | "volunteer" | "admin";
    phone?: string;
    address?: string;
    location?: {
      lat: number;
      lng: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "donor" | "ngo" | "volunteer" | "admin";
    phone?: string;
    address?: string;
    location?: {
      lat: number;
      lng: number;
    };
  }
}