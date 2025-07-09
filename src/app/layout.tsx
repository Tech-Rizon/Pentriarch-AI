import type { Metadata, Viewport } from "next";
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
  icons: [
    { rel: "icon", url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
    { rel: "icon", url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
    { rel: "icon", url: "/favicon-256x256.png", sizes: "256x256", type: "image/png" },
    { rel: "shortcut icon", url: "/favicon-64x64.png", type: "image/png" },
  ],
};

// ✅ Move viewport to its own export (Next.js 15+ requirement)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const interClass = inter?.variable || "";
  const jetbrainsMonoClass = jetbrainsMono?.variable || "";

  return (
    <html lang="en" className={`${interClass} ${jetbrainsMonoClass} dark`}>
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 antialiased">
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
