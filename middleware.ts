import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-інстанс лише з authConfig (без Prisma/bcrypt) — читає JWT і
// застосовує callbacks.authorized: неавторизованих кидає на /login.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Захищаємо всі сторінки, окрім /api/*, статики та файлів із крапкою.
  // API-маршрути захищають себе самі (повертають 401).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
