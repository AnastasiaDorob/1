import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Вхід</h1>
      <p className="text-sm text-white/60">
        Заготовка авторизації на Auth.js. Запрацює, щойно у{" "}
        <code>.env</code> будуть <code>AUTH_SECRET</code> та облікові дані
        провайдера.
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/chat" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
        >
          Увійти через GitHub
        </button>
      </form>

      <p className="text-xs text-white/40">
        Інших провайдерів (Google, Email, Credentials) додають у{" "}
        <code>lib/auth.ts</code>.
      </p>
    </div>
  );
}
