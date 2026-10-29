'use client'

import React, { useState, useEffect } from 'react'
import { Heart, Sparkles, Star, Zap, Users, Shield } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { STATS_DATA } from '@/lib/common-utils'
import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import toast, { Toaster } from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/context/AuthContext'
import Loader from '@/components/Loader'

export default function LoginPage() {
  const [signingIn, setSigningIn] = useState(false)
  const router = useRouter()
  const { user, profileComplete, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (user) {
      if (profileComplete) {
        router.replace("/")
      } else {
        router.replace("/user-onboarding")
      }
    }
  }, [user, profileComplete, loading, router])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Auto-provision user in Firestore so they are immediately discoverable
      try {
        const userRef = doc(db, "users", result.user.uid)
        await setDoc(
          userRef,
          {
            uid: result.user.uid,
            name: result.user.displayName || "New Member",
            email: result.user.email || "",
            photos: result.user.photoURL ? [result.user.photoURL] : [],
            age: 24,
            gender: "other",
            phone: "",
            interests: ["Travel", "Music", "Coffee"],
            height: "5'8\" (173cm)",
            weight: "150 lbs",
            lookingFor: ["relationship"],
            ageRange: [18, 50],
            drinking: "socially",
            smoking: "never",
            workout: "weekly",
            diet: "omnivore",
            pets: "dog lover",
            isOnline: true,
            profileComplete: true,
            isVerifiedProfile: true,
            lastSeen: serverTimestamp(),
            createdAt: serverTimestamp(),
            location: {
              city: "Delhi",
              state: "Delhi",
              country: "India",
              address: "Delhi",
              latitude: 28.6139,
              longitude: 77.209,
            },
            additionalInfo: {
              jobTitle: "",
              company: "",
              educationLevel: "Bachelor's Degree",
              university: "",
              bio: "Excited to meet new people! ✨",
            },
          },
          { merge: true }
        )
      } catch (dbErr) {
        console.warn("Could not write initial profile to Firestore:", dbErr)
      }

      toast.success("Successfully signed in with Google!")
    } catch (error: any) {
      console.error("Error during Google sign-in:", error)
      toast.error(error.message || "Failed to sign in with Google. Please try again.")
    } finally {
      setSigningIn(false)
    }
  }

  if (loading) {
    return <Loader message="Checking authentication..." />
  }

  const stats = STATS_DATA

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-500 via-pink-600 to-amber-500 relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Toaster position="top-center" />

      {/* Decorative blurred background shapes */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 container max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Hero Branding */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="bg-white/20 backdrop-blur-md p-5 rounded-3xl shadow-xl">
                  <Heart className="h-14 w-14 text-white fill-current animate-pulse-soft" />
                </div>
                <Sparkles className="h-7 w-7 text-amber-300 absolute -top-2 -right-2 animate-spin" />
                <Star className="h-5 w-5 text-white absolute -bottom-1 -left-1 animate-float" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
                Find Your
                <span className="block bg-linear-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent">
                  Perfect Match
                </span>
              </h1>
              <p className="text-base sm:text-lg text-white/90 max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal">
                Join millions of verified people looking for love, meaningful relationships, and deep connections.
              </p>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-lg mx-auto lg:mx-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {stat.label}
                  </div>
                  <div className="text-white/80 text-[11px] sm:text-xs font-medium">
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/30 rounded-3xl overflow-hidden shadow-2xl p-2 sm:p-4">
              <CardHeader className="text-center space-y-3 pb-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="bg-linear-to-br from-rose-500 via-pink-500 to-amber-500 p-4 rounded-2xl shadow-lg shadow-pink-500/25">
                      <Heart className="h-8 w-8 text-white fill-current animate-pulse-soft" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    Get Started
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                    Sign in with Google to explore matches near you
                  </CardDescription>
                </div>

                <div className="flex justify-center space-x-4 text-xs text-slate-500 pt-1">
                  <div className="flex items-center space-x-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Instant Setup</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3.5 w-3.5 text-pink-500" />
                    <span>Verified Users</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  size="lg"
                  className="w-full h-13 text-sm sm:text-base font-bold rounded-2xl relative overflow-hidden bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-3 cursor-pointer"
                >
                  {signingIn ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-slate-700">Connecting Google Auth...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-slate-800">Continue with Google</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 pt-1">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Secure OAuth 2.0 & encrypted data</span>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-2">
                  By continuing, you agree to our Terms of Service and Privacy Policy. Must be 18+ to join.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
