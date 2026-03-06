"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Mic, Code, Shield } from "lucide-react"

const SKILL_TOPICS = [
  "Python Programming",
  "JavaScript & TypeScript",
  "React & Frontend Development",
  "Node.js & Backend Development",
  "SQL & Database Design",
  "System Design & Architecture",
  "DevOps & Cloud Computing",
  "Machine Learning Basics",
  "Data Structures & Algorithms",
  "API Design & REST",
]

const DIFFICULTY_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Foundational concepts and basic terminology",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Practical application and problem-solving",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Deep understanding and complex scenarios",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Edge cases, internals, and architectural decisions",
  },
]

export default function AssessmentPage() {
  const router = useRouter()
  const [selectedTopic, setSelectedTopic] = useState("")
  const [difficulty, setDifficulty] = useState("intermediate")
  const [assessmentType, setAssessmentType] = useState("voice")

  const handleStartAssessment = () => {
    if (!selectedTopic) return

    // Store assessment config in sessionStorage for the setup page
    sessionStorage.setItem(
      "assessmentConfig",
      JSON.stringify({
        topic: selectedTopic,
        difficulty,
        type: assessmentType,
      })
    )

    router.push("/assessment/setup")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold">SkillBridge</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Start Your Assessment</h1>
          <p className="text-muted-foreground">
            Select your skill topic, difficulty level, and assessment type to
            begin.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {/* Skill Topic Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Skill Topic</CardTitle>
              <CardDescription>
                Choose the technical domain you want to verify
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a topic..." />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Difficulty Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Level</CardTitle>
              <CardDescription>
                Questions will be tailored to your selected level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={difficulty}
                onValueChange={setDifficulty}
                className="grid gap-3"
              >
                {DIFFICULTY_LEVELS.map((level) => (
                  <Label
                    key={level.value}
                    htmlFor={level.value}
                    className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-muted/50"
                  >
                    <RadioGroupItem
                      value={level.value}
                      id={level.value}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">{level.label}</span>
                      <p className="text-sm text-muted-foreground">
                        {level.description}
                      </p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Assessment Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Type</CardTitle>
              <CardDescription>
                Choose how you want to demonstrate your understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Label
                  htmlFor="voice"
                  className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 cursor-pointer transition-colors ${
                    assessmentType === "voice"
                      ? "border-primary bg-muted/50"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <input
                    type="radio"
                    id="voice"
                    name="assessmentType"
                    value="voice"
                    checked={assessmentType === "voice"}
                    onChange={(e) => setAssessmentType(e.target.value)}
                    className="sr-only"
                  />
                  <Mic className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <span className="font-medium block">Voice Assessment</span>
                    <span className="text-sm text-muted-foreground">
                      Explain concepts verbally
                    </span>
                  </div>
                </Label>

                <Label
                  htmlFor="code"
                  className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 cursor-pointer transition-colors ${
                    assessmentType === "code"
                      ? "border-primary bg-muted/50"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <input
                    type="radio"
                    id="code"
                    name="assessmentType"
                    value="code"
                    checked={assessmentType === "code"}
                    onChange={(e) => setAssessmentType(e.target.value)}
                    className="sr-only"
                  />
                  <Code className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <span className="font-medium block">Code Challenge</span>
                    <span className="text-sm text-muted-foreground">
                      Write and explain code
                    </span>
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Start Button */}
          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              onClick={handleStartAssessment}
              disabled={!selectedTopic}
              className="gap-2 px-8"
            >
              Continue to Setup
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
