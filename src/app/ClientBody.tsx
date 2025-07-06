"use client";

import { useEffect } from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
<<<<<<< HEAD
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return <div className="antialiased">{children}</div>;
=======
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
>>>>>>> 640bda3 (Update v1.7.0)
}
