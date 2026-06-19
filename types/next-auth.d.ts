import type { DefaultSession } from "next-auth";

// Додаємо user.id у тип сесії (id беремо з token.sub).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
