import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-white/10">
      <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          🍳 AI Wok
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/chat" className="hover:text-white/70 transition-colors">
            Chat
          </Link>
          <Link href="/login" className="hover:text-white/70 transition-colors">
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}
