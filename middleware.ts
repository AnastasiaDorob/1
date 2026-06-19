// Місце під захист маршрутів авторизацією.
//
// Розкоментуй, щоб закрити /chat (та інші) для неавторизованих:
//
// export { auth as middleware } from "@/lib/auth";
//
// export const config = {
//   matcher: ["/chat/:path*"],
// };

// Поки що middleware ні на що не впливає — заглушка, щоб структура була на місці.
export function middleware() {}

export const config = {
  matcher: [],
};
