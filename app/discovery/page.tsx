'use client'

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import MainLayout from "@/components/MainLayout"
import DiscoveryView from "@/components/discovery/DiscoveryView"
import Loader from "@/components/Loader"

export default function DiscoveryPage() {
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
    return <Loader message="Loading discovery..." />
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
      activeTab="discovery"
      profile={profile}
      onTabChange={(tab) => {
        if (tab === "discovery") return
        router.push(tab === "message" ? "/message" : `/${tab}`)
      }}
    >
      <DiscoveryView
        currentUser={user}
        currentProfile={profile}
        onStartChat={(target) => {
          router.push(`/message?uid=${target.uid}`)
        }}
      />
    </MainLayout>
  )
}
