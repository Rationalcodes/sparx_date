'use client'

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { uploadMedia, compressImageToDataUrl } from "@/lib/cloudinary"
import Loader from "@/components/Loader"
import toast from "react-hot-toast"
import {
  ONBOARDING_STEPS,
  INTERESTS_OPTIONS,
  GENDER_OPTIONS,
  DRINKING_OPTIONS,
  SMOKING_OPTIONS,
  WORKOUT_OPTIONS,
  DIET_OPTIONS,
  PETS_OPTIONS,
  LOOKING_FOR_OPTIONS,
  generateHeightOptions,
  generateWeightOptions,
  getCurrentLocation,
  calculateProfileCompletion,
} from "@/lib/common-utils"
import type { UserProfile } from "@/lib/types"
import {
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  MapPin,
  Upload,
  Trash2,
  Star,
  Camera,
  Navigation,
} from "lucide-react"

export default function UserOnboardingPage() {
  const router = useRouter()
  const { user, profileComplete, rawProfile, loading: authLoading, saveUserProfile } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [locating, setLocating] = useState(false)

  // Step 1: Basic Info
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [age, setAge] = useState<number>(24)
  const [gender, setGender] = useState("male")
  const [phone, setPhone] = useState("")

  // Step 2: Interests
  const [interests, setInterests] = useState<string[]>([])

  // Step 3: Physical & Preferences
  const [height, setHeight] = useState("5'08\" (173cm)")
  const [weight, setWeight] = useState("150 lbs (68 kg)")
  const [lookingFor, setLookingFor] = useState<string[]>(["relationship"])
  const [minAge, setMinAge] = useState(20)
  const [maxAge, setMaxAge] = useState(32)

  // Step 4: Lifestyle
  const [drinking, setDrinking] = useState("socially")
  const [smoking, setSmoking] = useState("never")
  const [workout, setWorkout] = useState("weekly")
  const [diet, setDiet] = useState("omnivore")
  const [pets, setPets] = useState("dog lover")

  // Step 5: Location
  const [latitude, setLatitude] = useState(0)
  const [longitude, setLongitude] = useState(0)
  const [city, setCity] = useState("New York")
  const [state, setState] = useState("NY")
  const [country, setCountry] = useState("USA")
  const [address, setAddress] = useState("Downtown")

  // Step 6: Career & About
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [educationLevel, setEducationLevel] = useState("Bachelor's Degree")
  const [university, setUniversity] = useState("")
  const [bio, setBio] = useState("")

  // Step 7: Photos
  const [photos, setPhotos] = useState<string[]>([])

  // Prefill initial data from Google Auth or existing draft
  useEffect(() => {
    if (user) {
      if (!name && user.displayName) setName(user.displayName)
      if (!email && user.email) setEmail(user.email)
      if (photos.length === 0 && user.photoURL) {
        setPhotos([user.photoURL])
      }
    }

    if (rawProfile) {
      if (rawProfile.name) setName(rawProfile.name)
      if (rawProfile.email) setEmail(rawProfile.email)
      if (rawProfile.age) setAge(rawProfile.age)
      if (rawProfile.gender) setGender(rawProfile.gender)
      if (rawProfile.phone) setPhone(rawProfile.phone)
      if (rawProfile.interests) setInterests(rawProfile.interests)
      if (rawProfile.height) setHeight(rawProfile.height)
      if (rawProfile.weight) setWeight(rawProfile.weight)
      if (rawProfile.lookingFor) setLookingFor(rawProfile.lookingFor)
      if (rawProfile.ageRange) {
        setMinAge(rawProfile.ageRange[0])
        setMaxAge(rawProfile.ageRange[1])
      }
      if (rawProfile.drinking) setDrinking(rawProfile.drinking)
      if (rawProfile.smoking) setSmoking(rawProfile.smoking)
      if (rawProfile.workout) setWorkout(rawProfile.workout)
      if (rawProfile.diet) setDiet(rawProfile.diet)
      if (rawProfile.pets) setPets(rawProfile.pets)
      if (rawProfile.location) {
        setLatitude(rawProfile.location.latitude || 0)
        setLongitude(rawProfile.location.longitude || 0)
        setCity(rawProfile.location.city || "")
        setState(rawProfile.location.state || "")
        setCountry(rawProfile.location.country || "")
        setAddress(rawProfile.location.address || "")
      }
      if (rawProfile.additionalInfo) {
        setJobTitle(rawProfile.additionalInfo.jobTitle || "")
        setCompany(rawProfile.additionalInfo.company || "")
        setEducationLevel(rawProfile.additionalInfo.educationLevel || "Bachelor's Degree")
        setUniversity(rawProfile.additionalInfo.university || "")
        setBio(rawProfile.additionalInfo.bio || "")
      }
      if (rawProfile.photos && rawProfile.photos.length > 0) {
        setPhotos(rawProfile.photos)
      }
    }
  }, [user, rawProfile])

  // Redirect if not logged in or if already completed onboarding
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (profileComplete) {
      router.replace("/")
    }
  }, [authLoading, user, profileComplete, router])

  if (authLoading) {
    return <Loader message="Setting up onboarding..." />
  }

  const heightOptions = generateHeightOptions()
  const weightOptions = generateWeightOptions()

  // Handle GPS Location fetch
  const handleDetectLocation = async () => {
    setLocating(true)
    try {
      const coords = await getCurrentLocation()
      setLatitude(coords.lat)
      setLongitude(coords.lng)

      // Reverse geocoding via OpenStreetMap Nominatim (client-side free reverse geocoder)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.address) {
            const cityName =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              "Current Location"
            const stateName = data.address.state || ""
            const countryName = data.address.country || ""
            setCity(cityName)
            setState(stateName)
            setCountry(countryName)
            setAddress(data.display_name?.split(",").slice(0, 2).join(",") || cityName)
          }
        }
      } catch {
        // Reverse geocode failed, coordinates still captured
      }
      toast.success("Location detected successfully! 📍")
    } catch (err: any) {
      console.warn("Location error:", err)
      toast.error(err.message || "Could not detect location. Please type manually.")
    } finally {
      setLocating(false)
    }
  }

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (photos.length + files.length > 6) {
      toast.error("You can upload a maximum of 6 photos.")
      return
    }

    setUploadingPhoto(true)
    const newPhotos: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not a valid image.`)
          continue
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB.`)
          continue
        }
        const uploadedUrl = await uploadMedia(file, "image")
        newPhotos.push(uploadedUrl)
      }

      setPhotos((prev) => [...prev, ...newPhotos])
      toast.success("Photo(s) uploaded successfully! 📸")
    } catch {
      toast.error("Failed to upload photo. Please try again.")
    } finally {
      setUploadingPhoto(false)
      // Reset input
      e.target.value = ""
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const makePrimaryPhoto = (index: number) => {
    if (index === 0) return
    setPhotos((prev) => {
      const selected = prev[index]
      const rest = prev.filter((_, i) => i !== index)
      return [selected, ...rest]
    })
    toast.success("Set as primary profile photo! ⭐")
  }

  const toggleInterest = (interestName: string) => {
    setInterests((prev) =>
      prev.includes(interestName)
        ? prev.filter((item) => item !== interestName)
        : [...prev, interestName]
    )
  }

  const toggleLookingFor = (item: string) => {
    setLookingFor((prev) =>
      prev.includes(item)
        ? prev.length > 1
          ? prev.filter((i) => i !== item)
          : prev
        : [...prev, item]
    )
  }

  // Validation per step
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error("Please enter your name.")
        return false
      }
      if (!age || age < 18 || age > 100) {
        toast.error("You must be at least 18 years old to join.")
        return false
      }
      return true
    }
    if (step === 2) {
      if (interests.length < 3) {
        toast.error("Please select at least 3 interests.")
        return false
      }
      return true
    }
    if (step === 3) {
      if (minAge > maxAge) {
        toast.error("Minimum age cannot exceed maximum age.")
        return false
      }
      return true
    }
    if (step === 5) {
      if (!city.trim() || !country.trim()) {
        toast.error("Please provide at least a City and Country.")
        return false
      }
      return true
    }
    if (step === 6) {
      if (!bio.trim() || bio.trim().length < 15) {
        toast.error("Please write a short bio (at least 15 characters).")
        return false
      }
      return true
    }
    if (step === 7) {
      if (photos.length === 0) {
        toast.error("Please upload at least 1 profile photo.")
        return false
      }
      return true
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Final Submission
  const handleSubmit = async () => {
    if (!validateStep(7)) return
    if (!user) return

    setSubmitting(true)
    try {
      // Ensure all photos are strictly below Firestore's 1MB property limit
      const sanitizedPhotos = await Promise.all(
        photos.map(async (p) => {
          if (p.startsWith("data:image") && p.length > 70000) {
            try {
              const res = await fetch(p)
              const blob = await res.blob()
              return await compressImageToDataUrl(blob, 500, 500, 0.6)
            } catch {
              return p
            }
          }
          return p
        })
      )

      const profileData: UserProfile = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim() || user.email || "",
        age: Number(age),
        gender,
        phone: phone.trim(),
        interests,
        height,
        weight,
        lookingFor,
        ageRange: [Number(minAge), Number(maxAge)],
        drinking,
        smoking,
        workout,
        diet,
        pets,
        location: {
          latitude: Number(latitude) || 40.7128,
          longitude: Number(longitude) || -74.006,
          city: city.trim() || "New York",
          state: state.trim() || "NY",
          country: country.trim() || "USA",
          address: address.trim() || city.trim(),
        },
        additionalInfo: {
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          educationLevel,
          university: university.trim(),
          bio: bio.trim(),
        },
        photos: sanitizedPhotos,
        isVerifiedProfile: true,
        profileComplete: true,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      }

      await saveUserProfile(profileData)
      toast.success("Welcome! Profile created successfully! 🎉")
      router.replace("/")
    } catch (err: any) {
      console.error("Error saving profile:", err)
      toast.error(err.message || "Failed to save profile. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const completionPercent = Math.round((currentStep / 7) * 100)

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-500 via-pink-600 to-amber-500 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-3xl mx-auto w-full pt-4 pb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-lg flex items-center justify-center">
            <Heart className="h-7 w-7 text-white fill-current animate-pulse-soft" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Setup Your Profile</h1>
            <p className="text-xs text-white/80">Step {currentStep} of 7 • {ONBOARDING_STEPS[currentStep - 1]?.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-amber-300 animate-spin" />
          <span>{completionPercent}% Ready</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-3xl mx-auto w-full mb-6">
        <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
          <div
            className="bg-white h-2.5 rounded-full transition-all duration-500 ease-out shadow-glow"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 px-1">
          {ONBOARDING_STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (s.id < currentStep) setCurrentStep(s.id)
              }}
              disabled={s.id > currentStep}
              className={`text-xs flex flex-col items-center transition-all ${
                s.id === currentStep
                  ? "text-white font-bold scale-110"
                  : s.id < currentStep
                  ? "text-white/80 hover:text-white cursor-pointer"
                  : "text-white/40 cursor-not-allowed"
              }`}
            >
              <span className="text-sm">{s.icon}</span>
              <span className="hidden sm:inline text-[11px] mt-0.5">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Card Container */}
      <main className="max-w-3xl mx-auto w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>👤</span> Basic Information
              </h2>
              <p className="text-sm text-white/80 mt-1">Let us know the fundamentals about who you are.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jessica Parker"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white/60 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Age (18+) *</label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.icon} {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-white/90 mb-1.5">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Interests */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>❤️</span> What Are You Into?
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Pick at least 3 interests to help matches discover shared passions. (Selected: {interests.length})
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {INTERESTS_OPTIONS.map((item) => {
                const selected = interests.includes(item.name)
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleInterest(item.name)}
                    className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      selected
                        ? "bg-white text-pink-600 border-white shadow-lg scale-102"
                        : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Physical & Preferences */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>📏</span> Preferences & Physical
              </h2>
              <p className="text-sm text-white/80 mt-1">Tell matches about your build and what you are seeking.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Height</label>
                <select
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {heightOptions.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Weight</label>
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {weightOptions.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-white/90 mb-2">Looking For (Select multiple)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LOOKING_FOR_OPTIONS.map((opt) => {
                    const active = lookingFor.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleLookingFor(opt.value)}
                        className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                          active
                            ? "bg-white text-pink-600 border-white shadow-md font-semibold"
                            : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                        }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 bg-white/10 p-4 rounded-2xl border border-white/20">
                <label className="block text-xs font-medium text-white/90 mb-2">Preferred Age Range</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <span className="text-xs text-white/70">Min Age: {minAge}</span>
                    <input
                      type="range"
                      min={18}
                      max={60}
                      value={minAge}
                      onChange={(e) => setMinAge(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                  <span className="font-bold text-lg">to</span>
                  <div className="flex-1">
                    <span className="text-xs text-white/70">Max Age: {maxAge}</span>
                    <input
                      type="range"
                      min={minAge}
                      max={75}
                      value={maxAge}
                      onChange={(e) => setMaxAge(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Lifestyle */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>🏃‍♂️</span> Lifestyle & Habits
              </h2>
              <p className="text-sm text-white/80 mt-1">Matches love knowing your everyday vibe and habits.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Drinking</label>
                <select
                  value={drinking}
                  onChange={(e) => setDrinking(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {DRINKING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Smoking</label>
                <select
                  value={smoking}
                  onChange={(e) => setSmoking(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {SMOKING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Workout</label>
                <select
                  value={workout}
                  onChange={(e) => setWorkout(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {WORKOUT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Diet</label>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {DIET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-white/90 mb-1.5">Pets</label>
                <select
                  value={pets}
                  onChange={(e) => setPets(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  {PETS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Location */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>📍</span> Real-Time Location
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Your location powers the distance filter and shows you matches nearby!
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-left">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Navigation className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">One-Click Auto Geolocation</h4>
                  <p className="text-xs text-white/70">
                    {latitude && longitude
                      ? `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
                      : "Capture your device's exact GPS location for high accuracy matching."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-pink-600 rounded-xl font-bold text-sm shadow-md hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                {locating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    <span>Detect Location</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San Francisco"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">State / Region</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. California"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Country *</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Neighborhood / Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Mission District"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Career & About */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>💼</span> Career & About You
              </h2>
              <p className="text-sm text-white/80 mt-1">Showcase your career and express yourself in your bio.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Designer"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Spotify"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">Education Level</label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/80 [&>option]:text-gray-900"
                >
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate Student</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD / Doctorate">PhD / Doctorate</option>
                  <option value="Trade / Other">Trade / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">University / College</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-white/90">Bio * (At least 15 characters)</label>
                  <span className={`text-[11px] ${bio.length < 15 ? "text-amber-200" : "text-emerald-200"}`}>
                    {bio.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Coffee lover, weekend hiker, amateur chef. Looking for someone to explore hidden cafes with and have deep conversations under the stars..."
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/80 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Photos */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>📸</span> Upload Your Best Photos
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Upload up to 6 high-quality photos. The first photo is your main profile picture!
              </p>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square rounded-2xl overflow-hidden bg-white/10 border-2 border-white/30 shadow-lg"
                >
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />

                  {idx === 0 && (
                    <div className="absolute top-2 left-2 bg-pink-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center space-x-1 shadow">
                      <Star className="h-3 w-3 fill-current" />
                      <span>Main Photo</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => makePrimaryPhoto(idx)}
                        className="p-2 bg-white text-pink-600 rounded-full hover:scale-110 transition-transform"
                        title="Make Primary"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="p-2 bg-red-600 text-white rounded-full hover:scale-110 transition-transform"
                      title="Delete Photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {photos.length < 6 && (
                <label className="relative aspect-square rounded-2xl border-2 border-dashed border-white/40 hover:border-white bg-white/10 hover:bg-white/20 transition-all flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-white/20 rounded-full mb-2">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold">Add Photo</span>
                      <span className="text-[10px] text-white/70 mt-0.5">PNG, JPG, WebP</span>
                    </>
                  )}
                </label>
              )}
            </div>

            <div className="bg-white/10 p-3.5 rounded-xl border border-white/20 text-xs text-white/80 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Profiles with 3 or more photos receive 4x more mutual matches!</span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-white/20 mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold text-sm transition-all flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-white text-pink-600 hover:bg-white/95 font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 ml-auto"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || photos.length === 0}
              className="px-7 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all flex items-center space-x-2 ml-auto disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <span>Complete & Start Swiping</span>
                </>
              )}
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-white/70 py-4">
        Protected with Google OAuth & Firebase • Privacy Guaranteed
      </footer>
    </div>
  )
}
