import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";

// Повна конфігурація Auth.js (Node runtime: використовує Prisma + bcrypt).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)
          ?.trim()
          .toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
          // Акаунт без пароля (legacy) — вхід за паролем заборонено
          if (!existing.password) return null;
          const ok = await bcrypt.compare(password, existing.password);
          if (!ok) return null;
          return {
            id: existing.id,
            email: existing.email,
            name: existing.name,
          };
        }

        // Автореєстрація під час першого входу
        if (password.length < 6) return null; // мінімальна довжина пароля
        const hash = await bcrypt.hash(password, 10);
        const created = await prisma.user.create({
          data: { email, password: hash, name: email.split("@")[0] },
        });
        return { id: created.id, email: created.email, name: created.name };
      },
    }),
  ],
});
