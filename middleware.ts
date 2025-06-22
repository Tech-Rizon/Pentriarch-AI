import { createClient } from '@/utils/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Public routes accessible without login
const PUBLIC_ROUTES = [
  '/',                // Home
  '/auth',            // Login/Register
  '/docs',            // Public documentation
  '/privacy',         // Privacy policy
  '/terms',           // Terms and conditions
  '/api/health',      // API status or uptime
  '/unauthorized',    // Fallback for denied access
  '/invite',          // Optional invite-only flow
]

// ✅ Role-based protected routes
const ROLE_PROTECTED_ROUTES: { path: string; allowedRoles: string[] }[] = [
  { path: '/settings', allowedRoles: ['admin'] },
  { path: '/admin', allowedRoles: ['admin'] },
  { path: '/dashboard', allowedRoles: ['admin', 'user'] },
]

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // ✅ Check if current route is public
    const isPublic = PUBLIC_ROUTES.some((path) =>
      pathname === path || pathname.startsWith(path + '/')
    )

    // ✅ Create Supabase client bound to request cookies
    const { supabase, response } = createClient(request)

    // ✅ Refresh the session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // ✅ If user is not logged in and visiting a protected route, redirect
    if (!user && !isPublic) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // ✅ Role-based route protection
    if (user) {
      const matched = ROLE_PROTECTED_ROUTES.find(({ path }) =>
        pathname === path || pathname.startsWith(path + '/')
      )

      if (matched) {
        const role = user.user_metadata?.role || 'guest'
        const isAllowed = matched.allowedRoles.includes(role)

        if (!isAllowed) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
    }

    // ✅ All good
    return response
  } catch (e) {
    console.error('🛑 Supabase middleware error:', e)
    return new Response('Internal Server Error', { status: 500 })
  }
}

// ✅ Apply to all except static/image assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
