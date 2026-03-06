"use client"

import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

interface TranscriptDisplayProps {
  transcript: string
  interimTranscript: string
  isRecording: boolean
}

export function TranscriptDisplay({
  transcript,
  interimTranscript,
  isRecording,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, interimTranscript])

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Live Transcript
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="min-h-[120px] max-h-[240px] overflow-y-auto rounded-lg bg-muted/30 p-4"
        >
          {transcript || interimTranscript ? (
            <p className="text-foreground leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-muted-foreground italic">
                  {interimTranscript}
                </span>
              )}
              {isRecording && (
                <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
              )}
            </p>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {isRecording
                ? "Start speaking... Your words will appear here"
                : "Click 'Start Recording' to begin"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
