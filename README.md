<div align="center">

# ⚡ Spark — Real-Time Dating & Matchmaking Platform

**A full-stack, real-time dating application built with Next.js 16 App Router, Firebase Auth & Cloud Firestore, Web Audio DSP, and Tailwind CSS.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat&logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v12-orange?style=flat&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🌟 Overview

**Spark** is a modern, responsive web application engineered to solve the real-world performance, latency, and engagement challenges found in online dating platforms. Unlike static or mock-based applications, Spark operates entirely on a dynamic, distributed cloud backend with 100% real user data, instant bi-directional messaging, and high-fidelity client-side voice recording.

---

## 🚀 Key Features & Architectural Highlights

### 1. Dynamic Geodesic & Algorithmic Match Engine
* **Haversine Vector Filtering**: Automatically calculates geodesic distances between geographical coordinate pairs, allowing users to discover profiles within customizable kilometer ranges.
* **Multi-Factor Weighted Compatibility**: Profiles are dynamically ranked using a weighted compatibility algorithm evaluating:
  * **Interest Overlap**: Jaccard similarity coefficient calculated across hobby, passion, and interest sets.
  * **Lifestyle Alignment**: Concordance matrix evaluating zodiac signs, education levels, and habits (smoking, drinking, exercise).
  * **Activity Recency**: Boosts active and newly onboarded users.

### 2. Low-Latency Real-Time Chat & State Synchronization
* **Bi-Directional Messaging**: Real-time message streaming powered by Firestore subcollection snapshot listeners (`chats/{matchId}/messages`).
* **Instant Unread Badging**: Real-time counter updates tracking unread message states per match without polling.
* **Presence & Heartbeat Engine**: Automatic online/offline status detection using `document.visibilityState` listeners and `beforeunload` lifecycle hooks.

### 3. In-Browser Web Audio DSP & Voice Messaging
* **Client-Side Audio Recording**: Streams raw mic input via `navigator.mediaDevices.getUserMedia` using standard MediaRecorder with WebM/Opus encoding.
* **Audio Frequency Processing**: Visualizes mic levels in real time using the browser's Web Audio API `AudioContext` and `AnalyserNode`.
* **Asynchronous Media Storage**: Securely uploads and streams audio voice notes with progress tracking and metadata tags.

### 4. Resilient Multi-Layered Authentication & State Hydration
* **Firebase Authentication**: Robust email/password and federated authentication handling with automatic session persistence.
* **Zero-Flicker Hydration Architecture**: Synchronous local cache resolution alongside Firestore snapshot synchronization eliminates routing loops and page flashes.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19) |
| **Styling & Design System** | Tailwind CSS v4, Lucide React, Shadcn/UI primitives |
| **Authentication & Cloud Database** | [Google Firebase](https://firebase.google.com/) (Auth, Cloud Firestore) |
| **Media Storage** | Cloud Firestore / Firebase Storage & Cloudinary CDN |
| **Audio Processing** | Web Audio API (`AnalyserNode`), `MediaStream Recording API` |
| **Notifications** | React Hot Toast |
| **Hosting & CI/CD** | [Vercel](https://vercel.com/) |

---

## 📁 Project Structure

```bash
spark-dating/
├── app/
│   ├── discovery/         # Geodesic discovery & candidate swipe feed
│   ├── login/             # Authentication & user sign-in/up
│   ├── matches/           # Active matches list & match notification cards
│   ├── message/           # Real-time chat & audio voice messaging
│   ├── profile/           # User profile editing, hobbies, and photo management
│   ├── user-onboarding/   # Multi-step profile setup & questionnaire
│   ├── layout.tsx         # Global app shell & AuthProvider
│   └── page.tsx           # Hero landing page & dynamic routing gateway
├── components/
│   ├── auth/              # Login & signup modular forms
│   ├── discovery/         # Interactive swipe cards & filter dialogs
│   ├── matches/           # Mutual matches feed & direct chat links
│   ├── message/           # Chat window, message bubbles, audio recorder
│   ├── profile/           # Photo uploaders, tag selectors, preference sliders
│   └── ui/                # Accessible design system components (buttons, dialogs, inputs)
├── context/
│   └── AuthContext.tsx    # Global auth, profile cache, and presence state
├── hooks/
│   ├── useActiveTab.ts    # Navigation state synchronization
│   ├── useChat.ts         # Real-time Firestore chat subscription
│   ├── useFirebaseAuth.ts # Auth action handlers (sign-in, sign-up, sign-out)
│   └── useUserProfile.ts  # Profile CRUD and persistence hooks
├── lib/
│   ├── audio-recorder.ts  # Web Audio API voice recording pipeline
│   ├── firebase.ts        # Resilient Firebase client initialization
│   ├── firestore-service.ts# Discovery querying, swipe actions & match creation
│   ├── sound-effects.ts   # Web Audio synthesized notification sounds
│   └── types.ts           # Unified TypeScript data contracts
└── firestore.rules        # Cloud Firestore security rules
```

---

## ⚙️ Getting Started

### 1. Prerequisites
* **Node.js**: v18.17+ or v20+
* **npm**: v9+ or **pnpm** / **yarn**
* A free [Firebase Project](https://console.firebase.google.com/)

### 2. Clone the Repository
```bash
git clone https://github.com/Rationalcodes/sparx_date.git
cd sparx_date
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Firebase credentials in `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Run the Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Vercel

1. Push your changes to GitHub.
2. Import the repository into [Vercel](https://vercel.com/new).
3. In your Vercel Project Settings under **Environment Variables**, add the `NEXT_PUBLIC_FIREBASE_*` variables defined in your `.env.local`.
4. Deploy! The project includes build-safe static prerendering configurations to ensure clean automated builds.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
