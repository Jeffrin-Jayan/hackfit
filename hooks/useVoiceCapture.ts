"use client"

import { useState, useRef, useEffect, useCallback } from "react"

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

export function useVoiceCapture(): VoiceCaptureState & VoiceCaptureActions {

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // prevents duplicate starts
  const isRunningRef = useRef(false)

  useEffect(() => {

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
    }

  }, [])

  useEffect(() => {

    return () => {

      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

    }

  }, [])

  const startRecording = useCallback(async () => {

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser")
      return
    }

    if (isRunningRef.current) {
      return
    }

    try {

      await navigator.mediaDevices.getUserMedia({ audio: true })

      const recognition: any = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {

        isRunningRef.current = true

        setIsRecording(true)
        setError(null)

        startTimeRef.current = Date.now()

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
        }

        durationIntervalRef.current = setInterval(() => {

          setDuration(
            Math.floor((Date.now() - startTimeRef.current) / 1000)
          )

        }, 1000)

      }

      recognition.onresult = (event: any) => {

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
          setTranscript(prev => prev + finalTranscript)
        }

        setInterimTranscript(interim)

      }

      recognition.onerror = (event: any) => {

  // ignore common unstable network errors from Web Speech API
    if (event.error === "network") {
    return
      }
        if (event.error === "not-allowed") {
          setError("Microphone access denied")
        }

      }

      recognition.onend = () => {

        isRunningRef.current = false

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }

        setIsRecording(false)

      }

      recognitionRef.current = recognition

      recognition.start()

    } catch (err) {

      console.error("Recording error:", err)
      setError("Failed to start recording")

    }

  }, [])

  const stopRecording = useCallback(() => {

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    isRunningRef.current = false

    setIsRecording(false)
    setIsPaused(false)
    setInterimTranscript("")

  }, [])

  const pauseRecording = useCallback(() => {

    if (recognitionRef.current && isRunningRef.current) {

      try { recognitionRef.current.stop() } catch {}

      setIsPaused(true)

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

    }

  }, [])

  const resumeRecording = useCallback(() => {

    if (!recognitionRef.current) {
      startRecording()
      return
    }

    if (!isRunningRef.current) {
      try { recognitionRef.current.start() } catch {}
    }

    setIsPaused(false)

  }, [startRecording])

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