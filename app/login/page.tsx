"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Невірний email або пароль (мін. 6 символів для нового акаунта).");
        return;
      }
      // Оновлюємо серверні компоненти (Header) і переходимо в кабінет
      router.push("/");
      router.refresh();
    } catch {
      setError("Не вдалося увійти. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-1px)] items-center justify-center px-4">
      {/* Градієнтні акценти */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 text-3xl">🍳</div>
          <h1 className="bg-gradient-to-br from-white to-white/50 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Вхід до кабінету рекрутера
          </h1>
          <p className="mt-1.5 text-sm text-white/50">
            Увійдіть, щоб бачити своїх кандидатів
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@company.com"
              autoComplete="email"
              disabled={loading}
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : null}
            Увійти
          </button>

          <p className="text-center text-xs text-white/40">
            Немає акаунта? Він створиться автоматично при першому вході.
          </p>
        </form>
      </div>
    </div>
  );
}
