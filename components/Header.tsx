import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { BrandLogo } from "@/components/Logo";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b border-white/10">
      <nav className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="HireIQ — на головну">
          <BrandLogo />
        </Link>

        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/60 sm:inline">
              {user.name ?? user.email}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-200">
              {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                Вийти
              </button>
            </form>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
