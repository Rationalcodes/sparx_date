/**
 * Web Audio API Synthesizer for in-app sound effects.
 * Produces crisp, delightful UI sounds with zero external audio assets or downloads!
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  // Play a soft bubble pop when sending a message
  playMessageSent() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(540, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch {}
  }

  // Play a cheerful chime when a message is received
  playMessageReceived() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = "sine"
      osc1.frequency.setValueAtTime(587.33, now) // D5

      osc2.type = "sine"
      osc2.frequency.setValueAtTime(880, now + 0.08) // A5

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.08)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.25)
    } catch {}
  }

  // Play an energetic celebration fanfare for "IT'S A MATCH!"
  playMatchCelebration() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 (Major arpeggio)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const start = now + idx * 0.08

        osc.type = "triangle"
        osc.frequency.setValueAtTime(freq, start)

        gain.gain.setValueAtTime(0.3, start)
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(start)
        osc.stop(start + 0.35)
      })
    } catch {}
  }

  // Play a gentle whoosh/slide sound on card swipe
  playSwipeSound(direction: "left" | "right" | "super" | "like" | "pass" | "superlike") {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      const isLike = direction === "right" || direction === "like"
      const isSuper = direction === "super" || direction === "superlike"

      osc.type = "sine"
      if (isLike) {
        osc.frequency.setValueAtTime(320, now)
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)
      } else if (isSuper) {
        osc.frequency.setValueAtTime(600, now)
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.18)
      } else {
        osc.frequency.setValueAtTime(450, now)
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12)
      }

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.15)
    } catch {}
  }
}

export const soundEffects = new SoundEffectsService()
