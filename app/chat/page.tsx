import { Chat } from "@/components/Chat";

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">AI Chat</h1>
      <p className="text-sm text-white/60">
        Повідомлення йдуть на <code>/api/ai</code>, сервер додає ключ і стрімить
        відповідь Claude назад.
      </p>
      <Chat />
    </div>
  );
}
