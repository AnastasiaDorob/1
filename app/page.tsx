"use client";

import { useState } from "react";

type Question = {
  id: number;
  text: string;
  type: string;
};

// Приклад для швидкого демо — заповнює форму одним кліком.
const SAMPLE = {
  candidateName: "Олена Коваленко",
  cvText: `Senior Frontend Developer, 6 років досвіду.
Стек: React, TypeScript, Next.js, Redux, GraphQL.
Вела міграцію великого SPA на Next.js, налаштувала CI/CD.
Менторила 3 джуніорів. Англійська — Upper-Intermediate.
Останній рік — переважно менеджмент, мало хендс-он коду.`,
  jobText: `Шукаємо Senior/Lead Frontend Engineer.
Обов'язкові: глибокий React + TypeScript, досвід з SSR (Next.js),
оптимізація продуктивності, робота з REST та WebSocket.
Плюсом: досвід лідерства команди, code review, наставництво.
Команда розподілена, потрібен сильний письмовий і усний English.`,
};

export default function HomePage() {
  const [candidateName, setCandidateName] = useState("");
  const [cvText, setCvText] = useState("");
  const [jobText, setJobText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const canSubmit =
    candidateName.trim() && cvText.trim() && jobText.trim() && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setQuestions(null);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName, cvText, jobText }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? `Помилка сервера (${res.status})`);
      }

      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Щось пішло не так");
    } finally {
      setLoading(false);
    }
  }

  async function copyQuestion(q: Question) {
    try {
      await navigator.clipboard.writeText(q.text);
      setCopiedId(q.id);
      setTimeout(() => setCopiedId((id) => (id === q.id ? null : id)), 2000);
    } catch {
      setError("Не вдалося скопіювати в буфер обміну");
    }
  }

  return (
    <div className="relative">
      {/* М'які градієнтні акценти на фоні */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      {/* Hero */}
      <section className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Powered by Claude Opus 4.8
        </span>
        <h1 className="bg-gradient-to-br from-white to-white/50 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          Генератор питань для співбесіди
        </h1>
        <p className="mx-auto max-w-xl leading-relaxed text-white/60">
          Вставте резюме кандидата та опис вакансії — Claude порівняє їх, знайде
          зони для перевірки й згенерує точкові питання для інтерв'ю.
        </p>
      </section>

      {/* Форма */}
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-white/80">
            Ім'я кандидата
          </label>
          <button
            type="button"
            onClick={() => {
              setCandidateName(SAMPLE.candidateName);
              setCvText(SAMPLE.cvText);
              setJobText(SAMPLE.jobText);
            }}
            className="text-xs text-violet-300/80 underline-offset-2 hover:text-violet-200 hover:underline"
          >
            Підставити приклад
          </button>
        </div>

        <input
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Напр., Олена Коваленко"
          disabled={loading}
          className="-mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Резюме (CV)
            </label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Встав сюди текст резюме кандидата — досвід, стек технологій, проєкти…"
              rows={9}
              disabled={loading}
              className="w-full resize-y rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Опис вакансії
            </label>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Встав сюди вимоги вакансії — обов'язкові навички, стек, рівень, soft skills…"
              rows={9}
              disabled={loading}
              className="w-full resize-y rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner />
              Claude аналізує резюме…
            </>
          ) : (
            <>Згенерувати питання для співбесіди</>
          )}
        </button>
      </form>

      {/* Помилка */}
      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.94 6.94a.75.75 0 011.06 0L10 7.94l.94-.94a.75.75 0 111.06 1.06L11.06 9l.94.94a.75.75 0 11-1.06 1.06L10 10.06l-.94.94A.75.75 0 018 9.94L8.94 9 8 8.06a.75.75 0 01-.06-1.12z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium">Сталася помилка</p>
            <p className="text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {/* Результати */}
      {questions && (
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Згенеровані питання{" "}
              <span className="text-white/40">({questions.length})</span>
            </h2>
          </div>

          {questions.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
              Питань не згенеровано. Спробуйте додати більше деталей у резюме чи
              вакансію.
            </p>
          ) : (
            <ul className="space-y-3">
              {questions.map((q, i) => (
                <li
                  key={q.id}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-up rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xs font-medium text-white/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-relaxed text-white/90">
                        {q.text}
                      </p>
                    </div>
                    <button
                      onClick={() => copyQuestion(q)}
                      title="Скопіювати питання"
                      className="flex-shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:text-white"
                    >
                      {copiedId === q.id ? "Скопійовано ✓" : "Копіювати"}
                    </button>
                  </div>
                  <div className="mt-2 pl-8">
                    <TypeBadge type={q.type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = (type ?? "").toLowerCase();
  const isTechnical = t.includes("tech");
  const isSoft = t.includes("soft");

  const cls = isTechnical
    ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
    : isSoft
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
      : "border-white/15 bg-white/10 text-white/70";

  const label = isTechnical
    ? "Technical"
    : isSoft
      ? "Soft skill"
      : type || "—";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
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
  );
}
