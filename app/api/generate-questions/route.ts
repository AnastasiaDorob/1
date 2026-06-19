import { NextRequest } from "next/server";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Anthropic SDK + Prisma потребують Node.js runtime (не Edge).
export const runtime = "nodejs";

// Системний промт згідно з ТЗ. Просимо суворо JSON заданої форми.
const SYSTEM_PROMPT = `Ти досвідчений IT-рекрутер. Твоє завдання — порівняти резюме кандидата та вакансію, знайти невідповідності або зони для перевірки та згенерувати 5-7 точкових, глибоких питань для технічного або софт-скіл інтерв'ю. Поверни результат суворо у форматі JSON: об'єкт із масивом об'єктів { questions: [ { id: 1, text: "питання", type: "technical/soft" } ] }`;

type GenerateQuestionsBody = {
  cvBase64?: unknown;
  cvFileName?: unknown;
  jobText?: unknown;
  candidateName?: unknown;
};

type GeneratedQuestion = {
  id: number;
  text: string;
  type: string;
};

type GeneratedResult = {
  questions: GeneratedQuestion[];
};

// Дістаємо id поточного користувача. Якщо сесія ще не налаштована —
// тимчасово використовуємо тестового користувача (за ТЗ).
async function resolveUserId(): Promise<string> {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (email) {
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: session.user?.name ?? null },
      });
      return user.id;
    }
  } catch {
    // auth ще не налаштований (немає AUTH_SECRET тощо) — падаємо на тестового користувача
  }

  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", name: "Test User" },
  });
  return testUser.id;
}

// Витягуємо текст із відповіді Claude і парсимо JSON (з підстраховкою на ```json-обгортку).
function parseQuestions(rawText: string): GeneratedResult {
  let text = rawText.trim();

  // Прибираємо markdown-обгортку ```json ... ```, якщо модель її додала.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(text) as GeneratedResult;
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error("Очікувався об'єкт виду { questions: [...] }");
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY не налаштовано на сервері." },
      { status: 500 },
    );
  }

  // --- 1. Валідація вхідних даних ---
  let cvBase64: string;
  let cvFileName: string;
  let jobText: string;
  let candidateName: string;
  try {
    const body = (await req.json()) as GenerateQuestionsBody;
    if (
      typeof body.cvBase64 !== "string" ||
      typeof body.jobText !== "string" ||
      typeof body.candidateName !== "string" ||
      !body.cvBase64.trim() ||
      !body.jobText.trim() ||
      !body.candidateName.trim()
    ) {
      throw new Error("invalid");
    }
    // Приймаємо як чистий base64, так і data-URL ("data:application/pdf;base64,...").
    cvBase64 = body.cvBase64.includes("base64,")
      ? body.cvBase64.slice(body.cvBase64.indexOf("base64,") + "base64,".length)
      : body.cvBase64;
    cvBase64 = cvBase64.replace(/\s/g, ""); // PDF base64 має бути без пробілів/переносів
    cvFileName =
      typeof body.cvFileName === "string" && body.cvFileName.trim()
        ? body.cvFileName.trim()
        : "resume.pdf";
    jobText = body.jobText;
    candidateName = body.candidateName;
  } catch {
    return Response.json(
      {
        error:
          "Очікується { cvBase64: string (PDF), cvFileName?: string, jobText: string, candidateName: string }",
      },
      { status: 400 },
    );
  }

  // --- 2. Запит до Claude ---
  let result: GeneratedResult;
  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            // Резюме передаємо як PDF-документ напряму в Anthropic API.
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: cvBase64,
              },
            },
            {
              type: "text",
              text: `Ім'я кандидата: ${candidateName}\n\nРезюме кандидата — у прикріпленому PDF-документі вище.\n\n=== ОПИС ВАКАНСІЇ ===\n${jobText}\n\nПорівняй резюме з вакансією та згенеруй питання у вказаному JSON-форматі. Поверни ЛИШЕ JSON, без пояснень.`,
            },
          ],
        },
      ],
    });

    const rawText = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");

    result = parseQuestions(rawText);
  } catch (err) {
    console.error("generate-questions: AI/parse error", err);
    return Response.json(
      { error: "Не вдалося згенерувати питання. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  // --- 3. Збереження в БД через Prisma ---
  try {
    const userId = await resolveUserId();
    const candidate = await prisma.candidate.create({
      data: {
        userId,
        name: candidateName,
        // Текст резюме тепер у PDF; у БД зберігаємо маркер із назвою файлу.
        cvText: `[PDF] ${cvFileName}`,
        jobText,
        questions: result.questions,
      },
    });

    // --- 4. Повертаємо результат на фронтенд ---
    return Response.json({
      candidateId: candidate.id,
      questions: result.questions,
    });
  } catch (err) {
    console.error("generate-questions: DB error", err);
    return Response.json(
      { error: "Питання згенеровано, але не вдалося зберегти в базу." },
      { status: 500 },
    );
  }
}
