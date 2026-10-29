'use client'

import { useAuth } from "@/context/AuthContext"
import type { UserProfile } from "@/lib/types"

interface UserProfileResult {
  profile: UserProfile | null
  rawProfile: Partial<UserProfile> | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useUserProfile(userId?: string): UserProfileResult {
  const { profile, rawProfile, loading, refreshProfile } = useAuth()
  return {
    profile,
    rawProfile,
    loading,
    error: null,
    refresh: refreshProfile,
  }
}
