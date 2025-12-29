import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Create a response object
  let response = NextResponse.next()

  // Create Supabase client with cookie handling for PKCE
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies on the response
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: This line is CRITICAL for PKCE to work
  // It refreshes the session and stores PKCE code verifier in cookies
  await supabase.auth.getSession()

  // Return the response with updated cookies
  return response
}

export const config = {
  matcher: [
    // Include auth callback in matcher for PKCE
    '/auth/callback',
    '/dashboard/:path*',
    '/driver/:path*',
    '/admin/:path*',
    // Also match root for session refresh
    '/',
  ],
}