import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pentriarch AI - Advanced Penetration Testing Platform",
  description:
    "AI-powered penetration testing platform with advanced security analysis and automated vulnerability detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const interClass = inter?.variable ?? '';
  const jetbrainsMonoClass = jetbrainsMono?.variable ?? '';

  return (
    <html lang="en" className={`${interClass} ${jetbrainsMonoClass} dark`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 antialiased">
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
