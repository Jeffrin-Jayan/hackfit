"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  Share2,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"

interface DimensionScore {
  dimension: string
  score: number
  feedback: string
}

interface EvaluationResult {
  overall_score: number
  passed: boolean
  dimensions: DimensionScore[]
  blind_spots: string[]
  strengths: string[]
  recommendations: string[]
}

interface AggregateData {
  overall_score: number
  passed: boolean
  dimensions: { dimension: string; score: number }[]
  blind_spots: string[]
  strengths: string[]
  recommendations: string[]
}

interface AssessmentResults {
  sessionId: string
  topic: string
  difficulty: string
  responses: {
    questionId: string
    question: string
    transcript: string
    evaluation: EvaluationResult
  }[]
  aggregate?: AggregateData
  submittedAt: string
}

// Map dimension IDs to display names
const DIMENSION_LABELS: Record<string, string> = {
  content_accuracy: "Accuracy",
  conceptual_depth: "Depth",
  explanation_clarity: "Clarity",
  real_world_application: "Application",
  response_spontaneity: "Spontaneity",
  technical_vocabulary: "Vocabulary",
  logical_flow: "Flow",
  confidence_indicators: "Confidence",
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<AssessmentResults | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("assessmentResults")
    if (stored) {
      setResults(JSON.parse(stored))
    } else {
      router.push("/assessment")
    }
  }, [router])

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Use aggregate data from API if available, otherwise calculate from responses
  let radarData: { dimension: string; score: number; fullMark: number }[]
  let overallScore: number
  let passed: boolean
  let allBlindSpots: string[]
  let allStrengths: string[]
  let allRecommendations: string[]

  if (results.aggregate) {
    // Use pre-calculated aggregate from API
    radarData = results.aggregate.dimensions.map((d) => ({
      dimension: DIMENSION_LABELS[d.dimension] || d.dimension,
      score: d.score,
      fullMark: 10,
    }))
    overallScore = results.aggregate.overall_score
    passed = results.aggregate.passed
    allBlindSpots = results.aggregate.blind_spots || []
    allStrengths = results.aggregate.strengths || []
    allRecommendations = results.aggregate.recommendations || []
  } else {
    // Calculate aggregate scores from all responses (fallback)
    const aggregateScores = results.responses.reduce(
      (acc, response) => {
        response.evaluation.dimensions.forEach((dim) => {
          if (!acc[dim.dimension]) {
            acc[dim.dimension] = { total: 0, count: 0 }
          }
          acc[dim.dimension].total += dim.score
          acc[dim.dimension].count += 1
        })
        return acc
      },
      {} as Record<string, { total: number; count: number }>
    )

    radarData = Object.entries(aggregateScores).map(([dimension, data]) => ({
      dimension: DIMENSION_LABELS[dimension] || dimension,
      score: Math.round((data.total / data.count) * 10) / 10,
      fullMark: 10,
    }))

    overallScore =
      radarData.length > 0
        ? radarData.reduce((sum, d) => sum + d.score, 0) / radarData.length
        : 0
    passed = overallScore >= 6.0

    allBlindSpots = [...new Set(results.responses.flatMap((r) => r.evaluation.blind_spots || []))]
    allStrengths = [...new Set(results.responses.flatMap((r) => r.evaluation.strengths || []))]
    allRecommendations = [...new Set(results.responses.flatMap((r) => r.evaluation.recommendations || []))]
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold">SkillBridge</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Download Report
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Result Header */}
        <div className="text-center mb-10">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
              passed ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
            }`}
          >
            {passed ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-semibold">
              {passed ? "Assessment Passed" : "Assessment Not Passed"}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {results.topic} Assessment Results
          </h1>
          <p className="text-muted-foreground">
            Difficulty: {results.difficulty} | Submitted:{" "}
            {new Date(results.submittedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Overall Score Card */}
          <Card className="border-2">
            <CardHeader className="text-center pb-2">
              <CardTitle>Overall Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div
                className={`text-7xl font-bold mb-2 ${
                  passed ? "text-green-500" : "text-red-500"
                }`}
              >
                {overallScore.toFixed(1)}
              </div>
              <p className="text-muted-foreground mb-4">out of 10.0</p>
              <Progress
                value={overallScore * 10}
                className={`h-3 w-full ${passed ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"}`}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Passing threshold: 6.0
              </p>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="border-2">
            <CardHeader className="text-center pb-2">
              <CardTitle>Dimension Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dimension Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Detailed Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {radarData.map((item) => (
                <div
                  key={item.dimension}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <span className="font-medium">{item.dimension}</span>
                  <div className="flex items-center gap-3">
                    <Progress value={item.score * 10} className="w-24 h-2" />
                    <span
                      className={`font-bold w-10 text-right ${
                        item.score >= 7 ? "text-green-500" : item.score >= 5 ? "text-yellow-500" : "text-red-500"
                      }`}
                    >
                      {item.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Strengths */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <TrendingUp className="w-4 h-4" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {allStrengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {strength}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Blind Spots */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-4 h-4" />
                Blind Spots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {allBlindSpots.map((blindSpot, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    {blindSpot}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                <Lightbulb className="w-4 h-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {allRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/assessment">Take Another Assessment</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/">
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
