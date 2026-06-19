import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Місце під авторизацію (Auth.js / NextAuth v5).
//
// Запрацює, щойно у .env будуть AUTH_SECRET + AUTH_GITHUB_ID/SECRET.
// Провайдери легко міняти: Google, Credentials, Email-magic-link тощо.
// Без env-змінних білд проходить — падіння буде лише при реальній спробі логіну.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  // pages: { signIn: "/login" }, // якщо хочеш свою сторінку логіну
});
