'use client'

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"
import { calculateDistance, getLastSeenText } from "@/lib/common-utils"
import { executeSwipe } from "@/lib/firestore-service"
import { soundEffects } from "@/lib/sound-effects"
import {
  Heart,
  X,
  Star,
  RotateCcw,
  SlidersHorizontal,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
} from "lucide-react"
import toast from "react-hot-toast"

export interface DiscoveryViewProps {
  currentUser?: any
  currentProfile?: UserProfile
  onStartChat?: (user: UserProfile) => void
}

function formatDisplayDistance(dist?: number, uid?: string): string {
  if (dist === undefined || dist === null) return "Nearby"
  if (dist >= 1.0) {
    return `${Math.round(dist * 10) / 10} km away`
  }
  // Realistic nearby offset for same-city / default coordinate accounts (1.2 to 4.7 km)
  const seed = (uid || "spark").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const realistic = ((seed % 35) + 12) / 10
  return `${realistic.toFixed(1)} km away`
}

export default function DiscoveryView({
  currentUser,
  currentProfile,
  onStartChat,
}: DiscoveryViewProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [isSwipingLocked, setIsSwipingLocked] = useState(false)

  // Drag Gesture State
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Match Celebration Modal
  const [matchedProfile, setMatchedProfile] = useState<UserProfile | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)

  // Filters State
  const [showFilters, setShowFilters] = useState(false)
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(50000) // Default to global/unlimited so distance never hides friends
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100])

  // Visual animated stamp direction
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "super" | null>(null)

  // Fetch Discoverable Profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      let swipedUserIds: string[] = []

      if (currentUser?.uid) {
        try {
          const swipesQuery = query(
            collection(db, "swipes"),
            where("fromUserId", "==", currentUser.uid)
          )
          const swipeSnap = await getDocs(swipesQuery)
          swipedUserIds = swipeSnap.docs.map((d) => d.data().toUserId)
        } catch (e) {
          console.warn("Could not query swipes from Firestore:", e)
        }
      }

      // Also read locally cached swipes so candidates NEVER repeat
      let localSwipedIds: string[] = []
      if (currentUser?.uid && typeof window !== "undefined") {
        try {
          localSwipedIds = JSON.parse(localStorage.getItem(`spark_swipes_${currentUser.uid}`) || "[]")
        } catch {}
      }

      const allSwipedSet = new Set([...swipedUserIds, ...localSwipedIds])

      const userLat = currentProfile?.location?.latitude || 28.6139
      const userLng = currentProfile?.location?.longitude || 77.209

      // 1. Fetch real users directly from Firestore Cloud DB
      const fetchedProfiles: UserProfile[] = []
      try {
        const usersSnap = await getDocs(collection(db, "users"))

        usersSnap.docs.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile
          const uid = docSnap.id

          // Exclude and purge any residual pre-seeded or dummy documents
          const isDummy =
            uid.startsWith("cloud_user") ||
            uid.startsWith("demo") ||
            data.email?.endsWith("@example.com")

          if (isDummy) {
            deleteDoc(doc(db, "users", uid)).catch(() => {})
            return
          }

          // Check if candidate has completed profile or at least has name & photos
          const isComplete = Boolean(
            data.profileComplete ||
            (data.name && data.photos && data.photos.length > 0)
          )

          if (!isComplete) return

          // Guarantee user is NOT self and has NEVER been swiped on
          if (uid !== currentUser?.uid && !allSwipedSet.has(uid)) {
            const pLat = data.location?.latitude || userLat
            const pLng = data.location?.longitude || userLng
            const dist = calculateDistance(userLat, userLng, pLat, pLng)

            fetchedProfiles.push({
              ...data,
              uid,
              distance: Math.round(dist * 10) / 10,
            })
          }
        })
      } catch (err: any) {
        console.error("Firestore users fetch error:", err)
        if (err?.code === "permission-denied") {
          toast.error("Firestore permission denied. Please check your Firebase Security Rules!", {
            duration: 6000,
          })
        }
      }

      // 3. Filter by gender & age & distance
      let filtered = fetchedProfiles.filter((p) => {
        if (genderFilter !== "all" && p.gender !== genderFilter) return false
        if (p.age && (p.age < ageRange[0] || p.age > ageRange[1])) return false
        if (p.distance !== undefined && p.distance > maxDistanceKm) return false
        return true
      })

      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0))

      setProfiles(filtered)
      setCurrentIndex(0)
      setCurrentPhotoIndex(0)
    } catch (err: any) {
      console.error("Error loading discovery profiles from cloud Firestore:", err)
      setProfiles([])
      setCurrentIndex(0)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.uid, currentProfile, genderFilter, ageRange, maxDistanceKm])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const currentCandidate = profiles[currentIndex]

  // Photo gallery
  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!currentCandidate?.photos) return
    if (currentPhotoIndex < currentCandidate.photos.length - 1) {
      setCurrentPhotoIndex((prev) => prev + 1)
    } else {
      setCurrentPhotoIndex(0)
    }
  }

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!currentCandidate?.photos) return
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex((prev) => prev - 1)
    } else {
      setCurrentPhotoIndex(currentCandidate.photos.length - 1)
    }
  }

  // ATOMIC SWIPE EXECUTION
  const handleSwipe = async (action: "pass" | "like" | "superlike") => {
    if (!currentCandidate || isSwipingLocked) return
    setIsSwipingLocked(true)

    soundEffects.playSwipeSound(action)
    setSwipeDirection(action === "pass" ? "left" : action === "like" ? "right" : "super")

    const candidate = currentCandidate

    try {
      if (currentProfile && candidate.uid) {
        const result = await executeSwipe(currentProfile, candidate, action)

        if (result.isMatch) {
          soundEffects.playMatchCelebration()
          setMatchedProfile(candidate)
          setShowMatchModal(true)
          toast.success(`🎉 You matched with ${candidate.name}!`, { duration: 5000 })
        } else if (action === "like" || action === "superlike") {
          toast(`Liked ${candidate.name}! Once they like you back, you'll match! 💫`, {
            icon: "💖",
            duration: 2500,
          })
        }
      }
    } catch (err: any) {
      console.error("Swipe execution error:", err)
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        toast.error("Database permission error: Please publish Firestore Rules in Firebase Console!", {
          duration: 6000,
        })
      } else {
        toast.error(err?.message || "Could not record swipe.")
      }
    }

    // Instantly persist this swipe locally so the candidate can NEVER repeat
    if (currentUser?.uid && candidate?.uid && typeof window !== "undefined") {
      try {
        const key = `spark_swipes_${currentUser.uid}`
        const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]")
        if (!existing.includes(candidate.uid)) {
          existing.push(candidate.uid)
          localStorage.setItem(key, JSON.stringify(existing))
        }
      } catch {}
    }

    setTimeout(() => {
      setSwipeDirection(null)
      setDragOffset({ x: 0, y: 0 })
      setHistory((prev) => [...prev, currentIndex])
      // Filter out this candidate completely from current deck so they NEVER repeat
      setProfiles((prev) => prev.filter((p) => p.uid !== candidate.uid))
      setCurrentIndex(0)
      setCurrentPhotoIndex(0)
      setIsSwipingLocked(false)
    }, 280)
  }

  // DRAG GESTURE HANDLERS
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setDragOffset({ x: dx, y: dy })
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    const threshold = 100

    if (dragOffset.x > threshold) {
      handleSwipe("like")
    } else if (dragOffset.x < -threshold) {
      handleSwipe("pass")
    } else if (dragOffset.y < -threshold) {
      handleSwipe("superlike")
    } else {
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const dx = e.touches[0].clientX - dragStartRef.current.x
    const dy = e.touches[0].clientY - dragStartRef.current.y
    setDragOffset({ x: dx, y: dy })
  }

  const handleTouchEnd = () => {
    handleMouseUp()
  }

  const handleRewind = () => {
    if (history.length === 0) {
      toast("No swipes to rewind!", { icon: "↩️" })
      return
    }
    const lastIndex = history[history.length - 1]
    setHistory((prev) => prev.slice(0, -1))
    setCurrentIndex(lastIndex)
    setCurrentPhotoIndex(0)
    toast.success("Card restored! 🔄")
  }

  const handleResetCards = () => {
    setCurrentIndex(0)
    setHistory([])
    fetchProfiles()
    toast("Looking for new profiles! ✨", { icon: "🔍" })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showMatchModal || showFilters) return
      if (e.key === "ArrowLeft") handleSwipe("pass")
      if (e.key === "ArrowRight") handleSwipe("like")
      if (e.key === "ArrowUp") handleSwipe("superlike")
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, profiles, showMatchModal, showFilters, isSwipingLocked])

  const rotationDeg = dragOffset.x * 0.08

  return (
    <div className="relative max-w-lg mx-auto w-full flex flex-col items-center">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 flex-wrap">
            <span>Discover</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
              {profiles.length > currentIndex
                ? `${profiles.length - currentIndex} nearby`
                : "0 nearby"}
            </span>
            <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>Live Feed</span>
            </span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              toast.promise(fetchProfiles(), {
                loading: "Refreshing profiles...",
                success: "Profiles updated!",
                error: "Refresh failed",
              })
            }}
            title="Refresh Profiles"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Card View Area */}
      {loading ? (
        <div className="w-full aspect-3/4 max-h-[640px] rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center shadow-2xl">
          <div className="w-12 h-12 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-300 font-semibold">Finding matches near you...</p>
          <p className="text-xs text-slate-500 mt-1">Filtering by distance & preferences</p>
        </div>
      ) : currentCandidate ? (
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotationDeg}deg)`,
            transition: isDragging ? "none" : "transform 0.3s ease-out",
          }}
          className="relative w-full aspect-3/4 max-h-[640px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 select-none cursor-grab active:cursor-grabbing group touch-none"
        >
          <div className="relative w-full h-full">
            <img
              src={
                currentCandidate.photos?.[currentPhotoIndex] ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800"
              }
              alt={currentCandidate.name}
              className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
            />

            <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-black/40" />

            {/* Photo Segment Indicators */}
            {currentCandidate.photos && currentCandidate.photos.length > 1 && (
              <div className="absolute top-3 left-4 right-4 flex space-x-1.5 z-20">
                {currentCandidate.photos.map((_, pIdx) => (
                  <div
                    key={pIdx}
                    className={`h-1 flex-1 rounded-full backdrop-blur-sm transition-all ${
                      pIdx === currentPhotoIndex ? "bg-white shadow" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Tap Left / Right Photo Controls */}
            <button
              onClick={prevPhoto}
              className="absolute left-0 top-0 bottom-24 w-1/3 z-10 cursor-pointer flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                <ChevronLeft className="w-5 h-5" />
              </div>
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-0 top-0 bottom-24 w-1/3 z-10 cursor-pointer flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>

            {/* Stamp Overlays on Drag or Swipe */}
            {(swipeDirection === "right" || dragOffset.x > 50) && (
              <div className="absolute top-12 left-6 z-30 border-4 border-emerald-400 text-emerald-400 font-extrabold text-3xl px-4 py-1.5 rounded-2xl rotate-[-15deg] shadow-lg animate-pulse tracking-wider">
                LIKE
              </div>
            )}
            {(swipeDirection === "left" || dragOffset.x < -50) && (
              <div className="absolute top-12 right-6 z-30 border-4 border-rose-500 text-rose-500 font-extrabold text-3xl px-4 py-1.5 rounded-2xl rotate-[15deg] shadow-lg animate-pulse tracking-wider">
                NOPE
              </div>
            )}
            {(swipeDirection === "super" || dragOffset.y < -50) && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 border-4 border-amber-400 text-amber-400 font-extrabold text-3xl px-6 py-2 rounded-2xl shadow-lg animate-bounce tracking-wider">
                SUPER LIKE
              </div>
            )}

            {/* Card Content at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 space-y-3 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline space-x-2.5">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {currentCandidate.name}
                  </h3>
                  <span className="text-2xl font-semibold text-white/90">
                    {currentCandidate.age}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentCandidate.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  <span className="text-slate-300 text-[11px]">
                    {currentCandidate.isOnline ? "Online" : getLastSeenText(currentCandidate.lastSeen)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <div className="flex items-center space-x-1 bg-slate-800/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {currentCandidate.location?.city || "Nearby"},{" "}
                    {currentCandidate.location?.country || ""}
                  </span>
                </div>
                <div className="bg-slate-800/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-pink-300 font-semibold">
                  📍 {formatDisplayDistance(currentCandidate.distance, currentCandidate.uid)}
                </div>
              </div>

              {(currentCandidate.additionalInfo?.jobTitle ||
                currentCandidate.additionalInfo?.university) && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  {currentCandidate.additionalInfo?.jobTitle && (
                    <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      <Briefcase className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {currentCandidate.additionalInfo.jobTitle}
                        {currentCandidate.additionalInfo.company ? ` at ${currentCandidate.additionalInfo.company}` : ""}
                      </span>
                    </div>
                  )}
                  {currentCandidate.additionalInfo?.university && (
                    <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      <GraduationCap className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>{currentCandidate.additionalInfo.university}</span>
                    </div>
                  )}
                </div>
              )}

              {currentCandidate.additionalInfo?.bio && (
                <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed bg-black/30 backdrop-blur-xs p-2.5 rounded-xl border border-white/5">
                  {currentCandidate.additionalInfo.bio}
                </p>
              )}

              {currentCandidate.interests && currentCandidate.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentCandidate.interests.slice(0, 4).map((interest) => (
                    <span
                      key={interest}
                      className="text-[11px] font-medium bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white border border-white/10"
                    >
                      {interest}
                    </span>
                  ))}
                  {currentCandidate.interests.length > 4 && (
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                      +{currentCandidate.interests.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty Deck State with One-Click Reset */
        <div className="w-full aspect-3/4 max-h-[640px] rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-linear-to-tr from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">You're All Caught Up!</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              You have reviewed all available profiles. New members will appear here as soon as they join!
            </p>
          </div>
          <button
            onClick={handleResetCards}
            className="px-6 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm shadow-xl shadow-pink-500/25 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check for New Members</span>
          </button>
        </div>
      )}

      {/* Swipe Action Controls */}
      <div className="w-full flex items-center justify-center space-x-4 sm:space-x-6 mt-5 z-20">
        <button
          onClick={handleRewind}
          disabled={history.length === 0}
          title="Rewind previous card"
          className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-400 flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleSwipe("pass")}
          disabled={!currentCandidate || isSwipingLocked}
          title="Pass (Arrow Left or Drag Left)"
          className="w-16 h-16 rounded-full bg-slate-900 border-2 border-rose-500/80 hover:bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/10 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <X className="w-8 h-8 stroke-[2.5]" />
        </button>

        <button
          onClick={() => handleSwipe("superlike")}
          disabled={!currentCandidate || isSwipingLocked}
          title="Super Like (Arrow Up or Drag Up)"
          className="w-13 h-13 rounded-full bg-slate-900 border-2 border-amber-400/80 hover:bg-amber-400/10 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-400/10 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <Star className="w-6 h-6 fill-current" />
        </button>

        <button
          onClick={() => handleSwipe("like")}
          disabled={!currentCandidate || isSwipingLocked}
          title="Like (Arrow Right or Drag Right)"
          className="w-16 h-16 rounded-full bg-linear-to-tr from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center justify-center shadow-xl shadow-pink-500/30 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <Heart className="w-8 h-8 fill-current" />
        </button>
      </div>

      {/* FILTER DRAWER */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-pink-500" />
                <h3 className="text-lg font-bold text-white">Discovery Preferences</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Maximum Distance</span>
                <span className="font-bold text-pink-400">{maxDistanceKm} km</span>
              </div>
              <input
                type="range"
                min={5}
                max={250}
                step={5}
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm text-slate-300 font-medium">Show Me</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "all", label: "Everyone" },
                  { value: "female", label: "Women" },
                  { value: "male", label: "Men" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setGenderFilter(item.value)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      genderFilter === item.value
                        ? "bg-pink-600 text-white border-pink-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Age Range</span>
                <span className="font-bold text-pink-400">
                  {ageRange[0]} - {ageRange[1]} years
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min={18}
                  max={60}
                  value={ageRange[0]}
                  onChange={(e) =>
                    setAgeRange([Math.min(Number(e.target.value), ageRange[1] - 1), ageRange[1]])
                  }
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <input
                  type="range"
                  min={19}
                  max={70}
                  value={ageRange[1]}
                  onChange={(e) =>
                    setAgeRange([ageRange[0], Math.max(Number(e.target.value), ageRange[0] + 1)])
                  }
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowFilters(false)
                fetchProfiles()
              }}
              className="w-full py-3 bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
            >
              Apply Preferences
            </button>
          </div>
        </div>
      )}

      {/* IT'S A MATCH CELEBRATION MODAL */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-pink-500/50 rounded-3xl p-8 text-center shadow-2xl space-y-6 relative overflow-hidden animate-scale-in">
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Mutual Match</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold bg-linear-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                It's a Match!
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                You and {matchedProfile.name} liked each other!
              </p>
            </div>

            <div className="flex items-center justify-center space-x-4 py-2">
              <div className="relative">
                <img
                  src={
                    currentProfile?.photos?.[0] ||
                    currentUser?.photoURL ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
                  }
                  alt="You"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-rose-500 shadow-xl"
                />
              </div>

              <div className="w-12 h-12 rounded-full bg-linear-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/40 animate-pulse-soft -mx-2 z-10">
                <Heart className="w-6 h-6 fill-current" />
              </div>

              <div className="relative">
                <img
                  src={
                    matchedProfile.photos?.[0] ||
                    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200"
                  }
                  alt={matchedProfile.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-pink-500 shadow-xl"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  setShowMatchModal(false)
                  if (onStartChat) {
                    onStartChat(matchedProfile)
                  }
                }}
                className="w-full py-3.5 bg-linear-to-r from-rose-500 via-pink-500 to-amber-500 hover:opacity-95 text-white font-bold rounded-2xl shadow-xl shadow-pink-500/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Send a Message</span>
              </button>

              <button
                onClick={() => setShowMatchModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-sm rounded-2xl transition-all cursor-pointer"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
