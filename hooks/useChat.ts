'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ChatMessage, UserProfile } from "@/lib/types"
import {
  sendChatMessage,
  markConversationAsRead,
  updateTypingStatus,
} from "@/lib/firestore-service"
import { soundEffects } from "@/lib/sound-effects"
import { uploadMedia } from "@/lib/cloudinary"

interface UseChatOptions {
  conversationId: string | null
  currentUser: UserProfile | null
  otherUser: UserProfile | null
}

export function useChat({ conversationId, currentUser, otherUser }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState<boolean>(false)

  // Typing debounce timer ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef<boolean>(false)

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState<number>(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)

  // 1. Listen for real-time messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)

    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    )

    let isInitialLoad = true

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const updatedMessages: ChatMessage[] = []
      snapshot.docs.forEach((docSnap) => {
        updatedMessages.push({
          ...(docSnap.data() as ChatMessage),
          id: docSnap.id,
        })
      })

      setMessages(updatedMessages)
      setLoading(false)

      // Play sound on newly received message
      if (!isInitialLoad && snapshot.docChanges().length > 0) {
        const hasIncomingNew = snapshot
          .docChanges()
          .some(
            (change) =>
              change.type === "added" &&
              change.doc.data().senderId !== currentUser?.uid
          )
        if (hasIncomingNew) {
          soundEffects.playMessageReceived()
        }
      }
      isInitialLoad = false

      // Mark conversation as read
      if (currentUser?.uid) {
        markConversationAsRead(conversationId, currentUser.uid).catch(() => {})
      }
    })

    return () => unsubscribe()
  }, [conversationId, currentUser?.uid, otherUser?.uid])

  // 2. Typing status handler
  const handleTyping = useCallback(
    (text: string) => {
      if (!conversationId || !currentUser?.uid) return

      if (text.length > 0) {
        if (!isTypingRef.current) {
          isTypingRef.current = true
          updateTypingStatus(conversationId, currentUser.uid, true)
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false
          updateTypingStatus(conversationId, currentUser.uid, false)
        }, 2000)
      } else {
        if (isTypingRef.current) {
          isTypingRef.current = false
          updateTypingStatus(conversationId, currentUser.uid, false)
        }
      }
    },
    [conversationId, currentUser?.uid]
  )

  // 3. Send Text Message with Optimistic UI Update
  const sendText = useCallback(
    async (content: string) => {
      if (!content.trim() || !conversationId || !currentUser || !otherUser) return

      const trimmed = content.trim()
      soundEffects.playMessageSent()

      // Optimistic message
      const tempId = `temp_${Date.now()}`
      const optimisticMsg: ChatMessage = {
        id: tempId,
        senderId: currentUser.uid,
        content: trimmed,
        type: "text",
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
        read: false,
        delivered: false,
      }

      setMessages((prev) => [...prev, optimisticMsg])

      try {
        await sendChatMessage({
          conversationId,
          senderId: currentUser.uid,
          recipientId: otherUser.uid,
          content: trimmed,
          type: "text",
        })
      } catch (err) {
        console.error("Error sending chat message:", err)
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    },
    [conversationId, currentUser, otherUser]
  )

  // 4. Send Voice / Audio Note
  const sendAudio = useCallback(
    async (audioBlob: Blob, duration: number, waveform: number[]) => {
      if (!conversationId || !currentUser || !otherUser) {
        throw new Error("Cannot send voice message: Conversation or user not found.")
      }

      soundEffects.playMessageSent()

      const tempId = `temp_audio_${Date.now()}`
      const previewUrl = URL.createObjectURL(audioBlob)

      // Optimistic Audio Message in UI
      const optimisticAudioMsg: ChatMessage = {
        id: tempId,
        senderId: currentUser.uid,
        content: "Voice Message",
        type: "audio",
        audioUrl: previewUrl,
        audioDuration: duration,
        audioWaveform: waveform,
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
        read: false,
        delivered: false,
      }
      setMessages((prev) => [...prev, optimisticAudioMsg])

      try {
        // Upload audio media (Cloudinary -> Firebase Storage -> fast inline Data URL)
        const audioUrl = await uploadMedia(audioBlob, "video")

        const newDocId = await sendChatMessage({
          conversationId,
          senderId: currentUser.uid,
          recipientId: otherUser.uid,
          content: "Voice Message",
          type: "audio",
          audioUrl,
          audioDuration: duration,
          audioWaveform: waveform,
        })

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: newDocId, audioUrl, delivered: true } : m
          )
        )
      } catch (err: any) {
        console.error("Failed to upload/send audio note:", err)
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        throw err
      }
    },
    [conversationId, currentUser, otherUser]
  )

  // 5. Audio Playback Control with Speed toggle & Progress Scrubbing
  const playAudio = useCallback(
    (messageId: string, audioUrl: string) => {
      if (playingAudioId === messageId) {
        activeAudioRef.current?.pause()
        setPlayingAudioId(null)
        return
      }

      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
      }

      const audio = new Audio(audioUrl)
      audio.playbackRate = playbackSpeed
      activeAudioRef.current = audio
      setPlayingAudioId(messageId)
      setPlaybackProgress(0)

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress(audio.currentTime / audio.duration)
        }
      }

      audio.onended = () => {
        setPlayingAudioId(null)
        setPlaybackProgress(0)
      }

      audio.play().catch(() => {
        setPlayingAudioId(null)
      })
    },
    [playingAudioId, playbackSpeed]
  )

  const togglePlaybackSpeed = useCallback(() => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1
    setPlaybackSpeed(nextSpeed)
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = nextSpeed
    }
  }, [playbackSpeed])

  return {
    messages,
    loading,
    sendText,
    sendAudio,
    handleTyping,
    isOtherUserTyping,
    playAudio,
    playingAudioId,
    playbackProgress,
    playbackSpeed,
    togglePlaybackSpeed,
  }
}
