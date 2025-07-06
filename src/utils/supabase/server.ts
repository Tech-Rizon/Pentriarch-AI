<<<<<<< HEAD
// src/utils/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createSSRClient = async () => {
  const cookieStore = await cookies() // ⬅️ Now awaited

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),

        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
=======
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Create a server client that's compatible with both App Router and Pages Router
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        // Return empty array for server-side rendering
        return []
      },
      setAll(cookiesToSet) {
        // No-op for server-side rendering during build
        // Cookies will be handled by middleware
      },
    },
  });
};

// Alternative client that works with request/response
export const createClientWithRequest = (request: NextRequest) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Handle cookies in middleware instead
      },
    },
  });
};
>>>>>>> 640bda3 (Update v1.7.0)
