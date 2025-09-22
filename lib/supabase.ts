import { createClient } from "@supabase/supabase-js"

// Provide fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

// Only create the client if we have real credentials
export const supabase = supabaseUrl.includes("placeholder") ? null : createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions with null checks
export const signUp = async (email: string, password: string, userData?: any) => {
  if (!supabase) {
    throw new Error("Supabase not configured")
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error("Supabase not configured")
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error("Supabase not configured")
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signOut = async () => {
  if (!supabase) {
    throw new Error("Supabase not configured")
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  if (!supabase) {
    return { user: null, error: new Error("Supabase not configured") }
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}
