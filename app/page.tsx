"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Mic,
  Brain,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code,
  Users,
} from "lucide-react"

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-First Assessment",
    description:
      "Real-time voice capture with behavioral signal extraction. We analyze how you explain, not just what you say.",
  },
  {
    icon: Brain,
    title: "8 Behavioral Dimensions",
    description:
      "Gemini AI evaluates accuracy, depth, clarity, application, spontaneity, vocabulary, flow, and confidence.",
  },
  {
    icon: BarChart3,
    title: "Radar Visualization",
    description:
      "See your strengths and blind spots mapped across all dimensions with detailed feedback.",
  },
  {
    icon: Shield,
    title: "Anti-AI by Design",
    description:
      "We don't block AI — we make it irrelevant. Passing requires sustained effort that defeats AI shortcuts.",
  },
]

const DIMENSIONS = [
  "Content Accuracy",
  "Conceptual Depth",
  "Explanation Clarity",
  "Real-world Application",
  "Response Spontaneity",
  "Technical Vocabulary",
  "Logical Flow",
  "Confidence Indicators",
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">SkillBridge</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/assessment"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start Assessment
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            Skill Verification for the Post-AI World
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
            Prove What You Know,{" "}
            <span className="text-primary">Not What AI Knows</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-balance">
            SkillBridge is the first skill verification platform that makes AI
            assistance irrelevant by design. We test genuine understanding
            through 8 simultaneous behavioral detectors.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button asChild size="lg" className="gap-2">
              <Link href="/assessment">
                Start Assessment
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#how-it-works">Learn How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Philosophy Banner */}
      <section className="py-12 bg-muted/50 border-y">
        <div className="container mx-auto px-4">
          <div className="flex items-start gap-4 max-w-3xl mx-auto">
            <Sparkles className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <p className="text-lg font-medium mb-2">Our Philosophy</p>
              <p className="text-muted-foreground">
                We do not try to block AI assistance. We make AI assistance
                irrelevant. If you can read a ChatGPT answer aloud convincingly
                enough to pass 8 simultaneous behavioral detectors — you
                probably understand the concept well enough to deserve to pass
                anyway.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How SkillBridge Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every existing assessment platform tests what you know. SkillBridge
              tests whether you actually understand it.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-2">
                <CardHeader>
                  <feature.icon className="w-10 h-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8 Dimensions Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                8 Behavioral Dimensions
              </h2>
              <p className="text-muted-foreground mb-6">
                Our AI evaluates your responses across eight distinct dimensions,
                combining what you say with how you say it. Each dimension
                contributes to a complete picture of genuine understanding.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DIMENSIONS.map((dimension) => (
                  <div
                    key={dimension}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{dimension}</span>
                  </div>
                ))}
              </div>
            </div>
            <Card className="p-6">
              <div className="aspect-square relative flex items-center justify-center">
                {/* Simplified radar chart representation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full border rounded-full opacity-20" />
                  <div className="absolute w-3/4 h-3/4 border rounded-full opacity-30" />
                  <div className="absolute w-1/2 h-1/2 border rounded-full opacity-40" />
                  <div className="absolute w-1/4 h-1/4 border rounded-full opacity-50" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-6xl font-bold text-primary">7.2</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sample Overall Score
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Assessment Types */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Assessment Modes</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the assessment type that matches your verification needs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <Mic className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Voice Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Explain concepts verbally. We analyze your speech patterns,
                  pauses, and confidence alongside content accuracy.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <Code className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Code Challenge</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Write code in our Monaco editor while explaining your approach.
                  We evaluate both the code and your reasoning.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Live Peer Session</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Stage 2 verification with live video discussion. Answer
                  follow-up questions from evaluators in real-time.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Verify Your Skills?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join the new standard of skill verification. Prove what you
            genuinely understand.
          </p>
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link href="/assessment">
              Start Your Assessment
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                SkillBridge
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Skill verification for the post-AI world
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
