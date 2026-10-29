'use client'

import { useAuth } from "@/context/AuthContext"

export function useFirebaseAuth() {
  const { user, loading, logout } = useAuth()
  return { user, loading, logout }
}
