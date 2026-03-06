"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Mic,
  Code,
  Users,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogOut,
  Award,
  Clock,
} from "lucide-react"

type PhaseStatus = "not_started" | "in_progress" | "passed" | "failed"

interface PhaseInfo {
  id: "voice" | "code" | "peer"
  name: string
  description: string
  icon: React.ElementType
  href: string
}

const PHASES: PhaseInfo[] = [
  {
    id: "voice",
    name: "Phase 1: Voice Assessment",
    description: "Explain concepts verbally. We analyze speech patterns, confidence, and content accuracy.",
    icon: Mic,
    href: "/assessment/voice",
  },
  {
    id: "code",
    name: "Phase 2: Code Challenge",
    description: "Write code while explaining your approach. Both code quality and reasoning are evaluated.",
    icon: Code,
    href: "/assessment/code",
  },
  {
    id: "peer",
    name: "Phase 3: Live Peer Session",
    description: "Real-time video discussion with follow-up questions from evaluators.",
    icon: Users,
    href: "/assessment/peer",
  },
]

function getStatusBadge(status: PhaseStatus) {
  switch (status) {
    case "passed":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Passed</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    case "in_progress":
      return <Badge variant="secondary">In Progress</Badge>
    default:
      return <Badge variant="outline">Not Started</Badge>
  }
}

function getStatusIcon(status: PhaseStatus, isLocked: boolean) {
  if (isLocked) {
    return <Lock className="h-5 w-5 text-muted-foreground" />
  }
  switch (status) {
    case "passed":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case "failed":
      return <XCircle className="h-5 w-5 text-destructive" />
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />
  }
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Calculate progress
  const phasesCompleted = user.phases_completed?.length || 0
  const progressPercentage = (phasesCompleted / 3) * 100

  // Check which phases are unlocked
  const isVoiceUnlocked = true
  const isCodeUnlocked = user.voice_status === "passed"
  const isPeerUnlocked = user.code_status === "passed"

  const getPhaseStatus = (phaseId: "voice" | "code" | "peer"): PhaseStatus => {
    switch (phaseId) {
      case "voice":
        return user.voice_status as PhaseStatus
      case "code":
        return user.code_status as PhaseStatus
      case "peer":
        return user.peer_status as PhaseStatus
    }
  }

  const isPhaseUnlocked = (phaseId: "voice" | "code" | "peer"): boolean => {
    switch (phaseId) {
      case "voice":
        return isVoiceUnlocked
      case "code":
        return isCodeUnlocked
      case "peer":
        return isPeerUnlocked
    }
  }

  const getPhaseScore = (phaseId: "voice" | "code" | "peer"): number | null => {
    switch (phaseId) {
      case "voice":
        return user.voice_score
      case "code":
        return user.code_score
      case "peer":
        return user.peer_score
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">SkillBridge</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.display_name}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Verification Status Banner */}
        {user.is_verified && (
          <Card className="mb-8 border-green-500/50 bg-green-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Award className="h-10 w-10 text-green-500" />
              <div>
                <h3 className="font-semibold text-green-700">Verified Professional</h3>
                <p className="text-sm text-muted-foreground">
                  You have completed all assessments with an overall score of {user.overall_score?.toFixed(1)}/10
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              Complete all three phases to earn your SkillBridge verification badge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{phasesCompleted} of 3 phases completed</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              
              {/* Phase indicators */}
              <div className="flex justify-between pt-2">
                {PHASES.map((phase) => {
                  const status = getPhaseStatus(phase.id)
                  const unlocked = isPhaseUnlocked(phase.id)
                  return (
                    <div key={phase.id} className="flex flex-col items-center gap-1">
                      {getStatusIcon(status, !unlocked)}
                      <span className="text-xs text-muted-foreground">
                        {phase.id === "voice" ? "Voice" : phase.id === "code" ? "Code" : "Peer"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Phases */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Assessment Phases</h2>
          <p className="text-muted-foreground">
            Complete each phase in order to progress. You must pass a phase to unlock the next one.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {PHASES.map((phase, index) => {
              const status = getPhaseStatus(phase.id)
              const unlocked = isPhaseUnlocked(phase.id)
              const score = getPhaseScore(phase.id)
              const PhaseIcon = phase.icon

              return (
                <Card
                  key={phase.id}
                  className={`relative ${
                    !unlocked ? "opacity-60" : ""
                  } ${status === "passed" ? "border-green-500/50" : ""}`}
                >
                  {!unlocked && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg z-10 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Pass Phase {index} to unlock
                        </p>
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <PhaseIcon className="h-10 w-10 text-primary" />
                      {getStatusBadge(status)}
                    </div>
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    <CardDescription>{phase.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {score !== null && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Score</span>
                          <span className="text-lg font-bold">{score.toFixed(1)}/10</span>
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      variant={status === "passed" ? "outline" : "default"}
                      disabled={!unlocked}
                      asChild
                    >
                      <Link href={phase.href}>
                        {status === "passed" ? "Review Results" : status === "failed" ? "Retry Assessment" : "Start Assessment"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Quick Stats */}
        {(user.voice_score || user.code_score || user.peer_score) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Your Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {user.voice_score && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Mic className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{user.voice_score.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Voice</p>
                  </div>
                )}
                {user.code_score && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Code className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{user.code_score.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Code</p>
                  </div>
                )}
                {user.peer_score && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{user.peer_score.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Peer</p>
                  </div>
                )}
                {user.overall_score && (
                  <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                    <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{user.overall_score.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Overall</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
