// Auth.js mounts its own endpoints (sign-in, callback, signout, session...)
// under /api/auth/* via these handlers.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
