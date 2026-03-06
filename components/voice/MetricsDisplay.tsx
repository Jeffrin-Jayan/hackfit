"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { type AudioMetrics } from "@/hooks/useAudioAnalysis"
import { Activity, Clock, Pause, Gauge } from "lucide-react"

interface MetricsDisplayProps {
  metrics: AudioMetrics
  isRecording: boolean
}

export function MetricsDisplay({ metrics, isRecording }: MetricsDisplayProps) {
  // WPM evaluation (ideal range: 120-150 WPM)
  const getWpmStatus = (wpm: number) => {
    if (wpm === 0) return { label: "N/A", color: "text-muted-foreground" }
    if (wpm < 100) return { label: "Slow", color: "text-yellow-500" }
    if (wpm <= 160) return { label: "Good", color: "text-green-500" }
    return { label: "Fast", color: "text-orange-500" }
  }

  // Pause ratio evaluation (ideal: 10-25%)
  const getPauseStatus = (ratio: number) => {
    if (ratio === 0) return { label: "N/A", color: "text-muted-foreground" }
    if (ratio < 0.1) return { label: "Minimal", color: "text-yellow-500" }
    if (ratio <= 0.3) return { label: "Natural", color: "text-green-500" }
    return { label: "Many", color: "text-orange-500" }
  }

  const wpmStatus = getWpmStatus(metrics.wpm)
  const pauseStatus = getPauseStatus(metrics.pauseRatio)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Behavioral Signals
          {isRecording && (
            <span className="text-xs text-muted-foreground font-normal">
              (Live)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* WPM */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Speed</span>
              <Gauge className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{metrics.wpm}</span>
              <span className="text-sm text-muted-foreground">WPM</span>
            </div>
            <span className={`text-xs ${wpmStatus.color}`}>
              {wpmStatus.label}
            </span>
          </div>

          {/* Pauses */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pauses</span>
              <Pause className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{metrics.pauseCount}</span>
              <span className="text-sm text-muted-foreground">total</span>
            </div>
            <span className={`text-xs ${pauseStatus.color}`}>
              {pauseStatus.label}
            </span>
          </div>

          {/* Speaking Time */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Speaking</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {Math.round(metrics.speakingDuration)}
              </span>
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
            <Progress
              value={(1 - metrics.pauseRatio) * 100}
              className="h-1"
            />
          </div>

          {/* Confidence (Amplitude Variance) */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Variation</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {Math.round(metrics.amplitudeVariance * 1000)}
              </span>
              <span className="text-sm text-muted-foreground">amp</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {metrics.amplitudeVariance > 0.01 ? "Animated" : "Steady"}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-xs text-muted-foreground mt-4">
          These behavioral signals help verify authentic responses. Natural
          speech has varied pace, thoughtful pauses, and vocal variation.
        </p>
      </CardContent>
    </Card>
  )
}
