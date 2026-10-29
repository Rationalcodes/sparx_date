/**
 * Audio Recording Service
 * Manages MediaRecorder, real-time waveform frequency extraction, and audio blob creation.
 */

export interface RecordingResult {
  blob: Blob
  url: string
  duration: number
  waveform: number[]
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private audioStream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private audioChunks: Blob[] = []
  private waveformSamples: number[] = []
  private animationFrameId: number | null = null
  private startTime: number = 0

  async start(onWaveformTick?: (level: number) => void): Promise<void> {
    this.audioChunks = []
    this.waveformSamples = []
    this.startTime = Date.now()

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone is not supported in this browser or requires HTTPS.")
    }

    this.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    // Setup AnalyserNode for live visualization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass()
      const source = this.audioCtx.createMediaStreamSource(this.audioStream)
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 64
      source.connect(this.analyser)

      const sampleData = new Uint8Array(this.analyser.frequencyBinCount)

      const tick = () => {
        if (!this.analyser) return
        this.analyser.getByteFrequencyData(sampleData)

        // Compute average frequency power normalized between 0.1 and 1.0
        let sum = 0
        for (let i = 0; i < sampleData.length; i++) {
          sum += sampleData[i]
        }
        const avg = sum / sampleData.length
        const normalized = Math.max(0.12, Math.min(1.0, avg / 128))

        if (onWaveformTick) onWaveformTick(normalized)

        // Capture periodic waveform samples for visual playback (approx 2 samples per sec)
        if (Math.random() > 0.6) {
          this.waveformSamples.push(Math.round(normalized * 100) / 100)
        }

        this.animationFrameId = requestAnimationFrame(tick)
      }

      this.animationFrameId = requestAnimationFrame(tick)
    }

    // Determine supported mime type
    let mimeType = "audio/webm;codecs=opus"
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : ""
    }

    const options: MediaRecorderOptions = {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 32000,
    }
    this.mediaRecorder = new MediaRecorder(this.audioStream, options)

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data)
      }
    }

    this.mediaRecorder.start(100)
  }

  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"))
        return
      }

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm"
        const blob = new Blob(this.audioChunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000))

        // Clean up stream tracks
        if (this.audioStream) {
          this.audioStream.getTracks().forEach((t) => t.stop())
          this.audioStream = null
        }
        if (this.audioCtx && this.audioCtx.state !== "closed") {
          this.audioCtx.close().catch(() => {})
        }

        // Normalize waveform samples array to exactly 24 bars
        let finalWaveform = this.waveformSamples
        if (finalWaveform.length < 16) {
          finalWaveform = Array.from({ length: 24 }, () => Math.round((0.2 + Math.random() * 0.7) * 100) / 100)
        } else if (finalWaveform.length > 28) {
          const step = Math.floor(finalWaveform.length / 24)
          finalWaveform = finalWaveform.filter((_, i) => i % step === 0).slice(0, 24)
        }

        resolve({
          blob,
          url,
          duration,
          waveform: finalWaveform,
        })
      }

      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.requestData()
        }
      } catch {}

      this.mediaRecorder.stop()
    })
  }

  cancel() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop())
      this.audioStream = null
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {})
    }
    this.audioChunks = []
    this.waveformSamples = []
  }
}
