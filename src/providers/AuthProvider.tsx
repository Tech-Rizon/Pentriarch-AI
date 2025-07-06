// src/providers/AuthProvider.tsx
"use client"

<<<<<<< HEAD
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
=======
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
>>>>>>> 640bda3 (Update v1.7.0)
import { createClient } from "@/utils/supabase/client"
import type { Session, User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const AuthProvider = ({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: User | null
}) => {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(!initialUser) // if already provided, no loading

  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    setLoading(false)
    return () => subscription.unsubscribe()
  }, [supabase])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
