'use client'

import React, { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"
import { getLastSeenText } from "@/lib/common-utils"
import {
  Heart,
  Search,
  MessageCircle,
  MapPin,
  Sparkles,
  Info,
  Briefcase,
  GraduationCap,
  X,
} from "lucide-react"

export interface MatchesViewProps {
  currentUser?: any
  currentProfile?: UserProfile
  onStartChat?: (user: UserProfile) => void
}

function formatMatchDistance(dist?: number, uid?: string): string {
  if (dist === undefined || dist === null) return "Nearby"
  if (dist >= 1.0) return `${Math.round(dist * 10) / 10} km away`
  const seed = (uid || "match").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const realistic = ((seed % 30) + 15) / 10
  return `${realistic.toFixed(1)} km away`
}

export default function MatchesView({
  currentUser,
  currentProfile,
  onStartChat,
}: MatchesViewProps) {
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfileForModal, setSelectedProfileForModal] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!currentUser?.uid) {
      setMatches([])
      setLoading(false)
      return
    }

    const matchesQuery = query(
      collection(db, "matches"),
      where("users", "array-contains", currentUser.uid)
    )

    const unsubscribe = onSnapshot(
      matchesQuery,
      async (snapshot) => {
        const otherUserIds: string[] = []
        snapshot.docs.forEach((d) => {
          const users: string[] = d.data().users || []
          const otherId = users.find((id) => id !== currentUser.uid)
          if (otherId && !otherUserIds.includes(otherId)) {
            otherUserIds.push(otherId)
          }
        })

        const fetchedProfiles: UserProfile[] = []

        for (const uid of otherUserIds) {
          if (uid.startsWith("cloud_user") || uid.startsWith("demo")) continue
          try {
            const userSnap = await getDoc(doc(db, "users", uid))
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile
              if (!data.email?.endsWith("@example.com")) {
                fetchedProfiles.push({ ...data, uid })
              }
            }
          } catch (e) {
            console.error("Error fetching match profile from Firestore:", e)
          }
        }

        setMatches(fetchedProfiles)
        setLoading(false)
      },
      (err) => {
        console.error("Error listening to cloud matches:", err)
        setMatches([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentUser?.uid])

  const filteredMatches = matches.filter((m) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.location?.city?.toLowerCase().includes(q) ||
      m.interests?.some((i) => i.toLowerCase().includes(q))
    )
  })

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <span>Your Matches</span>
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
              {matches.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            People who liked you back! Start a conversation or hear their voice.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, city, interest..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {matches.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Recent Connections</span>
          </h4>
          <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-none">
            {matches.map((match) => (
              <div
                key={match.uid}
                onClick={() => onStartChat && onStartChat(match)}
                className="flex flex-col items-center space-y-1.5 cursor-pointer shrink-0 group"
              >
                <div className="relative p-0.5 rounded-full bg-linear-to-tr from-rose-500 via-pink-500 to-amber-500 group-hover:scale-105 transition-transform shadow-lg shadow-pink-500/20">
                  <img
                    src={
                      match.photos?.[0] ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    }
                    alt={match.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-950"
                  />
                  {match.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 ring-1 ring-slate-900" />
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-pink-400 transition-colors truncate max-w-[72px]">
                  {match.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <div
              key={match.uid}
              className="group relative rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl hover:border-pink-500/50 transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-950">
                <img
                  src={
                    match.photos?.[0] ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600"
                  }
                  alt={match.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-black/30" />

                <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60 text-[11px] flex items-center space-x-1.5 shadow">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      match.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  <span className="text-slate-300 font-medium">
                    {match.isOnline ? "Active" : getLastSeenText(match.lastSeen)}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedProfileForModal(match)}
                  title="View Full Profile"
                  className="absolute top-3 left-3 p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/60 shadow hover:scale-110 transition-transform cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {match.name}
                    </h3>
                    <span className="text-base font-semibold text-slate-400">
                      {match.age}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      {match.location?.city || "Nearby"}{" "}
                      • {formatMatchDistance(match.distance, match.uid)}
                    </span>
                  </div>

                  {match.additionalInfo?.bio && (
                    <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                      {match.additionalInfo.bio}
                    </p>
                  )}

                  {match.interests && match.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {match.interests.slice(0, 3).map((interest) => (
                        <span
                          key={interest}
                          className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/80"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                  <button
                    onClick={() => onStartChat && onStartChat(match)}
                    className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Chat Now</span>
                  </button>

                  <button
                    onClick={() => setSelectedProfileForModal(match)}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full rounded-3xl bg-slate-900/40 border border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h3 className="text-xl font-bold text-white">No matches found</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Try adjusting your search query, or head over to the Discover tab to swipe and like profiles!
          </p>
        </div>
      )}

      {selectedProfileForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 relative animate-scale-in">
            <button
              onClick={() => setSelectedProfileForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-slate-300 hover:text-white z-20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 relative">
              <img
                src={selectedProfileForModal.photos?.[0]}
                alt={selectedProfileForModal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                {selectedProfileForModal.name}, {selectedProfileForModal.age}
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">About</h4>
                <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                  {selectedProfileForModal.additionalInfo?.bio || "No bio provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {selectedProfileForModal.additionalInfo?.jobTitle && (
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-start space-x-2">
                    <Briefcase className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Job</p>
                      <p className="text-slate-400">
                        {selectedProfileForModal.additionalInfo.jobTitle}{" "}
                        {selectedProfileForModal.additionalInfo.company ? `@ ${selectedProfileForModal.additionalInfo.company}` : ""}
                      </p>
                    </div>
                  </div>
                )}
                {selectedProfileForModal.additionalInfo?.university && (
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-start space-x-2">
                    <GraduationCap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Education</p>
                      <p className="text-slate-400">
                        {selectedProfileForModal.additionalInfo.university}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-2">
                  Lifestyle
                </h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedProfileForModal.drinking && (
                    <span className="bg-slate-800 px-3 py-1 rounded-xl text-slate-300 border border-slate-700">
                      🍷 {selectedProfileForModal.drinking}
                    </span>
                  )}
                  {selectedProfileForModal.smoking && (
                    <span className="bg-slate-800 px-3 py-1 rounded-xl text-slate-300 border border-slate-700">
                      🚭 {selectedProfileForModal.smoking}
                    </span>
                  )}
                  {selectedProfileForModal.workout && (
                    <span className="bg-slate-800 px-3 py-1 rounded-xl text-slate-300 border border-slate-700">
                      💪 {selectedProfileForModal.workout}
                    </span>
                  )}
                  {selectedProfileForModal.pets && (
                    <span className="bg-slate-800 px-3 py-1 rounded-xl text-slate-300 border border-slate-700">
                      🐾 {selectedProfileForModal.pets}
                    </span>
                  )}
                </div>
              </div>

              {selectedProfileForModal.interests && selectedProfileForModal.interests.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-2">
                    Interests
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfileForModal.interests.map((interest) => (
                      <span
                        key={interest}
                        className="text-xs bg-pink-500/10 text-pink-300 border border-pink-500/30 px-3 py-1 rounded-full font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const target = selectedProfileForModal
                setSelectedProfileForModal(null)
                if (onStartChat && target) {
                  onStartChat(target)
                }
              }}
              className="w-full py-3.5 bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-xl shadow-pink-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
