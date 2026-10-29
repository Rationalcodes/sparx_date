'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"
import { purgeResidualDummyData } from "@/lib/firestore-service"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  rawProfile: Partial<UserProfile> | null
  loading: boolean
  profileComplete: boolean
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  saveUserProfile: (profileData: UserProfile) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  rawProfile: null,
  loading: true,
  profileComplete: false,
  logout: async () => {},
  refreshProfile: async () => {},
  saveUserProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rawProfile, setRawProfile] = useState<Partial<UserProfile> | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const updateUserPresence = useCallback(async (uid: string, isOnline: boolean) => {
    try {
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp(),
      })
    } catch {
      // Document might not be created yet during onboarding
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await updateUserPresence(auth.currentUser.uid, false)
      }
      await signOut(auth)
      setUser(null)
      setProfile(null)
      setRawProfile(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("onboarding_complete")
      }
    } catch (error) {
      console.error("Error during sign-out:", error)
    }
  }, [updateUserPresence])

  const refreshProfile = useCallback(async () => {
    setRefreshVersion((v) => v + 1)
  }, [])

  const saveUserProfile = useCallback(async (profileData: UserProfile) => {
    // 1. Immediately update local React state synchronously to avoid render race conditions
    const completeProfile: UserProfile = { ...profileData, profileComplete: true }
    setProfile(completeProfile)
    setRawProfile(completeProfile)

    // 2. Persist to localStorage for fail-safe hydration across tab refreshes
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`spark_profile_${profileData.uid}`, JSON.stringify(completeProfile))
        localStorage.setItem("onboarding_complete", "true")
        localStorage.setItem("activeTab", "discovery")
      } catch (e) {
        console.warn("Could not save to localStorage:", e)
      }
    }

    // 3. Persist to Firestore
    const userRef = doc(db, "users", profileData.uid)
    await setDoc(userRef, completeProfile, { merge: true })
  }, [])

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null

    // Subscribe to Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      if (unsubscribeFirestore) {
        unsubscribeFirestore()
        unsubscribeFirestore = null
      }

      if (!firebaseUser) {
        setProfile(null)
        setRawProfile(null)
        setLoading(false)
        return
      }

      // Fast-path: Check localStorage cache first to prevent any flashing or false redirect loops
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`spark_profile_${firebaseUser.uid}`)
          const onboardingDone = localStorage.getItem("onboarding_complete") === "true"
          if (cached) {
            const parsed = JSON.parse(cached) as UserProfile
            if (parsed && (parsed.profileComplete || onboardingDone)) {
              setProfile({ ...parsed, profileComplete: true })
              setRawProfile(parsed)
            }
          }
        } catch {}
      }

      // User is logged in: update presence & purge any old test dummy profiles from Firestore
      updateUserPresence(firebaseUser.uid, true)
      purgeResidualDummyData().catch(() => {})

      // Subscribe to user profile document in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid)
      unsubscribeFirestore = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile
            const fullProfile: UserProfile = { ...data, uid: firebaseUser.uid }
            setRawProfile(fullProfile)

            // Check if profile is complete in Firestore or localStorage
            const localDone = typeof window !== "undefined" && localStorage.getItem("onboarding_complete") === "true"
            const isComplete = Boolean(
              data.profileComplete ||
              localDone ||
              (data.name && data.photos && data.photos.length > 0)
            )

            if (isComplete) {
              const completed = { ...fullProfile, profileComplete: true }
              setProfile(completed)
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(`spark_profile_${firebaseUser.uid}`, JSON.stringify(completed))
                  localStorage.setItem("onboarding_complete", "true")
                } catch {}
              }
            } else {
              setProfile(null)
            }
          } else {
            // Document does not exist in Firestore yet!
            // Auto-provision initial profile immediately so user is visible to all members
            const initialProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "New Member",
              email: firebaseUser.email || "",
              age: 24,
              gender: "other",
              phone: "",
              interests: ["Music", "Travel", "Coffee"],
              height: "5'8\" (173cm)",
              weight: "150 lbs",
              lookingFor: ["relationship"],
              ageRange: [18, 50],
              drinking: "socially",
              smoking: "never",
              workout: "weekly",
              diet: "omnivore",
              pets: "dog lover",
              photos: firebaseUser.photoURL ? [firebaseUser.photoURL] : [],
              isOnline: true,
              profileComplete: true,
              isVerifiedProfile: true,
              lastSeen: serverTimestamp(),
              createdAt: serverTimestamp(),
              location: {
                city: "Nearby",
                state: "",
                country: "",
                address: "Nearby",
                latitude: 28.6139,
                longitude: 77.209,
              },
              additionalInfo: {
                jobTitle: "",
                company: "",
                educationLevel: "Bachelor's Degree",
                university: "",
                bio: "Excited to connect and make new friends! ✨",
              },
            }

            setDoc(userDocRef, initialProfile, { merge: true })
              .then(() => {
                setProfile(initialProfile)
                setRawProfile(initialProfile)
              })
              .catch((err) => {
                console.error("Auto-provision Firestore profile error (check Firestore Security Rules):", err)
                setProfile(initialProfile)
                setRawProfile(initialProfile)
              })
              .finally(() => {
                setLoading(false)
              })
            return
          }

          // ONLY set loading to false after snapshot has been processed!
          setLoading(false)
        },
        (error) => {
          console.error("Firestore user profile snapshot error:", error)
          // On network/snapshot error, fallback to localStorage if available
          if (typeof window !== "undefined") {
            try {
              const cached = localStorage.getItem(`spark_profile_${firebaseUser.uid}`)
              if (cached) {
                const parsed = JSON.parse(cached) as UserProfile
                setProfile({ ...parsed, profileComplete: true })
                setRawProfile(parsed)
              }
            } catch {}
          }
          setLoading(false)
        }
      )
    })

    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        updateUserPresence(auth.currentUser.uid, false)
      }
    }

    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        const isOnline = document.visibilityState === "visible"
        updateUserPresence(auth.currentUser.uid, isOnline)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      unsubscribeAuth()
      if (unsubscribeFirestore) unsubscribeFirestore()
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [updateUserPresence, refreshVersion])

  const profileComplete = Boolean(profile?.profileComplete)

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        rawProfile,
        loading,
        profileComplete,
        logout,
        refreshProfile,
        saveUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
