"use client";

import { useEffect } from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure dark mode and proper styling
  useEffect(() => {
    // Force dark mode for consistency
    document.documentElement.classList.add('dark');

    // Remove any extension-added classes and ensure our gradient background
    document.body.className = "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 antialiased";
  }, []);

  return (
    <>
      {children}
    </>
  );
}
