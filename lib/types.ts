// ============================================================================
// CORE TYPES
// ============================================================================

export interface UserProfile {
  uid: string
  // Step 1: Basic Info
  name: string
  email: string
  age: number
  gender: string
  phone: string

  // Step 2: Interests
  interests: string[]

  // Step 3: Physical & Looking For
  height: string
  weight: string
  lookingFor: string[]
  ageRange: [number, number]

  // Step 4: Lifestyle
  drinking: string
  smoking: string
  workout: string
  diet: string
  pets: string

  // Step 5: Location
  location: {
    latitude: number
    longitude: number
    city: string
    state: string
    country: string
    address: string
  }

  // Step 6: Career & About
  additionalInfo: {
    jobTitle: string
    company: string
    educationLevel: string
    university: string
    bio: string
  }

  // Step 7: Photos
  photos: string[]

  // System fields
  isVerifiedProfile: boolean
  profileComplete: boolean
  isOnline: boolean
  lastSeen?: any
  createdAt?: any
  distance?: number // Distance in km (calculated dynamically)
}

// ============================================================================
// SWIPES & MATCHES
// ============================================================================

export interface SwipeRecord {
  id?: string
  fromUserId: string
  toUserId: string
  action: "like" | "pass" | "superlike"
  timestamp: any
}

export interface MatchRecord {
  id: string
  users: string[]
  matchedAt: any
  active?: boolean
  status?: string
  lastMessage?: string
  lastMessageTime?: any
  lastMessageType?: "text" | "audio"
}

// ============================================================================
// CHAT TYPES (ADVANCED)
// ============================================================================

export interface ChatMessage {
  id: string
  senderId: string
  content: string
  type: "text" | "audio"
  timestamp: any
  reactions?: { [emoji: string]: string[] }
  audioUrl?: string
  audioDuration?: number
  audioWaveform?: number[]
  read?: boolean
  readAt?: any
  delivered?: boolean
}

export interface Conversation {
  id: string
  participants: string[]
  participantDetails?: {
    [userId: string]: {
      name: string
      photo: string
      isOnline: boolean
    }
  }
  lastMessage?: string
  lastMessageTime?: any
  lastMessageType?: "text" | "audio"
  unreadCount?: { [userId: string]: number }
  isTyping?: { [userId: string]: boolean }
  updatedAt?: any
  archived?: boolean
}

// ============================================================================
// COMPONENT PROPS & UTILITY TYPES
// ============================================================================

export interface ConversationWithProfile extends Conversation {
  otherUser?: UserProfile
}

export interface SavedRecording {
  blob: Blob
  duration: number
  url: string
  waveform?: number[]
}

export interface SelectedConversation {
  conversationId: string
  otherUser: UserProfile
}

export interface FilterOptions {
  maxDistance: number
  ageRange: [number, number]
  gender: string
}
