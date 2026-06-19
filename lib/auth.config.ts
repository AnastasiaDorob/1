import type { NextAuthConfig } from "next-auth";

// Edge-безпечна частина конфігу Auth.js (без Prisma / bcrypt).
// Її імпортує middleware; повні провайдери — у lib/auth.ts (Node runtime).
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // Credentials-провайдер додається в lib/auth.ts
  callbacks: {
    // Вирішує доступ у middleware. false → редірект на pages.signIn (/login).
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        // Залогінений на /login → відправляємо в кабінет
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    session({ session, token }) {
      // Auth.js кладе id користувача в token.sub за замовчуванням.
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
