'use client'

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import MainLayout from "@/components/MainLayout"
import ProfileView from "@/components/profile/ProfileView"
import Loader from "@/components/Loader"

export default function ProfilePage() {
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
    return <Loader message="Loading profile..." />
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
      activeTab="profile"
      profile={profile}
      onTabChange={(tab) => {
        if (tab === "profile") return
        router.push(tab === "discovery" ? "/" : tab === "message" ? "/message" : `/${tab}`)
      }}
    >
      <ProfileView
        currentUser={user}
        currentProfile={profile}
      />
    </MainLayout>
  )
}
