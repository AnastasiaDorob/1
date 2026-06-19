import Anthropic from "@anthropic-ai/sdk";

// Цей модуль імпортується ВИКЛЮЧНО з серверного коду (route handlers).
// Ключ ANTHROPIC_API_KEY ніколи не потрапляє в клієнтський бандл.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Модель за замовчуванням. Можна винести в env, якщо треба перемикати.
export const AI_MODEL = "claude-opus-4-8";
