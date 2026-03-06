"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  MicOff,
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
  const [config, setConfig] = useState<{
    topic: string
    difficulty: string
    type: string
  } | null>(null)

  // Load config from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("assessmentConfig")
    if (stored) {
      setConfig(JSON.parse(stored))
    } else {
      router.push("/assessment")
    }
  }, [router])

  // Request microphone permission
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

  // Test microphone
  const testMicrophone = useCallback(async () => {
    setIsTesting(true)
    setTestPassed(false)

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
        if (!isTesting) return

        analyser.getByteFrequencyData(dataArray)
        const sum = dataArray.reduce((a, b) => a + b, 0)
        const level = (sum / dataArray.length / 255) * 100

        setMicLevel(level)
        if (level > 10) {
          maxLevel = Math.max(maxLevel, level)
        }
      }

      const interval = setInterval(checkLevel, 100)

      // Test for 3 seconds
      setTimeout(() => {
        clearInterval(interval)
        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()
        setIsTesting(false)

        if (maxLevel > 15) {
          setTestPassed(true)
          setCurrentStep("ready")
        } else {
          setTestPassed(false)
        }
      }, 3000)
    } catch (error) {
      console.error("Mic test error:", error)
      setIsTesting(false)
    }
  }, [isTesting])

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

  if (!config) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/assessment"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
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
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Pre-Assessment Setup</span>
            <span>{stepProgress[currentStep]}%</span>
          </div>
          <Progress value={stepProgress[currentStep]} className="h-2" />
        </div>

        {/* Assessment Info */}
        <Card className="mb-8 bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Topic</p>
                <p className="font-medium">{config.topic}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <p className="font-medium capitalize">{config.difficulty}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{config.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step: Permissions */}
        {currentStep === "permissions" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Microphone Permission
              </CardTitle>
              <CardDescription>
                SkillBridge needs access to your microphone to record your
                responses for evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 py-8">
              {micPermission === "pending" && (
                <>
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <Mic className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <Button onClick={requestMicPermission} size="lg" className="gap-2">
                    Allow Microphone Access
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}

              {micPermission === "granted" && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-medium">Permission granted</span>
                </div>
              )}

              {micPermission === "denied" && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    Microphone access was denied. Please enable it in your
                    browser settings and refresh the page.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Mic Test */}
        {currentStep === "mic-test" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Microphone Test
              </CardTitle>
              <CardDescription>
                Let's make sure your microphone is working properly. Speak into
                your microphone for a few seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 py-8">
              {/* Volume Level Indicator */}
              <div className="w-full max-w-xs">
                <div className="flex items-end justify-center gap-1 h-24">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 rounded-t transition-all duration-75 ${
                        i < micLevel / 5
                          ? micLevel > 15
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

              {!testPassed ? (
                <Button
                  onClick={testMicrophone}
                  disabled={isTesting}
                  size="lg"
                  className="gap-2"
                >
                  {isTesting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Test Microphone
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-medium">Microphone working</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Ready */}
        {currentStep === "ready" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Ready to Begin
              </CardTitle>
              <CardDescription>
                Your setup is complete. Here's what to expect during the
                assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Answer Questions</p>
                    <p className="text-sm text-muted-foreground">
                      You'll receive 3-5 questions about {config.topic}. Explain
                      your answers verbally.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Speak Naturally</p>
                    <p className="text-sm text-muted-foreground">
                      Think out loud. Natural pauses and self-corrections are
                      fine — we're measuring understanding, not polish.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Get Results</p>
                    <p className="text-sm text-muted-foreground">
                      After submission, our AI evaluates your responses across 8
                      dimensions and provides detailed feedback.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={startAssessment} size="lg" className="gap-2 mt-4">
                Start Assessment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
