'use client'

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import MainLayout from "@/components/MainLayout"
import MatchesView from "@/components/matches/MatchesView"
import Loader from "@/components/Loader"

export default function MatchesPage() {
  const { user, profile, loading, profileComplete } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!profileComplete || !profile) {
      router.replace("/user-onboarding")
    }
  }, [user, profile, profileComplete, loading, router])

  if (loading) {
    return <Loader message="Loading matches..." />
  }

  if (!user) {
    return <Loader message="Redirecting to login..." />
  }

  if (!profileComplete || !profile) {
    return <Loader message="Redirecting to onboarding..." />
  }

  return (
    <MainLayout
      user={user}
      activeTab="matches"
      profile={profile}
      onTabChange={(tab) => {
        if (tab === "matches") return
        router.push(tab === "message" ? "/message" : `/${tab}`)
      }}
    >
      <MatchesView
        currentUser={user}
        currentProfile={profile}
        onStartChat={(target) => {
          router.push(`/message?uid=${target.uid}`)
        }}
      />
    </MainLayout>
  )
}
