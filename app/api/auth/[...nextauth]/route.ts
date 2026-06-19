import { handlers } from "@/lib/auth";

// Catch-all маршрут Auth.js: /api/auth/signin, /api/auth/callback/* тощо.
export const { GET, POST } = handlers;
