'use client'

import React, { useState, useEffect, useRef } from "react"
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserProfile, ConversationWithProfile } from "@/lib/types"
import { useChat } from "@/hooks/useChat"
import { AudioRecordingService, type RecordingResult } from "@/lib/audio-recorder"
import { unmatchOrBlock } from "@/lib/firestore-service"
import { getLastSeenText, QUICK_REACTIONS } from "@/lib/common-utils"
import {
  Send,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  MapPin,
  Sparkles,
  Search,
  MoreVertical,
  UserX,
  ShieldAlert,
} from "lucide-react"
import toast from "react-hot-toast"

export interface MessageViewProps {
  currentUser?: any
  currentProfile?: UserProfile
  initialChatUser?: UserProfile | null
  onClearInitialChat?: () => void
}

export default function MessageView({
  currentUser,
  currentProfile,
  initialChatUser,
  onClearInitialChat,
}: MessageViewProps) {
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationWithProfile | null>(null)
  const [inputText, setInputText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)

  // Audio Recording Service & live frequency
  const recorderRef = useRef<AudioRecordingService | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [liveAudioLevel, setLiveAudioLevel] = useState(0.2)
  const [pendingRecording, setPendingRecording] = useState<RecordingResult | null>(null)
  const [isSendingAudio, setIsSendingAudio] = useState(false)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Custom Chat Hook integration
  const {
    messages,
    loading: messagesLoading,
    sendText,
    sendAudio,
    handleTyping,
    isOtherUserTyping,
    playAudio,
    playingAudioId,
    playbackProgress,
    playbackSpeed,
    togglePlaybackSpeed,
  } = useChat({
    conversationId: activeConversation?.id || null,
    currentUser: currentProfile || null,
    otherUser: activeConversation?.otherUser || null,
  })

  // 1. Fetch conversations from Firestore Cloud DB
  useEffect(() => {
    if (!currentUser?.uid) {
      setConversations([])
      setActiveConversation(null)
      setLoadingConversations(false)
      return
    }

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    )

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const convList: ConversationWithProfile[] = []

        for (const docSnap of snapshot.docs) {
          const convData = docSnap.data()
          if (convData.archived) continue

          const otherUserId = convData.participants?.find((id: string) => id !== currentUser.uid)
          if (!otherUserId || otherUserId.startsWith("cloud_user") || otherUserId.startsWith("demo")) {
            continue
          }
          let otherUser: UserProfile | undefined

          // Check denormalized participant info first (O(1) optimization)
          if (convData.participantDetails && convData.participantDetails[otherUserId]) {
            const detail = convData.participantDetails[otherUserId]
            otherUser = {
              uid: otherUserId,
              name: detail.name,
              photos: [detail.photo],
              isOnline: detail.isOnline,
            } as UserProfile
          }

          if (!otherUser && otherUserId) {
            try {
              const uSnap = await getDoc(doc(db, "users", otherUserId))
              if (uSnap.exists()) {
                otherUser = { ...(uSnap.data() as UserProfile), uid: otherUserId }
              }
            } catch (e) {
              console.error("Error fetching other user profile:", e)
            }
          }

          convList.push({
            id: docSnap.id,
            participants: convData.participants || [],
            lastMessage: convData.lastMessage,
            lastMessageTime: convData.lastMessageTime,
            lastMessageType: convData.lastMessageType,
            unreadCount: convData.unreadCount,
            isTyping: convData.isTyping,
            otherUser,
          })
        }

        convList.sort((a, b) => {
          const tA = a.lastMessageTime?.seconds || 0
          const tB = b.lastMessageTime?.seconds || 0
          return tB - tA
        })

        setConversations(convList)
        setLoadingConversations(false)
      },
      (err) => {
        console.error("Error loading cloud conversations:", err)
        setConversations([])
        setLoadingConversations(false)
      }
    )

    return () => unsubscribe()
  }, [currentUser?.uid])

  // 2. Select initial chat user if coming from Matches or Discovery
  useEffect(() => {
    if (!initialChatUser) return

    const existingConv = conversations.find(
      (c) => c.otherUser?.uid === initialChatUser.uid
    )

    if (existingConv) {
      setActiveConversation(existingConv)
    } else {
      const convId = currentUser?.uid
        ? [currentUser.uid, initialChatUser.uid].sort().join("_")
        : `conv_${initialChatUser.uid}`

      const newConv: ConversationWithProfile = {
        id: convId,
        participants: currentUser?.uid ? [currentUser.uid, initialChatUser.uid] : [],
        otherUser: initialChatUser,
        lastMessage: "Conversation started",
        lastMessageTime: { seconds: Math.floor(Date.now() / 1000) },
      }

      setConversations((prev) => [newConv, ...prev])
      setActiveConversation(newConv)
    }

    if (onClearInitialChat) onClearInitialChat()
  }, [initialChatUser, conversations, currentUser?.uid, onClearInitialChat])

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      setActiveConversation(conversations[0])
    }
  }, [conversations, activeConversation])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // AUDIO RECORDING PIPELINE
  const handleStartRecording = async () => {
    try {
      recorderRef.current = new AudioRecordingService()
      await recorderRef.current.start((level) => {
        setLiveAudioLevel(level)
      })

      setIsRecording(true)
      setRecordingSeconds(0)
      setPendingRecording(null)

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      toast.error(err.message || "Microphone access denied.")
    }
  }

  const handleStopRecording = async () => {
    if (!recorderRef.current || !isRecording) return

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    try {
      const result = await recorderRef.current.stop()
      setIsRecording(false)
      setPendingRecording(result)
    } catch (err: any) {
      setIsRecording(false)
      console.error("Audio capture error:", err)
      toast.error(err?.message || "Failed to capture audio.")
    }
  }

  const handleCancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    setPendingRecording(null)
    setRecordingSeconds(0)
  }

  const handleSendAudioRecording = async () => {
    if (!pendingRecording) return
    setIsSendingAudio(true)

    try {
      await sendAudio(
        pendingRecording.blob,
        pendingRecording.duration,
        pendingRecording.waveform
      )
      toast.success("Voice message delivered! 🎙️")
      handleCancelRecording()
    } catch (err: any) {
      console.error("Audio send error:", err)
      toast.error(err?.message || "Failed to send audio.")
    } finally {
      setIsSendingAudio(false)
    }
  }

  const handleSendTextMessage = () => {
    if (!inputText.trim()) return
    sendText(inputText)
    setInputText("")
  }

  // Handle Unmatch / Block
  const handleUnmatch = async (action: "unmatch" | "block") => {
    if (!activeConversation || !currentUser?.uid || !activeConversation.otherUser?.uid) return
    setShowOptionsMenu(false)

    try {
      await unmatchOrBlock(
        activeConversation.id,
        currentUser.uid,
        activeConversation.otherUser.uid,
        action
      )
      toast.success(action === "block" ? "User blocked." : "Unmatched successfully.")
      setActiveConversation(null)
    } catch (e) {
      toast.error("Action failed.")
    }
  }

  // Quick Emoji Reaction
  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!currentUser?.uid || !activeConversation) return

    try {
      const msgRef = doc(db, "conversations", activeConversation.id, "messages", msgId)
      const msgDoc = await getDoc(msgRef)
      if (msgDoc.exists()) {
        const data = msgDoc.data()
        const reactions = data.reactions || {}
        const currentList: string[] = reactions[emoji] || []

        const updatedList = currentList.includes(currentUser.uid)
          ? currentList.filter((id: string) => id !== currentUser.uid)
          : [...currentList, currentUser.uid]

        await updateDoc(msgRef, {
          [`reactions.${emoji}`]: updatedList,
        })
      }
    } catch {}
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    return c.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="max-w-6xl mx-auto w-full h-[calc(100vh-140px)] min-h-[550px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex">
      {/* LEFT PANE: Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/90 ${
          activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Messages</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                {conversations.length}
              </span>
            </h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {loadingConversations ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-slate-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 rounded bg-slate-800" />
                    <div className="w-40 h-2.5 rounded bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id
              const other = conv.otherUser
              const avatar =
                other?.photos?.[0] ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`p-3.5 flex items-center space-x-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-slate-800/80 border-l-4 border-pink-500"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt={other?.name || "Match"}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-800"
                    />
                    {other?.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {other?.name || "Match"}
                      </h4>
                      {conv.lastMessageTime && (
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {getLastSeenText(conv.lastMessageTime).replace("Last seen ", "")}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 truncate flex items-center space-x-1">
                      {conv.isTyping && conv.isTyping[other?.uid || ""] ? (
                        <span className="text-pink-400 font-medium italic animate-pulse">
                          Typing...
                        </span>
                      ) : (
                        <span>{conv.lastMessage || "Start chatting..."}</span>
                      )}
                    </p>
                  </div>

                  {currentUser?.uid &&
                    conv.unreadCount?.[currentUser.uid] &&
                    conv.unreadCount[currentUser.uid] > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-bold shrink-0 shadow-sm">
                        {conv.unreadCount[currentUser.uid]}
                      </span>
                    )}
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Active Chat Thread */}
      <div
        className={`flex-1 flex flex-col bg-slate-950/90 ${
          activeConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation && activeConversation.otherUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0 relative">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <img
                    src={
                      activeConversation.otherUser.photos?.[0] ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                    }
                    alt={activeConversation.otherUser.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/40"
                  />
                  {activeConversation.otherUser.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>{activeConversation.otherUser.name}</span>
                    {activeConversation.otherUser.age && (
                      <span className="text-xs text-slate-400 font-normal">
                        ({activeConversation.otherUser.age})
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeConversation.otherUser.isOnline
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-500"
                      }`}
                    />
                    <span>
                      {activeConversation.otherUser.isOnline
                        ? "Active now"
                        : getLastSeenText(activeConversation.otherUser.lastSeen)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center space-x-2">
                {activeConversation.otherUser.location?.city && (
                  <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{activeConversation.otherUser.location.city}</span>
                  </div>
                )}

                {/* Options Menu (Unmatch / Block) */}
                <div className="relative">
                  <button
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    title="Conversation Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showOptionsMenu && (
                    <div className="absolute right-0 top-10 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 text-xs">
                      <button
                        onClick={() => handleUnmatch("unmatch")}
                        className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2 cursor-pointer"
                      >
                        <UserX className="w-4 h-4 text-amber-400" />
                        <span>Unmatch</span>
                      </button>
                      <button
                        onClick={() => handleUnmatch("block")}
                        className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <span>Block User</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-center py-3">
                <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>
                    Matched with {activeConversation.otherUser.name}!
                  </span>
                </div>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === (currentUser?.uid || "current-user")
                const isAudioPlaying = playingAudioId === msg.id

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}
                  >
                    <div
                      className={`relative max-w-xs sm:max-w-md px-4 py-3 rounded-2xl shadow-sm text-sm ${
                        isMe
                          ? "bg-linear-to-r from-rose-500 to-pink-600 text-white rounded-br-xs"
                          : "bg-slate-800/90 text-slate-100 rounded-bl-xs border border-slate-700/60"
                      }`}
                    >
                      {/* Audio Message Player with Waveform & Speed Toggle (Feature 2) */}
                      {msg.type === "audio" && msg.audioUrl ? (
                        <div className="flex flex-col space-y-2 min-w-[210px] sm:min-w-[260px] py-1">
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => playAudio(msg.id, msg.audioUrl!)}
                              className="w-10 h-10 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              )}
                            </button>

                            {/* Waveform Visualization Bars */}
                            <div className="flex-1 flex items-center space-x-0.75 h-7">
                              {(msg.audioWaveform && msg.audioWaveform.length > 0
                                ? msg.audioWaveform
                                : [0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.2, 0.6, 1.0, 0.4, 0.7, 0.3, 0.8, 0.5, 0.9, 0.4]
                              ).map((val, barIdx, arr) => {
                                const barProgress = barIdx / arr.length
                                const isPlayed = isAudioPlaying && barProgress <= playbackProgress
                                return (
                                  <div
                                    key={barIdx}
                                    className={`w-1 rounded-full transition-all duration-150 ${
                                      isPlayed
                                        ? "bg-white shadow"
                                        : isMe
                                        ? "bg-pink-300/50"
                                        : "bg-slate-500/50"
                                    }`}
                                    style={{ height: `${Math.max(15, val * 100)}%` }}
                                  />
                                )
                              })}
                            </div>

                            {/* Speed Multiplier Button */}
                            <button
                              type="button"
                              onClick={togglePlaybackSpeed}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all cursor-pointer ${
                                isMe
                                  ? "bg-white/20 border-white/30 text-white"
                                  : "bg-slate-700 border-slate-600 text-slate-300"
                              }`}
                            >
                              {playbackSpeed}x
                            </button>
                          </div>

                          <div className="flex justify-between items-center text-[10px] opacity-80 px-1">
                            <span>🎙️ Voice Note</span>
                            <span>
                              0:
                              {msg.audioDuration
                                ? String(msg.audioDuration).padStart(2, "0")
                                : "05"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {/* Delivery & Read Receipts (Feature 5) */}
                      <div
                        className={`text-[9px] mt-1.5 flex items-center justify-end space-x-1 ${
                          isMe ? "text-pink-100" : "text-slate-400"
                        }`}
                      >
                        <span>
                          {msg.timestamp?.seconds
                            ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </span>
                        {isMe && (
                          <span title={msg.read ? "Read" : msg.delivered ? "Delivered" : "Sending"}>
                            {msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200 stroke-[2.5]" />
                            ) : msg.delivered ? (
                              <CheckCheck className="w-3.5 h-3.5 text-pink-200" />
                            ) : (
                              <Clock className="w-3 h-3 text-pink-200 animate-spin" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="absolute -bottom-3 right-2 flex space-x-1 bg-slate-900 border border-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-md">
                          {Object.entries(msg.reactions).map(([emoji, uids]) => {
                            if (!uids || uids.length === 0) return null
                            return (
                              <span key={emoji} className="flex items-center space-x-0.5 text-[11px]">
                                <span>{emoji}</span>
                                {uids.length > 1 && (
                                  <span className="text-[9px] text-slate-300 font-bold">
                                    {uids.length}
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-slate-900/90 border border-slate-700/80 rounded-full px-2 py-0.5 mt-1 shadow-md">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReactToMessage(msg.id, emoji)}
                          className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Real-Time Typing Indicator (Feature 1) */}
              {(isOtherUserTyping ||
                (activeConversation.isTyping &&
                  activeConversation.isTyping[activeConversation.otherUser.uid])) && (
                <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-1.5 w-fit">
                  <div className="flex space-x-1 items-center">
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" />
                  </div>
                  <span>{activeConversation.otherUser.name.split(" ")[0]} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* LIVE AUDIO RECORDING BAR (Feature 2) */}
            {isRecording ? (
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping" />
                  <span className="text-xs font-bold text-rose-400">
                    Recording... 0:{String(recordingSeconds).padStart(2, "0")}
                  </span>
                  {/* Live Equalizer Simulation */}
                  <div className="hidden sm:flex items-center space-x-1 h-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-rose-500 rounded-full transition-all"
                        style={{
                          height: `${Math.max(20, Math.min(100, liveAudioLevel * 100 * (i % 2 === 0 ? 1.2 : 0.8)))}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCancelRecording}
                    className="p-2 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Cancel Recording"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : pendingRecording ? (
              /* AUDIO RECORDED READY-TO-SEND BAR */
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => playAudio("preview", pendingRecording.url)}
                    className="p-2 rounded-full bg-pink-500 text-white cursor-pointer hover:scale-105 transition-transform"
                  >
                    {playingAudioId === "preview" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                  <span className="text-xs text-slate-300 font-medium">
                    Ready to send (0:{String(pendingRecording.duration).padStart(2, "0")})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancelRecording}
                    className="p-2 text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSendAudioRecording}
                    disabled={isSendingAudio}
                    className="px-4 py-2 bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow cursor-pointer"
                  >
                    {isSendingAudio ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Audio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* STANDARD INPUT BAR */
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleStartRecording}
                  title="Record Voice Message (MediaRecorder)"
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-pink-400 hover:text-pink-300 border border-slate-700/80 transition-all shrink-0 cursor-pointer"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value)
                      handleTyping(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendTextMessage()
                      }
                    }}
                    placeholder="Type a message or press mic to record voice..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTextMessage}
                  disabled={!inputText.trim()}
                  className="p-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-pink-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-pink-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Your Chat Inbox</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Select a conversation to start chatting in real-time or send audio messages!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
