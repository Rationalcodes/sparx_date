'use client'

import React, { useState, useEffect } from "react"
import type { ReactNode } from "react"
import type { User } from "firebase/auth"
import type { UserProfile } from "@/lib/types"
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Flame,
  Heart,
  MessageCircle,
  User as UserIcon,
  LogOut,
  Sparkles,
  MapPin,
} from "lucide-react"

interface MainLayoutProps {
  user: User
  activeTab: string
  profile: UserProfile
  onTabChange: (tab: string) => void
  children: ReactNode
}

export default function MainLayout({
  user,
  activeTab,
  profile,
  onTabChange,
  children,
}: MainLayoutProps) {
  const { logout } = useFirebaseAuth()
  const [unreadMatchesCount, setUnreadMatchesCount] = useState<number>(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0)
  const [totalMatchesCount, setTotalMatchesCount] = useState<number>(0)

  // Normalize active tab (handle 'message' or 'messages')
  const currentTab = activeTab === "messages" ? "message" : activeTab

  // Listen for active matches and calculate NEW matches notification only
  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", user.uid)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.docs.length
      setTotalMatchesCount(total)

      if (typeof window !== "undefined") {
        const seenStr = localStorage.getItem(`spark_seen_matches_${user.uid}`)
        const seenCount = seenStr !== null ? parseInt(seenStr, 10) : total
        
        if (currentTab === "matches") {
          localStorage.setItem(`spark_seen_matches_${user.uid}`, String(total))
          setUnreadMatchesCount(0)
        } else {
          const newCount = Math.max(0, total - seenCount)
          setUnreadMatchesCount(newCount)
        }
      }
    })
    return () => unsubscribe()
  }, [user?.uid, currentTab])

  // Clear matches badge as soon as user opens the Matches tab
  useEffect(() => {
    if (currentTab === "matches" && user?.uid && typeof window !== "undefined") {
      localStorage.setItem(`spark_seen_matches_${user.uid}`, String(totalMatchesCount))
      setUnreadMatchesCount(0)
    }
  }, [currentTab, user?.uid, totalMatchesCount])

  // Listen for unread messages count across user's conversations
  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadTotal = 0
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data()
        if (data.unreadCount && data.unreadCount[user.uid]) {
          unreadTotal += data.unreadCount[user.uid]
        }
      })
      setUnreadMessagesCount(unreadTotal)
    })
    return () => unsubscribe()
  }, [user?.uid])

  const navItems = [
    { id: "discovery", label: "Discover", icon: Flame },
    {
      id: "matches",
      label: "Matches",
      icon: Heart,
      badge: unreadMatchesCount > 0 ? unreadMatchesCount : undefined,
    },
    {
      id: "message",
      label: "Messages",
      icon: MessageCircle,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { id: "profile", label: "Profile", icon: UserIcon },
  ]

  const userAvatar =
    profile?.photos?.[0] || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-pink-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => onTabChange("discovery")}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-white fill-current animate-pulse-soft" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-extrabold text-xl tracking-tight bg-linear-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  Spark
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:block">
                Dating & Matchmaking
              </p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-md">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-linear-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-pink-500/25"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "fill-current" : ""}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                        isActive
                          ? "bg-white text-pink-600"
                          : "bg-pink-600 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Profile & Controls */}
          <div className="flex items-center space-x-3">
            {profile?.location?.city && (
              <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span className="truncate max-w-[120px]">{profile.location.city}</span>
              </div>
            )}

            {/* Profile Avatar Pill */}
            <button
              onClick={() => onTabChange("profile")}
              className="flex items-center space-x-2.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all text-left"
            >
              <div className="relative">
                <img
                  src={userAvatar}
                  alt={profile?.name || "User Avatar"}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-pink-500/50"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline truncate max-w-[100px]">
                {profile?.name || user?.displayName || "My Profile"}
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-4 py-2 flex items-center justify-around safe-area-pb shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive
                  ? "text-pink-500 scale-105"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 text-[10px] w-4 h-4 bg-pink-500 text-white font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium mt-1">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
