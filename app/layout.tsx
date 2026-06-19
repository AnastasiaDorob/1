import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "HireIQ — Професійна AI-платформа для інтерв'ю",
  description:
    "Автоматичний аналіз PDF-резюме та генерація точкових питань за методологіями STAR та скринінгу на базі Claude API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
