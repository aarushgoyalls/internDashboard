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
      // True once the one-time post-sign-in role picker (see
      // src/lib/rolePreview.ts) has been resolved for this session. Only
      // ever meaningful for the single hardcoded preview account.
      rolePreviewChosen?: boolean;
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
    rolePreviewChosen?: boolean;
  }
}
