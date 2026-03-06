"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface AudioMetrics {
  wpm: number
  pauseCount: number
  avgPauseDuration: number
  totalDuration: number
  amplitudeVariance: number
  speakingDuration: number
  pauseRatio: number
  volumeLevel: number
}

export interface AudioAnalysisState {
  isAnalyzing: boolean
  metrics: AudioMetrics
  waveformData: number[]
  volumeHistory: number[]
  error: string | null
}

export interface AudioAnalysisActions {
  startAnalysis: () => Promise<MediaStream | null>
  stopAnalysis: () => void
  getMetrics: (transcript: string) => AudioMetrics
  resetAnalysis: () => void
}

const INITIAL_METRICS: AudioMetrics = {
  wpm: 0,
  pauseCount: 0,
  avgPauseDuration: 0,
  totalDuration: 0,
  amplitudeVariance: 0,
  speakingDuration: 0,
  pauseRatio: 0,
  volumeLevel: 0,
}

export function useAudioAnalysis(): AudioAnalysisState & AudioAnalysisActions {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [metrics, setMetrics] = useState<AudioMetrics>(INITIAL_METRICS)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [volumeHistory, setVolumeHistory] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimestampsRef = useRef<{ start: number; end: number }[]>([])
  const lastVolumeRef = useRef<number>(0)
  const silenceStartRef = useRef<number | null>(null)
  const volumeHistoryRef = useRef<number[]>([])

  // Silence detection threshold
  const SILENCE_THRESHOLD = 0.02
  const MIN_PAUSE_DURATION = 300 // milliseconds

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis()
    }
  }, [])

  const startAnalysis = useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Create audio context
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      // Connect stream to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      mediaStreamRef.current = stream
      startTimeRef.current = Date.now()
      pauseTimestampsRef.current = []
      volumeHistoryRef.current = []
      silenceStartRef.current = null

      setIsAnalyzing(true)
      setError(null)

      // Start audio analysis loop
      const analyze = () => {
        if (!analyserRef.current) return

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate volume level (RMS)
        const sum = dataArray.reduce((acc, val) => acc + val * val, 0)
        const rms = Math.sqrt(sum / bufferLength) / 255
        const volume = Math.min(rms * 2, 1) // Normalize to 0-1

        // Update waveform data for visualization
        const waveform = Array.from(dataArray).map((v) => v / 255)
        setWaveformData(waveform)

        // Track volume history
        volumeHistoryRef.current.push(volume)
        setVolumeHistory([...volumeHistoryRef.current.slice(-100)]) // Keep last 100 values

        // Detect pauses (silence)
        const now = Date.now()
        if (volume < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = now
          }
        } else {
          if (silenceStartRef.current !== null) {
            const pauseDuration = now - silenceStartRef.current
            if (pauseDuration >= MIN_PAUSE_DURATION) {
              pauseTimestampsRef.current.push({
                start: silenceStartRef.current,
                end: now,
              })
            }
            silenceStartRef.current = null
          }
        }

        lastVolumeRef.current = volume

        // Update real-time metrics
        setMetrics((prev) => ({
          ...prev,
          volumeLevel: volume,
          totalDuration: (now - startTimeRef.current) / 1000,
          pauseCount: pauseTimestampsRef.current.length,
        }))

        animationFrameRef.current = requestAnimationFrame(analyze)
      }

      analyze()
      return stream
    } catch (err) {
      console.error("Error starting audio analysis:", err)
      setError("Failed to access microphone. Please check permissions.")
      return null
    }
  }, [])

  const stopAnalysis = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setIsAnalyzing(false)
  }, [])

  const getMetrics = useCallback((transcript: string): AudioMetrics => {
    const totalDuration = (Date.now() - startTimeRef.current) / 1000
    const pauses = pauseTimestampsRef.current
    const volumes = volumeHistoryRef.current

    // Calculate total pause duration
    const totalPauseDuration = pauses.reduce(
      (acc, p) => acc + (p.end - p.start),
      0
    ) / 1000

    // Calculate speaking duration
    const speakingDuration = totalDuration - totalPauseDuration

    // Calculate average pause duration
    const avgPauseDuration = pauses.length > 0
      ? totalPauseDuration / pauses.length
      : 0

    // Calculate WPM
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
    const wpm = speakingDuration > 0 ? (wordCount / speakingDuration) * 60 : 0

    // Calculate amplitude variance (confidence indicator)
    const amplitudeVariance = volumes.length > 0
      ? calculateVariance(volumes)
      : 0

    // Calculate pause ratio
    const pauseRatio = totalDuration > 0 ? totalPauseDuration / totalDuration : 0

    const finalMetrics: AudioMetrics = {
      wpm: Math.round(wpm),
      pauseCount: pauses.length,
      avgPauseDuration: Math.round(avgPauseDuration * 100) / 100,
      totalDuration: Math.round(totalDuration * 100) / 100,
      amplitudeVariance: Math.round(amplitudeVariance * 10000) / 10000,
      speakingDuration: Math.round(speakingDuration * 100) / 100,
      pauseRatio: Math.round(pauseRatio * 100) / 100,
      volumeLevel: lastVolumeRef.current,
    }

    setMetrics(finalMetrics)
    return finalMetrics
  }, [])

  const resetAnalysis = useCallback(() => {
    stopAnalysis()
    setMetrics(INITIAL_METRICS)
    setWaveformData([])
    setVolumeHistory([])
    setError(null)
    pauseTimestampsRef.current = []
    volumeHistoryRef.current = []
    silenceStartRef.current = null
  }, [stopAnalysis])

  return {
    isAnalyzing,
    metrics,
    waveformData,
    volumeHistory,
    error,
    startAnalysis,
    stopAnalysis,
    getMetrics,
    resetAnalysis,
  }
}

// Helper function to calculate variance
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0
  
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
  
  return variance
}
