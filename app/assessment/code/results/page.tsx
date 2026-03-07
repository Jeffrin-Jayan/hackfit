"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Code,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Award,
  Clock,
  BarChart3,
} from "lucide-react"

export default function CodeResultsPage() {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (user?.code_status === "passed") {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [user])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const passed = user.code_status === "passed"
  const score = user.code_score || 0

  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("codeResult");
      if (stored) setAssessmentResult(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">SkillBridge</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Result Banner */}
          {assessmentResult && (
            <Card className="mb-8">
              <CardContent>
                {assessmentResult.cheatScore > 5 ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      AI assistance detected during your attempt. Results may be invalid.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="default" className="mb-4">
                    <AlertDescription>No cheating behavior detected.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardHeader>
                <CardTitle>Submission Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Language:</strong> {assessmentResult.language}
                  </div>
                  <div>
                    <strong>Time Used:</strong> {assessmentResult.timeUsed} seconds
                  </div>
                  <div>
                    <strong>Cheating score:</strong> {assessmentResult.cheatScore}
                  </div>
                  <details className="mt-2">
                    <summary className="font-medium">Compile result</summary>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(assessmentResult.compileResult, null, 2)}
                    </pre>
                  </details>
                  <details className="mt-2">
                    <summary className="font-medium">Submitted code</summary>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                      {assessmentResult.submittedCode}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className={`mb-8 ${passed ? "border-green-500/50" : "border-destructive/50"}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                {passed ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-green-600 mb-2">
                      Code Challenge Passed!
                    </h1>
                    <p className="text-muted-foreground">
                      Excellent work! You have demonstrated strong coding skills and problem-solving ability.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-3xl font-bold text-destructive mb-2">
                      Not Quite There Yet
                    </h1>
                    <p className="text-muted-foreground">
                      Keep practicing! Review the feedback below and try again.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Score Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Your Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl font-bold">{score.toFixed(1)}</span>
                <span className="text-2xl text-muted-foreground">/ 10</span>
              </div>
              <Progress value={score * 10} className="h-3 mb-4" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Passing Score: 6.0</span>
                <span className={score >= 6 ? "text-green-600" : "text-destructive"}>
                  {score >= 6 ? "Passed" : "Below threshold"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Breakdown */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Evaluation Breakdown</CardTitle>
              <CardDescription>
                How your code was assessed across different criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Code Correctness", score: 8.0, description: "Test cases passed" },
                  { name: "Code Quality", score: 7.5, description: "Clean, readable code" },
                  { name: "Efficiency", score: 7.0, description: "Time & space complexity" },
                  { name: "Explanation Quality", score: 7.0, description: "Understanding demonstrated" },
                ].map((metric) => (
                  <div key={metric.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{metric.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          - {metric.description}
                        </span>
                      </div>
                      <span className="font-bold">{metric.score.toFixed(1)}</span>
                    </div>
                    <Progress value={metric.score * 10} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {passed ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You have unlocked Phase 3: Live Peer Session. This is the final step to earn your SkillBridge verification badge.
                  </p>
                  <div className="flex gap-4">
                    <Button asChild className="flex-1">
                      <Link href="/assessment/peer">
                        Start Peer Session
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Return to Dashboard</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Review the feedback above and try the code challenge again when you are ready.
                  </p>
                  <div className="flex gap-4">
                    <Button asChild className="flex-1">
                      <Link href="/assessment/code">
                        Retry Challenge
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Return to Dashboard</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
