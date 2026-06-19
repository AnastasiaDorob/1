import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">AI Wok</h1>
        <p className="text-white/70 leading-relaxed">
          Стартер на Next.js (App Router) під деплой на Vercel. AI-виклики йдуть
          через серверний route handler{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
            /api/ai
          </code>
          , тож API-ключ ніколи не потрапляє у браузер.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <FeatureCard
          href="/chat"
          title="AI-фіча →"
          desc="Стрімінговий чат із Claude через захищений серверний проксі."
        />
        <FeatureCard
          href="/login"
          title="Авторизація →"
          desc="Заготовка під Auth.js (NextAuth). Лишилось додати провайдера й секрет."
        />
      </section>

      <section className="text-sm text-white/50 leading-relaxed">
        <p>Структура проєкту:</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white/5 p-4 text-xs">
{`app/
  page.tsx              головна
  chat/page.tsx         сторінка AI-фічі
  login/page.tsx        сторінка авторизації
  api/ai/route.ts       серверний AI-проксі (ховає ключ)
  api/auth/[...nextauth] Auth.js handler
components/             перевикористовувані компоненти
lib/
  anthropic.ts          серверний клієнт Claude
  auth.ts               конфіг авторизації
middleware.ts           захист маршрутів (заглушка)`}
        </pre>
      </section>
    </div>
  );
}

function FeatureCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-white/10 p-5 hover:border-white/30 transition-colors"
    >
      <h2 className="font-semibold mb-1">{title}</h2>
      <p className="text-sm text-white/60">{desc}</p>
    </Link>
  );
}
