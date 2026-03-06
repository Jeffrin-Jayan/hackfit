"use client"

import { useMemo } from "react"

interface AudioWaveformProps {
  data: number[]
  isRecording: boolean
  volumeLevel: number
}

export function AudioWaveform({ data, isRecording, volumeLevel }: AudioWaveformProps) {
  // Generate bars for visualization
  const bars = useMemo(() => {
    const barCount = 64
    
    if (!isRecording || data.length === 0) {
      // Show idle bars when not recording
      return Array(barCount).fill(0).map((_, i) => ({
        height: 2 + Math.sin(i * 0.2) * 2,
        opacity: 0.3,
      }))
    }
    
    // Map frequency data to bars
    const step = Math.floor(data.length / barCount)
    return Array(barCount).fill(0).map((_, i) => {
      const dataIndex = Math.min(i * step, data.length - 1)
      const value = data[dataIndex] || 0
      return {
        height: Math.max(4, value * 80),
        opacity: 0.4 + value * 0.6,
      }
    })
  }, [data, isRecording])

  // Volume indicator color
  const volumeColor = useMemo(() => {
    if (!isRecording) return "bg-muted-foreground"
    if (volumeLevel < 0.1) return "bg-yellow-500"
    if (volumeLevel < 0.3) return "bg-green-500"
    if (volumeLevel < 0.7) return "bg-green-400"
    return "bg-red-500"
  }, [isRecording, volumeLevel])

  return (
    <div className="relative">
      {/* Waveform Bars */}
      <div className="flex items-center justify-center gap-[2px] h-24 bg-muted/30 rounded-lg px-4">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-primary transition-all duration-75"
            style={{
              height: `${bar.height}%`,
              opacity: bar.opacity,
              transform: isRecording ? "scaleY(1)" : "scaleY(0.5)",
            }}
          />
        ))}
      </div>

      {/* Volume Level Indicator */}
      <div className="absolute bottom-2 left-4 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((threshold, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                volumeLevel >= threshold ? volumeColor : "bg-muted"
              }`}
              style={{ height: `${8 + i * 4}px` }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {isRecording ? (
            volumeLevel < 0.1 ? "Speak louder" : "Good"
          ) : (
            "Mic ready"
          )}
        </span>
      </div>

      {/* Recording indicator pulse */}
      {isRecording && (
        <div className="absolute top-2 right-4">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
        </div>
      )}
    </div>
  )
}
