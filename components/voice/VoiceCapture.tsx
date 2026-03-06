"use client"

import { useEffect, useCallback } from "react"
import { useVoiceCapture } from "@/hooks/useVoiceCapture"
import { useAudioAnalysis, type AudioMetrics } from "@/hooks/useAudioAnalysis"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, MicOff, Pause, Play, RotateCcw, Send } from "lucide-react"
import { AudioWaveform } from "./AudioWaveform"
import { TranscriptDisplay } from "./TranscriptDisplay"
import { MetricsDisplay } from "./MetricsDisplay"

interface VoiceCaptureProps {
  question: string
  onSubmit: (data: { transcript: string; metrics: AudioMetrics }) => void
  onCancel?: () => void
  maxDuration?: number // in seconds
}

export function VoiceCapture({
  question,
  onSubmit,
  onCancel,
  maxDuration = 180, // 3 minutes default
}: VoiceCaptureProps) {
  const {
    isRecording,
    isPaused,
    transcript,
    interimTranscript,
    error: voiceError,
    duration,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetTranscript,
  } = useVoiceCapture()

  const {
    isAnalyzing,
    metrics,
    waveformData,
    error: audioError,
    startAnalysis,
    stopAnalysis,
    getMetrics,
    resetAnalysis,
  } = useAudioAnalysis()

  const error = voiceError || audioError

  // Auto-stop when max duration reached
  useEffect(() => {
    if (duration >= maxDuration && isRecording) {
      handleStop()
    }
  }, [duration, maxDuration, isRecording])

  const handleStart = useCallback(async () => {
    await Promise.all([startRecording(), startAnalysis()])
  }, [startRecording, startAnalysis])

  const handleStop = useCallback(() => {
    stopRecording()
    stopAnalysis()
  }, [stopRecording, stopAnalysis])

  const handlePause = useCallback(() => {
    pauseRecording()
  }, [pauseRecording])

  const handleResume = useCallback(() => {
    resumeRecording()
  }, [resumeRecording])

  const handleReset = useCallback(() => {
    handleStop()
    resetTranscript()
    resetAnalysis()
  }, [handleStop, resetTranscript, resetAnalysis])

  const handleSubmit = useCallback(() => {
    if (!transcript.trim()) return

    const finalMetrics = getMetrics(transcript)
    onSubmit({
      transcript: transcript.trim(),
      metrics: finalMetrics,
    })
  }, [transcript, getMetrics, onSubmit])

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!isSupported) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>
              Speech recognition is not supported in your browser. Please use
              Chrome, Edge, or Safari for the best experience.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Question Display */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-2">Question</h3>
          <p className="text-foreground">{question}</p>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Audio Waveform Visualization */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isRecording ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {isPaused ? "Paused" : "Recording"}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Ready to record
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold">
                {formatDuration(duration)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatDuration(maxDuration)}
              </span>
            </div>
          </div>

          <AudioWaveform
            data={waveformData}
            isRecording={isRecording && !isPaused}
            volumeLevel={metrics.volumeLevel}
          />

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={handleStart}
                className="gap-2 px-8"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    size="lg"
                    onClick={handleResume}
                    variant="outline"
                    className="gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handlePause}
                    variant="outline"
                    className="gap-2"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </Button>
                )}
                <Button
                  size="lg"
                  onClick={handleStop}
                  variant="destructive"
                  className="gap-2"
                >
                  <MicOff className="w-5 h-5" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Transcript */}
      <TranscriptDisplay
        transcript={transcript}
        interimTranscript={interimTranscript}
        isRecording={isRecording}
      />

      {/* Real-time Metrics */}
      <MetricsDisplay metrics={metrics} isRecording={isRecording} />

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isRecording}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!transcript.trim() || isRecording}
          className="gap-2 px-8"
        >
          <Send className="w-4 h-4" />
          Submit Response
        </Button>
      </div>
    </div>
  )
}
