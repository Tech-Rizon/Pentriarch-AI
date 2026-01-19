import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
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
  const chatKitEnabled = process.env.NEXT_PUBLIC_CHATKIT_ENABLED === "true";

  return (
    <html lang="en" className={`${interClass} ${jetbrainsMonoClass} dark`}>
      <body className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 antialiased">
        {chatKitEnabled && (
          <Script
            src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
            strategy="afterInteractive"
          />
        )}
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
