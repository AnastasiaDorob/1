import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/candidates/[id] — видаляє кандидата поточного користувача.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // deleteMany з фільтром за userId гарантує, що видалити можна лише СВОГО
    // кандидата (чужий id просто дасть count 0, без помилки).
    const result = await prisma.candidate.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (result.count === 0) {
      return Response.json(
        { error: "Кандидата не знайдено" },
        { status: 404 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("candidates DELETE: DB error", err);
    return Response.json(
      { error: "Не вдалося видалити кандидата." },
      { status: 500 },
    );
  }
}
