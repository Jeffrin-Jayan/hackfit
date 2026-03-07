"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { audioApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  CheckCircle2,
  XCircle,
  Shield,
  Volume2,
} from "lucide-react"

type SetupStep = "permissions" | "mic-test" | "ready"

export default function AssessmentSetupPage() {

  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<SetupStep>("permissions")
  const [micPermission, setMicPermission] = useState<"pending" | "granted" | "denied">("pending")
  const [micLevel, setMicLevel] = useState(0)
  const [isTesting, setIsTesting] = useState(false)
  const [testPassed, setTestPassed] = useState(false)
  const [testAttempted, setTestAttempted] = useState(false)
  const [aiDetected, setAiDetected] = useState<boolean | null>(null)

  const [config, setConfig] = useState<{
    topic: string
    difficulty: string
    type: string
  } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("assessmentConfig")
    if (stored) {
      setConfig(JSON.parse(stored))
    } else {
      router.push("/assessment")
    }
  }, [router])

  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicPermission("granted")
      setCurrentStep("mic-test")
    } catch (error) {
      console.error("Mic permission error:", error)
      setMicPermission("denied")
    }
  }, [])

  const testMicrophone = useCallback(async () => {

    setIsTesting(true)
    setTestPassed(false)
    setTestAttempted(false)
    setAiDetected(null)

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      source.connect(analyser)

      analyser.fftSize = 256
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      let maxLevel = 0

      const checkLevel = () => {

        analyser.getByteFrequencyData(dataArray)

        const sum = dataArray.reduce((a, b) => a + b, 0)
        const level = (sum / dataArray.length / 255) * 100

        setMicLevel(level)

        console.log("Mic level:", level)

        if (level > 1) {
          maxLevel = Math.max(maxLevel, level)
        }

      }

      const interval = setInterval(checkLevel, 100)

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream)

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.start()

      setTimeout(async () => {

        clearInterval(interval)
        recorder.stop()

        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()

        setIsTesting(false)

        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" })

        try {

                    type AudioTestResponse = {
            aiDetected: boolean
          }

          const resp = await audioApi.uploadTest(blob) as AudioTestResponse

          setAiDetected(resp.aiDetected)
          console.log("AI detection result:", resp.aiDetected)

        } catch (err) {

          console.error("Upload failed", err)

        }

        if (maxLevel > 2) {
          setTestPassed(true)
          setCurrentStep("ready")
        } else {
          setTestPassed(false)
        }

        setTestAttempted(true)

      }, 3000)

    } catch (error) {

      console.error("Mic test error:", error)
      setIsTesting(false)

    }

  }, [])

  const startAssessment = useCallback(() => {

    if (config?.type === "voice") {
      router.push("/assessment/voice")
    } else {
      router.push("/assessment/code")
    }

  }, [config, router])

  const stepProgress = {
    permissions: 33,
    "mic-test": 66,
    ready: 100,
  }

  if (!config) return null

  return (

    <div className="min-h-screen bg-background">

      <header className="border-b">

        <div className="container mx-auto px-4 py-4 flex items-center justify-between">

          <Link
            href="/assessment"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold">SkillBridge</span>
          </div>

        </div>

      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">

        <div className="mb-8">

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Pre-Assessment Setup</span>
            <span>{stepProgress[currentStep]}%</span>
          </div>

          <Progress value={stepProgress[currentStep]} className="h-2" />

        </div>

        {currentStep === "permissions" && (

          <Card>

            <CardHeader>

              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Microphone Permission
              </CardTitle>

              <CardDescription>
                SkillBridge needs microphone access to record your responses.
              </CardDescription>

            </CardHeader>

            <CardContent className="flex flex-col items-center gap-6 py-8">

              {micPermission === "pending" && (
                <Button onClick={requestMicPermission} size="lg">
                  Allow Microphone Access
                </Button>
              )}

              {micPermission === "granted" && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="w-6 h-6" />
                  Permission granted
                </div>
              )}

              {micPermission === "denied" && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    Microphone access denied. Enable it in browser settings.
                  </AlertDescription>
                </Alert>
              )}

            </CardContent>

          </Card>

        )}

        {currentStep === "mic-test" && (

          <Card>

            <CardHeader>

              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Microphone Test
              </CardTitle>

              <CardDescription>
                Speak into your microphone for a few seconds.
              </CardDescription>

            </CardHeader>

            <CardContent className="flex flex-col items-center gap-6 py-8">

              <div className="w-full max-w-xs">

                <div className="flex items-end justify-center gap-1 h-24">

                  {Array.from({ length: 20 }).map((_, i) => (

                    <div
                      key={i}
                      className={`w-3 rounded-t ${
                        i < micLevel / 5
                          ? micLevel > 2
                            ? "bg-green-500"
                            : "bg-yellow-500"
                          : "bg-muted"
                      }`}
                      style={{ height: `${20 + i * 4}%` }}
                    />

                  ))}

                </div>

                <p className="text-center text-sm text-muted-foreground mt-2">
                  {isTesting ? "Speak now..." : "Click test to begin"}
                </p>

              </div>

              <Button onClick={testMicrophone} disabled={isTesting} size="lg">
                {isTesting ? "Testing..." : "Test Microphone"}
              </Button>

              {testAttempted && (
                testPassed ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                    Microphone working
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-6 h-6" />
                    Microphone not working
                  </div>
                )
              )}

              {aiDetected !== null && (
                <p className="text-sm">
                  AI presence detected: {aiDetected ? "Yes" : "No"}
                </p>
              )}

            </CardContent>

          </Card>

        )}

        {currentStep === "ready" && (

          <Card>

            <CardHeader>
              <CardTitle>Ready to Begin</CardTitle>
            </CardHeader>

            <CardContent>

              <Button onClick={startAssessment} size="lg">
                Start Assessment
              </Button>

            </CardContent>

          </Card>

        )}

      </main>

    </div>

  )

}