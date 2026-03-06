"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface VoiceCaptureState {
  isRecording: boolean
  isPaused: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  duration: number
  isSupported: boolean
}

export interface VoiceCaptureActions {
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetTranscript: () => void
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export function useVoiceCapture(): VoiceCaptureState & VoiceCaptureActions {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser")
      return
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setIsRecording(true)
        setIsPaused(false)
        setError(null)
        startTimeRef.current = Date.now()

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ""
        let interim = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " "
          } else {
            interim += result[0].transcript
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript)
        }
        setInterimTranscript(interim)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error)
        
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please allow microphone access.")
        } else if (event.error === "no-speech") {
          // This is normal, don't show error
        } else {
          setError(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        // Auto-restart if we're still supposed to be recording
        if (isRecording && !isPaused) {
          recognition.start()
        } else {
          setIsRecording(false)
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current)
          }
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Failed to start recording. Please check microphone permissions.")
    }
  }, [isRecording, isPaused])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      setIsRecording(false)
      setIsPaused(false)
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    setInterimTranscript("")
  }, [])

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      setIsPaused(true)
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [isRecording])

  const resumeRecording = useCallback(() => {
    if (recognitionRef.current && isPaused) {
      recognitionRef.current.start()
      setIsPaused(false)
      
      // Resume duration timer
      const pausedDuration = duration
      startTimeRef.current = Date.now() - pausedDuration * 1000
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
  }, [isPaused, duration])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setDuration(0)
    setError(null)
  }, [])

  return {
    isRecording,
    isPaused,
    transcript,
    interimTranscript,
    error,
    duration,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetTranscript,
  }
}
