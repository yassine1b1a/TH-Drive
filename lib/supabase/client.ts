import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )
}

// Helper function to get session with verification check
export async function getVerifiedSession() {
  try {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error.message)
      return { session: null, verified: false, error }
    }
    
    if (!session) {
      return { session: null, verified: false, error: null }
    }

    // Check if user is verified
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Get user error:', userError.message)
      return { session, verified: false, error: userError }
    }

    return { 
      session, 
      verified: !!user?.email_confirmed_at,
      user,
      error: null 
    }
  } catch (error) {
    console.error('Unexpected error getting session:', error)
    return { session: null, verified: false, error }
  }
}

export async function getUser() {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Get user error:', error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unexpected error getting user:', error)
    return null
  }
}

export async function signOut() {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error.message)
      return { success: false, error }
    }
    
    // Clear any stored emails
    if (typeof window !== 'undefined') {
      localStorage.removeItem('unverified_email')
    }
    
    return { success: true }
  } catch (error) {
    console.error('Unexpected sign out error:', error)
    return { success: false, error }
  }
}

// Helper to resend verification
export async function resendVerificationEmail(email: string) {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    return { success: !error, error }
  } catch (error) {
    console.error('Resend verification error:', error)
    return { success: false, error }
  }
}