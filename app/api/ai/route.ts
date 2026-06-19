import { NextRequest } from "next/server";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
// Якщо захочеш закрити AI за авторизацією — розкоментуй:
// import { auth } from "@/lib/auth";

// Anthropic SDK потребує Node.js runtime (не Edge).
export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  // --- (опціонально) захист маршруту авторизацією ---
  // const session = await auth();
  // if (!session) {
  //   return Response.json({ error: "Unauthorized" }, { status: 401 });
  // }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY не налаштовано на сервері." },
      { status: 500 },
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("empty");
    }
  } catch {
    return Response.json(
      { error: "Очікується { messages: [{ role, content }] }" },
      { status: 400 },
    );
  }

  // Стрімимо відповідь токенами — UX швидший, без таймаутів на довгих відповідях.
  const stream = anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: 1024,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
