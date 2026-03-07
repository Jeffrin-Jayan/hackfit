"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

    try {

      const stored = sessionStorage.getItem("assessmentResults")

      if (!stored) {
        router.push("/assessment")
        return
      }

      const parsed = JSON.parse(stored)
      setResults(parsed)

    } catch (error) {

      console.error("Invalid results data", error)
      router.push("/assessment")

    }

  }, [router])


  if (!results) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )

  }

  if (!results.responses) {

    return (
      <div className="p-10 text-center">
        No assessment results available
      </div>
    )

  }

  let radarData: { dimension: string; score: number; fullMark: number }[] = []
  let overallScore = 0
  let passed = false
  let allBlindSpots: string[] = []
  let allStrengths: string[] = []
  let allRecommendations: string[] = []

  if (results.aggregate) {

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

    const aggregateScores = results.responses.reduce(
      (acc, response) => {

        response.evaluation?.dimensions?.forEach((dim) => {

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

    passed = overallScore >= 6

    allBlindSpots = [
      ...new Set(results.responses.flatMap((r) => r.evaluation?.blind_spots || [])),
    ]

    allStrengths = [
      ...new Set(results.responses.flatMap((r) => r.evaluation?.strengths || [])),
    ]

    allRecommendations = [
      ...new Set(results.responses.flatMap((r) => r.evaluation?.recommendations || [])),
    ]

  }

  return (

    <div className="min-h-screen bg-background">

      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between">

          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold">SkillBridge</span>
          </div>

          <div className="flex gap-2">

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>

            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

          </div>

        </div>
      </header>


      <main className="container mx-auto px-4 py-8 max-w-5xl">

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

        </div>


        <div className="grid lg:grid-cols-2 gap-8 mb-10">

          <Card>
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
            </CardHeader>

            <CardContent className="text-center">

              <div className="text-7xl font-bold mb-4">
                {overallScore.toFixed(1)}
              </div>

              <Progress value={overallScore * 10} />

            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Dimension Breakdown</CardTitle>
            </CardHeader>

            <CardContent className="h-[280px]">

              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>

            </CardContent>
          </Card>

        </div>


        <div className="flex justify-center gap-4">

          <Button variant="outline" asChild>
            <Link href="/assessment">Take Another Assessment</Link>
          </Button>

          <Button asChild>
            <Link href="/">
              Back Home
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>

        </div>

      </main>

    </div>

  )
}