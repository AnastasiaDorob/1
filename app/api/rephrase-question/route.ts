import { NextRequest } from "next/server";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function extractJson(raw: string): string {
  let t = raw.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (m) t = m[1].trim();
  return t;
}

// POST /api/rephrase-question — перефразовує питання, повертає { text, followUp }.
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

  let questionText: string;
  let level: "easy" | "advanced" = "advanced";
  try {
    const body = await req.json();
    if (typeof body.questionText !== "string" || !body.questionText.trim()) {
      throw new Error("invalid");
    }
    questionText = body.questionText;
    level = body.level === "easy" ? "easy" : "advanced";
  } catch {
    return Response.json(
      { error: "Очікується { questionText: string, level?: 'easy'|'advanced' }" },
      { status: 400 },
    );
  }

  const tone =
    level === "easy"
      ? `Перефразуй це питання для співбесіди ще простішою, живою людською мовою, зберігши його суть. Поле "followUp" може бути порожнім рядком.`
      : `Перефразуй це питання для співбесіди іншими словами — живою людською мовою, зберігши його глибину й суть. Додай корисний "followUp" — навідне підпитання для інтерв'юера.`;

  const system = `Ти — досвідчений IT-рекрутер. ${tone}

Поверни результат СУВОРО у форматі JSON, без пояснень і без markdown-обгортки:
{ "text": "перефразоване питання", "followUp": "навідне підпитання або порожній рядок" }`;

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      system,
      messages: [
        { role: "user", content: `Оригінальне питання: ${questionText}` },
      ],
    });

    const rawText = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    const parsed = JSON.parse(extractJson(rawText)) as {
      text?: unknown;
      followUp?: unknown;
    };
    const text =
      typeof parsed.text === "string" && parsed.text.trim()
        ? parsed.text
        : questionText;
    const followUp =
      typeof parsed.followUp === "string" ? parsed.followUp : "";

    return Response.json({ text, followUp });
  } catch (err) {
    console.error("rephrase-question: error", err);
    return Response.json(
      { error: "Не вдалося перефразувати питання. Спробуйте ще раз." },
      { status: 502 },
    );
  }
}
