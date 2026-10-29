'use client'

import React, { useState, useEffect } from "react"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth"
import { uploadMedia, compressImageToDataUrl } from "@/lib/cloudinary"
import {
  INTERESTS_OPTIONS,
  GENDER_OPTIONS,
  getCurrentLocation,
  calculateProfileCompletion,
} from "@/lib/common-utils"
import {
  Camera,
  Trash2,
  Star,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Save,
  ShieldCheck,
  LogOut,
  Navigation,
  Edit3,
  Eye,
} from "lucide-react"
import toast from "react-hot-toast"

export interface ProfileViewProps {
  currentUser?: any
  currentProfile?: UserProfile
}

export default function ProfileView({ currentUser, currentProfile }: ProfileViewProps) {
  const { logout } = useFirebaseAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [locating, setLocating] = useState(false)

  const [name, setName] = useState(currentProfile?.name || "")
  const [age, setAge] = useState(currentProfile?.age || 24)
  const [gender, setGender] = useState(currentProfile?.gender || "male")
  const [phone, setPhone] = useState(currentProfile?.phone || "")
  const [interests, setInterests] = useState<string[]>(currentProfile?.interests || [])
  const [height, setHeight] = useState(currentProfile?.height || "5'08\" (173cm)")
  const [weight, setWeight] = useState(currentProfile?.weight || "150 lbs (68 kg)")
  const [lookingFor, setLookingFor] = useState<string[]>(currentProfile?.lookingFor || ["relationship"])
  const [minAge, setMinAge] = useState(currentProfile?.ageRange?.[0] || 20)
  const [maxAge, setMaxAge] = useState(currentProfile?.ageRange?.[1] || 35)

  const [drinking, setDrinking] = useState(currentProfile?.drinking || "socially")
  const [smoking, setSmoking] = useState(currentProfile?.smoking || "never")
  const [workout, setWorkout] = useState(currentProfile?.workout || "weekly")
  const [diet, setDiet] = useState(currentProfile?.diet || "omnivore")
  const [pets, setPets] = useState(currentProfile?.pets || "dog lover")

  const [city, setCity] = useState(currentProfile?.location?.city || "New York")
  const [state, setState] = useState(currentProfile?.location?.state || "NY")
  const [country, setCountry] = useState(currentProfile?.location?.country || "USA")
  const [address, setAddress] = useState(currentProfile?.location?.address || "")
  const [latitude, setLatitude] = useState(currentProfile?.location?.latitude || 40.7128)
  const [longitude, setLongitude] = useState(currentProfile?.location?.longitude || -74.006)

  const [jobTitle, setJobTitle] = useState(currentProfile?.additionalInfo?.jobTitle || "")
  const [company, setCompany] = useState(currentProfile?.additionalInfo?.company || "")
  const [educationLevel, setEducationLevel] = useState(
    currentProfile?.additionalInfo?.educationLevel || "Bachelor's Degree"
  )
  const [university, setUniversity] = useState(currentProfile?.additionalInfo?.university || "")
  const [bio, setBio] = useState(currentProfile?.additionalInfo?.bio || "")

  const [photos, setPhotos] = useState<string[]>(currentProfile?.photos || [])

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name || "")
      setAge(currentProfile.age || 24)
      setGender(currentProfile.gender || "male")
      setPhone(currentProfile.phone || "")
      setInterests(currentProfile.interests || [])
      setHeight(currentProfile.height || "5'08\" (173cm)")
      setWeight(currentProfile.weight || "150 lbs (68 kg)")
      setLookingFor(currentProfile.lookingFor || ["relationship"])
      if (currentProfile.ageRange) {
        setMinAge(currentProfile.ageRange[0])
        setMaxAge(currentProfile.ageRange[1])
      }
      setDrinking(currentProfile.drinking || "socially")
      setSmoking(currentProfile.smoking || "never")
      setWorkout(currentProfile.workout || "weekly")
      setDiet(currentProfile.diet || "omnivore")
      setPets(currentProfile.pets || "dog lover")
      if (currentProfile.location) {
        setCity(currentProfile.location.city || "New York")
        setState(currentProfile.location.state || "NY")
        setCountry(currentProfile.location.country || "USA")
        setAddress(currentProfile.location.address || "")
        setLatitude(currentProfile.location.latitude || 40.7128)
        setLongitude(currentProfile.location.longitude || -74.006)
      }
      if (currentProfile.additionalInfo) {
        setJobTitle(currentProfile.additionalInfo.jobTitle || "")
        setCompany(currentProfile.additionalInfo.company || "")
        setEducationLevel(currentProfile.additionalInfo.educationLevel || "Bachelor's Degree")
        setUniversity(currentProfile.additionalInfo.university || "")
        setBio(currentProfile.additionalInfo.bio || "")
      }
      if (currentProfile.photos && currentProfile.photos.length > 0) {
        setPhotos(currentProfile.photos)
      }
    }
  }, [currentProfile])

  const completionPercent = calculateProfileCompletion({
    name,
    additionalInfo: { bio, jobTitle, company, educationLevel, university },
    photos,
    interests,
    height,
    drinking,
    smoking,
    workout,
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (photos.length + files.length > 6) {
      toast.error("Maximum 6 photos allowed.")
      return
    }

    setUploadingPhoto(true)
    const newPhotos: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploadedUrl = await uploadMedia(file, "image")
        newPhotos.push(uploadedUrl)
      }
      setPhotos((prev) => [...prev, ...newPhotos])
      toast.success("Photo added! 📸")
    } catch {
      toast.error("Failed to upload photo.")
    } finally {
      setUploadingPhoto(false)
      e.target.value = ""
    }
  }

  const removePhoto = (index: number) => {
    if (photos.length <= 1) {
      toast.error("You must keep at least 1 profile photo.")
      return
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const makePrimaryPhoto = (index: number) => {
    if (index === 0) return
    setPhotos((prev) => {
      const selected = prev[index]
      const rest = prev.filter((_, i) => i !== index)
      return [selected, ...rest]
    })
    toast.success("Primary photo updated! ⭐")
  }

  const toggleInterest = (interestName: string) => {
    setInterests((prev) =>
      prev.includes(interestName)
        ? prev.filter((item) => item !== interestName)
        : [...prev, interestName]
    )
  }

  const handleDetectLocation = async () => {
    setLocating(true)
    try {
      const coords = await getCurrentLocation()
      setLatitude(coords.lat)
      setLongitude(coords.lng)

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.address) {
            setCity(data.address.city || data.address.town || "Current Location")
            setState(data.address.state || "")
            setCountry(data.address.country || "")
          }
        }
      } catch {}
      toast.success("Location updated! 📍")
    } catch (err: any) {
      toast.error(err.message || "Failed to detect location.")
    } finally {
      setLocating(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!currentUser?.uid) return
    setSaving(true)

    try {
      // Ensure all photos are safely below Firestore limit
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

      const updatedData: Partial<UserProfile> = {
        name: name.trim(),
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
          latitude: Number(latitude),
          longitude: Number(longitude),
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
          address: address.trim(),
        },
        additionalInfo: {
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          educationLevel,
          university: university.trim(),
          bio: bio.trim(),
        },
        photos: sanitizedPhotos,
        lastSeen: serverTimestamp(),
      }

      await updateDoc(doc(db, "users", currentUser.uid), updatedData)
      toast.success("Profile updated successfully! ✨")
      setIsEditing(false)
    } catch (err) {
      console.error("Error updating profile:", err)
      toast.error("Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            <div className="relative">
              <img
                src={
                  photos[0] ||
                  currentUser?.photoURL ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
                }
                alt={name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-pink-500/30 shadow-xl"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {name || "User"}
                </h2>
                <span className="text-2xl font-semibold text-slate-400">, {age}</span>
                <span title="Verified Profile">
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {city}, {country}
                </span>
              </div>

              {jobTitle && (
                <p className="text-xs text-slate-300 font-medium">
                  {jobTitle} {company ? `@ ${company}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-5 py-2.5 rounded-2xl font-semibold text-xs transition-all flex items-center space-x-2 shadow-md cursor-pointer ${
                isEditing
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  : "bg-linear-to-r from-rose-500 to-pink-600 text-white shadow-pink-500/20"
              }`}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Preview Profile</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>

            <button
              onClick={logout}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Profile Strength</span>
            </span>
            <span className="font-bold text-pink-400">{completionPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-linear-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-pink-500" />
              <span>Edit Your Profile Details</span>
            </h3>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Manage Photos (Up to 6)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group"
                >
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-pink-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white">
                      Main
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5">
                    {idx !== 0 && (
                      <button
                        onClick={() => makePrimaryPhoto(idx)}
                        className="p-1.5 bg-white text-pink-600 rounded-full hover:scale-110 cursor-pointer"
                        title="Make Main"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removePhoto(idx)}
                      className="p-1.5 bg-rose-600 text-white rounded-full hover:scale-110 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {photos.length < 6 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-pink-500 bg-slate-800/40 hover:bg-slate-800 transition-all flex flex-col items-center justify-center cursor-pointer p-2 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                  <Camera className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {uploadingPhoto ? "Uploading..." : "Add Photo"}
                  </span>
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Age</label>
              <input
                type="number"
                min={18}
                max={100}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-000-0000"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a fun bio..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">University</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Education</label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate Student</option>
                <option value="Bachelor's Degree">Bachelor's Degree</option>
                <option value="Master's Degree">Master's Degree</option>
                <option value="PhD / Doctorate">PhD / Doctorate</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Location Details
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{locating ? "Detecting..." : "Update via GPS"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-400">City</span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400">State</span>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Country</span>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Interests (Select multiple)
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS_OPTIONS.map((item) => {
                const active = interests.includes(item.name)
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleInterest(item.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? "bg-pink-600 text-white border-pink-500"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <span>{item.icon}</span> <span className="ml-1">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-8 py-3 bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save All Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              About Me
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {bio || "No bio added yet. Click Edit Profile to add one!"}
            </p>

            <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
              {jobTitle && (
                <div className="flex items-center space-x-2 text-slate-300">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span>
                    {jobTitle} {company ? `at ${company}` : ""}
                  </span>
                </div>
              )}
              {university && (
                <div className="flex items-center space-x-2 text-slate-300">
                  <GraduationCap className="w-4 h-4 text-sky-400" />
                  <span>{university}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>
                  {city}, {country}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              Lifestyle & Habits
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <p className="text-slate-400 text-[10px]">Drinking</p>
                <p className="font-semibold text-white capitalize">{drinking}</p>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <p className="text-slate-400 text-[10px]">Smoking</p>
                <p className="font-semibold text-white capitalize">{smoking}</p>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <p className="text-slate-400 text-[10px]">Workout</p>
                <p className="font-semibold text-white capitalize">{workout}</p>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <p className="text-slate-400 text-[10px]">Diet</p>
                <p className="font-semibold text-white capitalize">{diet}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              Interests & Passions
            </h4>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3.5 py-1.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/30 text-xs font-semibold"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
