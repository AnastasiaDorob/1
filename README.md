# AI Wok

Стартер на **Next.js (App Router)** під деплой на **Vercel** з:

- захищеним серверним AI-проксі (`/api/ai`) — API-ключ не світиться у браузері;
- стрімінговим чатом із Claude;
- заготовкою авторизації на **Auth.js (NextAuth v5)**.

## Чому Next.js, а не Vite/CRA

AI-виклики мають іти через сервер, щоб не світити ключі. Next.js дає фронт і
бекенд (Route Handlers) в одному проєкті, серверні змінні (`ANTHROPIC_API_KEY`)
ніколи не потрапляють у клієнтський бандл, а на Vercel API-роути автоматично
стають serverless-функціями. Для SPA (Vite) довелося б тримати окремий бекенд.

## Структура

```
app/
  page.tsx                  головна
  chat/page.tsx             сторінка AI-фічі
  login/page.tsx            сторінка авторизації
  api/ai/route.ts           серверний AI-проксі (ховає ключ, стрімить відповідь)
  api/auth/[...nextauth]/   Auth.js handler
components/
  Header.tsx
  Chat.tsx                  клієнтський компонент чату
lib/
  anthropic.ts              серверний клієнт Claude
  auth.ts                   конфіг авторизації (провайдери)
middleware.ts               захист маршрутів (наразі заглушка)
```

## Запуск локально

```bash
npm install
cp .env.example .env        # і заповни ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Деплой на Vercel

1. Запуш репозиторій у GitHub.
2. На [vercel.com](https://vercel.com) → New Project → імпортуй репозиторій
   (Next.js визначиться автоматично).
3. У **Project Settings → Environment Variables** додай `ANTHROPIC_API_KEY`
   (і `AUTH_SECRET` + дані провайдера, якщо вмикаєш авторизацію).
4. Deploy.

## Увімкнути авторизацію

1. `npx auth secret` → запиши `AUTH_SECRET` у `.env`.
2. Створи GitHub OAuth App, заповни `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.
3. Щоб закрити `/chat` для неавторизованих — розкоментуй `middleware.ts`.
4. Щоб закрити сам AI-ендпоінт — розкоментуй перевірку `auth()` в
   `app/api/ai/route.ts`.

## Модель

За замовчуванням `claude-opus-4-8` (див. `lib/anthropic.ts`). Змінюється там же.
