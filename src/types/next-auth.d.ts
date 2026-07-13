import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Teach TypeScript about the custom fields we put on the session/token so
// `session.user.role` etc. are typed everywhere.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      departmentId: string | null;
      isAlsoIntern: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
    departmentId?: string | null;
    isAlsoIntern?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    departmentId: string | null;
    isAlsoIntern: boolean;
  }
}
