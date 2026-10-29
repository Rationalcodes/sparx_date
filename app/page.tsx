'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DiscoveryView from "@/components/discovery/DiscoveryView"
import MatchesView from "@/components/matches/MatchesView"
import MessageView from "@/components/message/MessageView"
import ProfileView from "@/components/profile/ProfileView"
import Loader from "@/components/Loader"
import MainLayout from "@/components/MainLayout"
import { useActiveTab } from "@/hooks/useActiveTab"
import { useAuth } from "@/context/AuthContext"

export default function Home() {
  const { user, profile, loading, profileComplete } = useAuth()
  const [activeTab, setActiveTab] = useActiveTab("activeTab", "discovery")
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/login")
      return
    }

    if (!profileComplete) {
      router.replace("/user-onboarding")
    }
  }, [user, profileComplete, loading, router])

  if (loading) {
    return <Loader message="Checking authentication..." />
  }

  if (!user) {
    return <Loader message="Redirecting to login..." />
  }

  if (!profileComplete || !profile) {
    return <Loader message="Redirecting to profile setup..." />
  }

  const handleOpenChatWithUser = (targetUser: any) => {
    setSelectedChatUser(targetUser)
    setActiveTab("message")
  }

  return (
    <MainLayout
      user={user}
      activeTab={activeTab}
      profile={profile}
      onTabChange={setActiveTab}
    >
      {activeTab === "message" || activeTab === "messages" ? (
        <MessageView
          currentUser={user}
          currentProfile={profile}
          initialChatUser={selectedChatUser}
          onClearInitialChat={() => setSelectedChatUser(null)}
        />
      ) : activeTab === "discovery" ? (
        <DiscoveryView
          currentUser={user}
          currentProfile={profile}
          onStartChat={handleOpenChatWithUser}
        />
      ) : activeTab === "matches" ? (
        <MatchesView
          currentUser={user}
          currentProfile={profile}
          onStartChat={handleOpenChatWithUser}
        />
      ) : activeTab === "profile" ? (
        <ProfileView
          currentUser={user}
          currentProfile={profile}
        />
      ) : null}
    </MainLayout>
  )
}
