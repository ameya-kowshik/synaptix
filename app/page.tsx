"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, FileText, MessageSquare, BarChart2, ArrowRight, Brain, Zap, Target } from "lucide-react"

export default function Home() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/generate")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <span className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Synaptix
          </span>
          <div className="flex items-center gap-2">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-6">
          <Zap className="h-3.5 w-3.5" />
          AI-powered study tools
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Study smarter,<br />
          <span className="text-primary">not harder.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Upload your notes or paste any text. Synaptix turns it into flashcards, quizzes, and a personal AI tutor — instantly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              Start for free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <FileText className="h-6 w-6 text-primary" />,
              title: "Flashcards",
              desc: "Generate Q&A flashcards from any material in seconds.",
            },
            {
              icon: <Target className="h-6 w-6 text-primary" />,
              title: "Quizzes",
              desc: "Auto-generated multiple choice quizzes with AI feedback.",
            },
            {
              icon: <MessageSquare className="h-6 w-6 text-primary" />,
              title: "AI Tutor",
              desc: "Chat with an AI that knows your study material.",
            },
            {
              icon: <BarChart2 className="h-6 w-6 text-primary" />,
              title: "Analytics",
              desc: "Track your progress and spot weak areas over time.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50 hover:border-primary/40 transition-colors"
            >
              <div className="mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 bg-zinc-900/30">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <Brain className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to level up your studying?</h2>
          <p className="text-muted-foreground mb-8">
            Create a free account and start generating study tools from your first document.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              Create free account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Synaptix. Built with Next.js & Groq.
      </footer>
    </div>
  )
}
