import { NextRequest } from "next/server";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Question = {
  id: number;
  text: string;
  type: string;
  followUp: string;
};

function extractJson(raw: string): string {
  let t = raw.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (m) t = m[1].trim();
  return t;
}

// POST /api/add-custom-question — генерує ОДНЕ нове унікальне питання заданого
// типу для кандидата і ДОПИСУЄ його в запис Prisma.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY не налаштовано на сервері." },
      { status: 500 },
    );
  }

  let candidateId: string;
  let type: "technical" | "soft";
  let level: "easy" | "advanced" = "advanced";
  let candidateName = "";
  let jobText = "";
  let cvTextOrMarker = "";
  try {
    const body = await req.json();
    if (typeof body.candidateId !== "string" || !body.candidateId.trim()) {
      throw new Error("invalid");
    }
    candidateId = body.candidateId;
    type = body.type === "soft" ? "soft" : "technical";
    level = body.level === "easy" ? "easy" : "advanced";
    if (typeof body.candidateName === "string") candidateName = body.candidateName;
    if (typeof body.jobText === "string") jobText = body.jobText;
    if (typeof body.cvTextOrMarker === "string")
      cvTextOrMarker = body.cvTextOrMarker;
  } catch {
    return Response.json(
      {
        error:
          "Очікується { candidateId, type, level?, candidateName?, jobText?, cvTextOrMarker? }",
      },
      { status: 400 },
    );
  }

  // Перевіряємо, що кандидат належить поточному користувачу
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, userId: session.user.id },
    select: { id: true, questions: true },
  });
  if (!candidate) {
    return Response.json({ error: "Кандидата не знайдено" }, { status: 404 });
  }

  const existing: Question[] = Array.isArray(candidate.questions)
    ? (candidate.questions as unknown as Question[])
    : [];
  const existingTexts = existing.map((q) => q.text).filter(Boolean);
  const nextId =
    existing.reduce((max, q) => Math.max(max, q.id ?? 0), 0) + 1;

  const typeLabel =
    type === "soft"
      ? "soft-skill (комунікація, командна робота, лідерство, поведінка)"
      : "technical (хард-скіли, технології, інструменти, архітектура)";
  const followUpRule =
    level === "easy"
      ? `Поле "followUp" може бути порожнім рядком.`
      : `Додай корисний "followUp" — навідне підпитання для інтерв'юера.`;

  const system = `Ти — досвідчений IT-рекрутер. Згенеруй РІВНО 3 нових питання для співбесіди типу "${type}" — ${typeLabel}. Пиши простою, живою людською мовою під цю вакансію та кандидата. ${followUpRule}

ВАЖЛИВО: усі 3 питання мають бути УНІКАЛЬНИМИ — не повторювати (навіть за змістом) одне одного та наведені наявні питання.

Поверни результат СУВОРО у форматі JSON-масиву з рівно 3 елементами, без пояснень і без markdown-обгортки:
{ "questions": [ { "text": "питання", "type": "${type}", "followUp": "навідне підпитання або порожній рядок" }, { "text": "питання", "type": "${type}", "followUp": "..." }, { "text": "питання", "type": "${type}", "followUp": "..." } ] }`;

  const userContent = `Кандидат: ${candidateName || "—"}
Резюме (довідково): ${cvTextOrMarker || "—"}

Опис вакансії:
${jobText || "—"}

Наявні питання (НЕ повторюй їх):
${existingTexts.length ? existingTexts.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(поки немає)"}`;

  let newQuestions: Question[];
  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    const parsed = JSON.parse(extractJson(rawText)) as { questions?: unknown };
    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Очікувався об'єкт виду { questions: [...] }");
    }

    newQuestions = parsed.questions
      .map((q: unknown) => {
        const item = (q ?? {}) as Record<string, unknown>;
        return {
          text: typeof item.text === "string" ? item.text.trim() : "",
          type:
            item.type === "soft" || item.type === "technical"
              ? item.type
              : type,
          followUp: typeof item.followUp === "string" ? item.followUp : "",
        };
      })
      .filter((q) => q.text)
      .slice(0, 3)
      .map((q, i) => ({ ...q, id: nextId + i }));

    if (newQuestions.length === 0) throw new Error("no questions");
  } catch (err) {
    console.error("add-custom-question: AI/parse error", err);
    return Response.json(
      { error: "Не вдалося згенерувати питання. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  // Дописуємо всі нові питання в БД
  try {
    const updated = [...existing, ...newQuestions];
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { questions: updated },
    });
    return Response.json({ questions: newQuestions });
  } catch (err) {
    console.error("add-custom-question: DB error", err);
    return Response.json(
      { error: "Питання згенеровано, але не вдалося зберегти." },
      { status: 500 },
    );
  }
}
