import type { Metadata } from "next"
import {  Inter, Fira_Mono } from "next/font/google"
import "./globals.css"
import ClientBody from "./ClientBody"

// ✅ Import server-side Supabase client
import { createSSRClient } from "@/utils/supabase/server"
import { AuthProvider } from "@/providers/AuthProvider"

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Fira_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: "400"
})

export const metadata: Metadata = {
  title: "Pentriarch AI",
  description: "AI-powered security analysis",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // ✅ Get user from Supabase (server-side)
  const supabase = await createSSRClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        {/* ✅ Wrap in AuthProvider */}
        <AuthProvider initialUser={user}>
          <ClientBody>{children}</ClientBody>
        </AuthProvider>
      </body>
    </html>
  )
}
