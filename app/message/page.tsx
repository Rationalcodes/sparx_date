'use client'

import React, { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import MainLayout from "@/components/MainLayout"
import MessageView from "@/components/message/MessageView"
import Loader from "@/components/Loader"

function MessagePageContent() {
  const { user, profile, loading, profileComplete } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUid = searchParams ? searchParams.get("uid") : null

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
    return <Loader message="Loading messages..." />
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
      activeTab="message"
      profile={profile}
      onTabChange={(tab) => {
        if (tab === "message") return
        router.push(tab === "discovery" ? "/" : `/${tab}`)
      }}
    >
      <MessageView
        currentUser={user}
        currentProfile={profile}
        initialChatUser={targetUid ? ({ uid: targetUid, name: "Match" } as any) : null}
      />
    </MainLayout>
  )
}

export default function MessagePage() {
  return (
    <Suspense fallback={<Loader message="Loading conversation..." />}>
      <MessagePageContent />
    </Suspense>
  )
}
