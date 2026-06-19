"use client";

import { useEffect, useRef, useState } from "react";

type Question = {
  id: number;
  text: string;
  type: string;
  followUp?: string;
};

type Candidate = {
  id: string;
  name: string;
  cvText: string; // "[PDF] filename"
  jobText: string;
  questions: Question[];
  createdAt: string;
};

// Невеликий валідний демо-PDF (англомовне CV) — щоб «Підставити приклад»
// працювало end-to-end без реального файлу.
const SAMPLE_CV_FILENAME = "olena_kovalenko_cv.pdf";
const SAMPLE_CV_BASE64 =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggMzcyID4+CnN0cmVhbQpCVAovRjEgMTIgVGYKNTAgNzYwIFRkCjE2IFRMCihPbGVuYSBLb3ZhbGVua28gLSBTZW5pb3IgRnJvbnRlbmQgRGV2ZWxvcGVyKSBUagpUKgooKSBUagpUKgooRXhwZXJpZW5jZTogNiB5ZWFycy4pIFRqClQqCihTdGFjazogUmVhY3QsIFR5cGVTY3JpcHQsIE5leHQuanMsIFJlZHV4LCBHcmFwaFFMLikgVGoKVCoKKExlZCBtaWdyYXRpb24gb2YgYSBsYXJnZSBTUEEgdG8gTmV4dC5qczsgc2V0IHVwIENJL0NELikgVGoKVCoKKE1lbnRvcmVkIDMganVuaW9yIGRldmVsb3BlcnMuIEVuZ2xpc2g6IFVwcGVyLUludGVybWVkaWF0ZS4pIFRqClQqCihMYXN0IHllYXI6IG1vc3RseSBtYW5hZ2VtZW50LCBsaXR0bGUgaGFuZHMtb24gY29kaW5nLikgVGoKVCoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDMxMSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjczNAolJUVPRg==";

const SAMPLE_JOB = `Шукаємо Senior/Lead Frontend Engineer.
Обов'язкові: глибокий React + TypeScript, досвід з SSR (Next.js),
оптимізація продуктивності, робота з REST та WebSocket.
Плюсом: досвід лідерства команди, code review, наставництво.
Команда розподілена, потрібен сильний письмовий і усний English.`;

// Закріплені кандидати зберігаємо в браузері (найпростіше, без змін схеми).
const PIN_KEY = "aiwok:pinnedCandidateIds";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf("base64,");
      resolve(comma >= 0 ? result.slice(comma + "base64,".length) : result);
    };
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pdfNameFromCvText(cvText: string): string {
  return cvText.startsWith("[PDF] ") ? cvText.slice("[PDF] ".length) : cvText;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function HomePage() {
  // --- Історія кандидатів ---
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // selectedId === null → режим "Новий кандидат" (форма)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Стан форми ---
  const [candidateName, setCandidateName] = useState("");
  const [jobText, setJobText] = useState("");
  const [level, setLevel] = useState<"easy" | "advanced">("easy");
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvSize, setCvSize] = useState<number | null>(null);
  const [cvBase64, setCvBase64] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [rephrasingId, setRephrasingId] = useState<number | null>(null);
  const [addingType, setAddingType] = useState<"technical" | "soft" | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const canSubmit = Boolean(
    candidateName.trim() && jobText.trim() && cvBase64 && !loading,
  );

  // Розділяємо на закріплені та решту (порядок усередині — як прийшло з сервера, новіші перші)
  const pinnedSet = new Set(pinnedIds);
  const pinnedCandidates = candidates.filter((c) => pinnedSet.has(c.id));
  const otherCandidates = candidates.filter((c) => !pinnedSet.has(c.id));

  function persistPins(ids: string[]) {
    setPinnedIds(ids);
    try {
      localStorage.setItem(PIN_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }

  function togglePin(id: string) {
    persistPins(
      pinnedIds.includes(id)
        ? pinnedIds.filter((x) => x !== id)
        : [id, ...pinnedIds],
    );
  }

  function selectCandidate(id: string) {
    setSelectedId(id);
    setError(null);
  }

  async function deleteCandidate(id: string) {
    const prev = candidates;
    // Оптимістично прибираємо зі списку
    setCandidates((list) => list.filter((c) => c.id !== id));
    if (pinnedIds.includes(id)) persistPins(pinnedIds.filter((x) => x !== id));
    if (selectedId === id) startNew();

    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setCandidates(prev); // відкат
      setError("Не вдалося видалити кандидата. Спробуйте ще раз.");
    }
  }

  // Завантажуємо закріплених із localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPinnedIds(parsed.filter((x) => typeof x === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  // Завантажуємо історію при старті
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/generate-questions");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Помилка завантаження");
        setCandidates(Array.isArray(data?.candidates) ? data.candidates : []);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Не вдалося завантажити історію",
        );
      } finally {
        setListLoading(false);
      }
    })();
  }, []);

  function resetForm() {
    setCandidateName("");
    setJobText("");
    setCvBase64(null);
    setCvFileName(null);
    setCvSize(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startNew() {
    setSelectedId(null);
    setError(null);
    resetForm();
  }

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Можна завантажити лише PDF-файл.");
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setCvBase64(base64);
      setCvFileName(file.name);
      setCvSize(file.size);
      setError(null);
    } catch {
      setError("Не вдалося прочитати PDF-файл.");
    }
  }

  function clearFile() {
    setCvBase64(null);
    setCvFileName(null);
    setCvSize(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function fillExample() {
    setCandidateName("Олена Коваленко");
    setJobText(SAMPLE_JOB);
    setCvBase64(SAMPLE_CV_BASE64);
    setCvFileName(SAMPLE_CV_FILENAME);
    setCvSize(916);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          jobText,
          cvBase64,
          cvFileName,
          level,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Помилка сервера (${res.status})`);
      }
      const created = data?.candidate as Candidate | undefined;
      if (!created) throw new Error("Сервер не повернув кандидата");

      // Додаємо в історію (зверху) і відкриваємо його картку
      setCandidates((prev) => [created, ...prev]);
      setSelectedId(created.id);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Щось пішло не так");
    } finally {
      setLoading(false);
    }
  }

  // Оновлює масив questions конкретного кандидата у стейті
  function patchCandidateQuestions(
    candidateId: string,
    updater: (qs: Question[]) => Question[],
  ) {
    setCandidates((list) =>
      list.map((c) =>
        c.id === candidateId
          ? { ...c, questions: updater(c.questions ?? []) }
          : c,
      ),
    );
  }

  async function rephraseQuestion(candidate: Candidate, q: Question) {
    if (rephrasingId !== null) return;
    setRephrasingId(q.id);
    setError(null);
    try {
      const res = await fetch("/api/rephrase-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: q.text, level }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Помилка перефразування");

      patchCandidateQuestions(candidate.id, (qs) =>
        qs.map((item) =>
          item.id === q.id
            ? {
                ...item,
                text: typeof data.text === "string" ? data.text : item.text,
                followUp:
                  typeof data.followUp === "string"
                    ? data.followUp
                    : item.followUp,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не вдалося перефразувати питання",
      );
    } finally {
      setRephrasingId(null);
    }
  }

  async function addQuestion(candidate: Candidate, type: "technical" | "soft") {
    if (addingType !== null) return;
    setAddingType(type);
    setError(null);
    try {
      const res = await fetch("/api/add-custom-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          candidateName: candidate.name,
          jobText: candidate.jobText,
          cvTextOrMarker: candidate.cvText,
          type,
          currentQuestionsCount: candidate.questions?.length ?? 0,
          level,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Помилка додавання питання");

      const added = Array.isArray(data?.questions)
        ? (data.questions as Question[])
        : [];
      if (added.length === 0) throw new Error("Сервер не повернув питання");

      patchCandidateQuestions(candidate.id, (qs) => [...qs, ...added]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не вдалося додати питання",
      );
    } finally {
      setAddingType(null);
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
    <div className="flex h-[calc(100vh-3.5rem-1px)] overflow-hidden">
      {/* ───────── ЛІВА КОЛОНКА: історія ───────── */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-white/10 bg-white/[0.02]">
        <div className="p-3">
          <button
            onClick={startNew}
            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              selectedId === null
                ? "border-amber-400/50 bg-amber-400/15 text-white"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25"
            }`}
          >
            <span className="text-base leading-none">➕</span>
            Новий кандидат
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 pt-1">
          {listLoading ? (
            <div className="space-y-2 px-1 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-white/5"
                />
              ))}
            </div>
          ) : listError ? (
            <p className="px-2 py-3 text-xs text-red-300/80">{listError}</p>
          ) : candidates.length === 0 ? (
            <p className="px-2 py-3 text-xs text-white/40">
              Ще немає кандидатів. Створіть першого 👆
            </p>
          ) : (
            <div className="space-y-3">
              {pinnedCandidates.length > 0 && (
                <div>
                  <SidebarLabel>📌 Закріплені</SidebarLabel>
                  <ul className="space-y-1">
                    {pinnedCandidates.map((c) => (
                      <CandidateRow
                        key={c.id}
                        candidate={c}
                        active={selectedId === c.id}
                        pinned
                        onSelect={() => selectCandidate(c.id)}
                        onTogglePin={() => togglePin(c.id)}
                        onDelete={() => deleteCandidate(c.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              <div>
                {pinnedCandidates.length > 0 && (
                  <SidebarLabel>Історія</SidebarLabel>
                )}
                <ul className="space-y-1">
                  {otherCandidates.map((c) => (
                    <CandidateRow
                      key={c.id}
                      candidate={c}
                      active={selectedId === c.id}
                      pinned={false}
                      onSelect={() => selectCandidate(c.id)}
                      onTogglePin={() => togglePin(c.id)}
                      onDelete={() => deleteCandidate(c.id)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ───────── ЦЕНТР: форма або деталі ───────── */}
      <section className="relative flex-1 overflow-y-auto">
        {/* М'які градієнтні акценти на фоні */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-400/15 blur-[100px]" />
          <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 py-8">
          {selectedId === null ? (
            <NewCandidateView
              candidateName={candidateName}
              setCandidateName={setCandidateName}
              jobText={jobText}
              setJobText={setJobText}
              level={level}
              setLevel={setLevel}
              cvFileName={cvFileName}
              cvSize={cvSize}
              dragOver={dragOver}
              setDragOver={setDragOver}
              loading={loading}
              error={error}
              canSubmit={canSubmit}
              fileInputRef={fileInputRef}
              onFile={handleFile}
              onClearFile={clearFile}
              onFillExample={fillExample}
              onSubmit={handleSubmit}
            />
          ) : selected ? (
            <CandidateDetail
              candidate={selected}
              copiedId={copiedId}
              onCopy={copyQuestion}
              rephrasingId={rephrasingId}
              onRephrase={(q) => rephraseQuestion(selected, q)}
              addingType={addingType}
              onAdd={(type) => addQuestion(selected, type)}
              error={error}
            />
          ) : (
            <p className="text-white/50">Кандидата не знайдено.</p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────── Форма нового кандидата ───────────────────── */

function NewCandidateView(props: {
  candidateName: string;
  setCandidateName: (v: string) => void;
  jobText: string;
  setJobText: (v: string) => void;
  level: "easy" | "advanced";
  setLevel: (v: "easy" | "advanced") => void;
  cvFileName: string | null;
  cvSize: number | null;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  loading: boolean;
  error: string | null;
  canSubmit: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File | undefined | null) => void;
  onClearFile: () => void;
  onFillExample: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const {
    candidateName,
    setCandidateName,
    jobText,
    setJobText,
    level,
    setLevel,
    cvFileName,
    cvSize,
    dragOver,
    setDragOver,
    loading,
    error,
    canSubmit,
    fileInputRef,
    onFile,
    onClearFile,
    onFillExample,
    onSubmit,
  } = props;

  return (
    <>
      <section className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Powered by Claude Opus 4.8
        </span>
        <h1 className="bg-gradient-to-br from-white to-white/50 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          Новий кандидат
        </h1>
        <p className="mx-auto max-w-xl leading-relaxed text-white/60">
          Завантажте резюме у PDF та вставте опис вакансії — Claude згенерує
          глибокі питання для співбесіди з підказками інтерв'юеру.
        </p>
      </section>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-white/80">
            Ім'я кандидата
          </label>
          <button
            type="button"
            onClick={onFillExample}
            className="text-xs text-amber-300/80 underline-offset-2 hover:text-amber-200 hover:underline"
          >
            Підставити приклад
          </button>
        </div>

        <input
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Напр., Олена Коваленко"
          disabled={loading}
          className="-mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Резюме (PDF)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => onFile(e.target.files?.[0])}
            />

            {cvFileName ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3.5">
                <DocIcon className="h-8 w-8 flex-shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/90">
                    {cvFileName}
                  </p>
                  <p className="text-xs text-white/50">
                    {cvSize !== null ? formatSize(cvSize) : "PDF"} · готово
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearFile}
                  disabled={loading}
                  title="Прибрати файл"
                  className="flex-shrink-0 rounded-md px-2 py-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-[188px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
                  dragOver
                    ? "border-amber-400/70 bg-amber-400/10"
                    : "border-white/20 bg-black/20 hover:border-white/40"
                }`}
              >
                <DocIcon className="h-9 w-9 text-white/40" />
                <p className="text-sm text-white/70">
                  Перетягніть PDF сюди або{" "}
                  <span className="text-amber-300">оберіть файл</span>
                </p>
                <p className="text-xs text-white/30">Тільки .pdf</p>
              </div>
            )}
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
              className="h-[188px] w-full resize-y rounded-lg border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-white/30 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Перемикач рівня складності */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">
            Рівень складності
          </label>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/20 p-1 sm:grid-cols-2">
            <LevelOption
              active={level === "easy"}
              disabled={loading}
              onClick={() => setLevel("easy")}
              title="Легкий (Скринінг)"
              desc="Прості класичні питання — ідеально для першої розмови та нетехнічних ролей"
            />
            <LevelOption
              active={level === "advanced"}
              disabled={loading}
              onClick={() => setLevel("advanced")}
              title="Просунутий (STAR / Кейси)"
              desc="Глибокі поведінкові питання та мікро-сценарії під вакансію"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
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

      {error && <ErrorAlert message={error} />}
    </>
  );
}

/* ───────────────────── Деталі кандидата ───────────────────── */

function CandidateDetail({
  candidate,
  copiedId,
  onCopy,
  rephrasingId,
  onRephrase,
  addingType,
  onAdd,
  error,
}: {
  candidate: Candidate;
  copiedId: number | null;
  onCopy: (q: Question) => void;
  rephrasingId: number | null;
  onRephrase: (q: Question) => void;
  addingType: "technical" | "soft" | null;
  onAdd: (type: "technical" | "soft") => void;
  error: string | null;
}) {
  const questions = candidate.questions ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {candidate.name}
          </h1>
          <span className="text-sm text-white/40">
            {formatDate(candidate.createdAt)}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
          <DocIcon className="h-5 w-5 text-amber-300" />
          <span className="text-white/80">
            {pdfNameFromCvText(candidate.cvText)}
          </span>
        </div>
      </header>

      {/* Вакансія */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
          Вакансія
        </h2>
        <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/80">
          {candidate.jobText}
        </div>
      </section>

      {error && <ErrorAlert message={error} />}

      {/* Питання */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Питання для співбесіди{" "}
          <span className="text-white/40">({questions.length})</span>
        </h2>

        {questions.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
            Для цього кандидата немає збережених питань.
          </p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id ?? i}
                question={q}
                index={i}
                copied={copiedId === q.id}
                onCopy={() => onCopy(q)}
                rephrasing={rephrasingId === q.id}
                onRephrase={() => onRephrase(q)}
              />
            ))}
          </ul>
        )}

        {/* Додавання нових питань */}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <AddQuestionButton
            tone="technical"
            loading={addingType === "technical"}
            disabled={addingType !== null}
            onClick={() => onAdd("technical")}
          />
          <AddQuestionButton
            tone="soft"
            loading={addingType === "soft"}
            disabled={addingType !== null}
            onClick={() => onAdd("soft")}
          />
        </div>
      </section>
    </div>
  );
}

function AddQuestionButton({
  tone,
  loading,
  disabled,
  onClick,
}: {
  tone: "technical" | "soft";
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const cls =
    tone === "technical"
      ? "border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20";
  const label =
    tone === "technical"
      ? "Згенерувати 3 технічних питання"
      : "Згенерувати 3 софтових питання";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {loading ? <MiniSpinner /> : <span className="text-base leading-none">➕</span>}
      {label}
    </button>
  );
}

function QuestionCard({
  question,
  index,
  copied,
  onCopy,
  rephrasing,
  onRephrase,
}: {
  question: Question;
  index: number;
  copied: boolean;
  onCopy: () => void;
  rephrasing: boolean;
  onRephrase: () => void;
}) {
  return (
    <li
      style={{ animationDelay: `${index * 60}ms` }}
      className="animate-fade-up rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xs font-medium text-white/30">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p
            className={`text-sm leading-relaxed transition-opacity ${
              rephrasing ? "text-white/40" : "text-white/90"
            }`}
          >
            {question.text}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            onClick={onRephrase}
            disabled={rephrasing}
            title="Перефразувати питання"
            className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-60"
          >
            {rephrasing ? <MiniSpinner /> : <span>🔄</span>}
            <span className="hidden sm:inline">Перефразувати</span>
          </button>
          <button
            onClick={onCopy}
            title="Скопіювати питання"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            {copied ? "Скопійовано ✓" : "Копіювати"}
          </button>
        </div>
      </div>

      <div className="mt-2 pl-8">
        <TypeBadge type={question.type} />
      </div>

      {question.followUp && (
        <div className="mt-3 ml-8 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] p-3 text-sm text-amber-100/90">
          <span className="text-base leading-none">💡</span>
          <p className="leading-relaxed">
            <span className="font-medium text-amber-200">
              Підказка інтерв'юеру:{" "}
            </span>
            {question.followUp}
          </p>
        </div>
      )}
    </li>
  );
}

/* ───────────────────── Дрібні компоненти ───────────────────── */

function ErrorAlert({ message }: { message: string }) {
  return (
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
        <p className="text-red-200/80">{message}</p>
      </div>
    </div>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-white/30">
      {children}
    </div>
  );
}

function CandidateRow({
  candidate,
  active,
  pinned,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  candidate: Candidate;
  active: boolean;
  pinned: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative">
      <button
        onClick={onSelect}
        className={`w-full rounded-lg px-3 py-2.5 pr-16 text-left transition-colors ${
          active ? "bg-white/10" : "hover:bg-white/[0.06]"
        }`}
      >
        <p className="truncate text-sm font-medium text-white/90">
          {candidate.name}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-white/40">
          <span>{formatDate(candidate.createdAt)}</span>
          <span>·</span>
          <span>{candidate.questions?.length ?? 0} пит.</span>
        </p>
      </button>

      {/* Кнопки-дії: pinned завжди видно, решта — на hover */}
      <div
        className={`absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity ${
          pinned
            ? "opacity-100"
            : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={pinned ? "Відкріпити" : "Закріпити"}
          className={`rounded-md p-1.5 transition-colors hover:bg-white/10 ${
            pinned ? "text-amber-300" : "text-white/50 hover:text-white"
          }`}
        >
          <PinIcon className="h-3.5 w-3.5" filled={pinned} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Видалити"
          className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-red-500/15 hover:text-red-300"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function PinIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function LevelOption({
  active,
  disabled,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-lg border px-3.5 py-3 text-left transition-colors disabled:opacity-50 ${
        active
          ? "border-amber-400/50 bg-amber-400/15"
          : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
            active ? "border-amber-300" : "border-white/30"
          }`}
        >
          {active && <span className="h-2 w-2 rounded-full bg-amber-300" />}
        </span>
        <span className="text-sm font-medium text-white/90">{title}</span>
      </div>
      <p className="mt-1 pl-6 text-xs leading-relaxed text-white/50">{desc}</p>
    </button>
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

  const label = isTechnical ? "Technical" : isSoft ? "Soft skill" : type || "—";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
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

function Spinner() {
  return (
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
  );
}
