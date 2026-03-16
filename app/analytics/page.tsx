"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts"
import { ArrowLeft, Brain, TrendingUp, AlertTriangle } from "lucide-react"

interface ScoreTrendPoint {
  date: string
  percentage: number
  tags: string | null
  difficulty: string
}

interface WeakArea {
  question: string
  wrongCount: number
  attempts: number
  errorRate: number
}

interface AnalyticsData {
  totalAttempts: number
  averageScore: number
  scoreTrend: ScoreTrendPoint[]
  weakAreas: WeakArea[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin")
    if (status === "authenticated") fetchAnalytics()
  }, [status])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics")
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-3xl font-bold">Study Analytics</h1>
        </div>

        {/* No data state */}
        {data?.totalAttempts === 0 && (
          <div className="text-center py-20">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No quiz attempts yet</h2>
            <p className="text-muted-foreground mb-6">
              Complete a quiz to start seeing your analytics
            </p>
            <Button onClick={() => router.push("/")}>Take a Quiz</Button>
          </div>
        )}

        {data && data.totalAttempts > 0 && (
          <div className="space-y-6">

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.totalAttempts}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.averageScore}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Weak Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.weakAreas.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Score trend chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Score Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.scoreTrend.map((p, i) => ({
                    ...p,
                    attempt: `#${i + 1}`,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="attempt" stroke="#888" />
                    <YAxis domain={[0, 100]} stroke="#888" unit="%" />
                    <Tooltip
                      formatter={(val) => [`${val}%`, "Score"]}
                      labelFormatter={(l) => `Attempt ${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weak areas */}
            {data.weakAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" /> Weak Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, data.weakAreas.length * 50)}>
                    <BarChart
                      layout="vertical"
                      data={data.weakAreas.map(w => ({
                        question: w.question.length > 60
                          ? w.question.slice(0, 60) + "..."
                          : w.question,
                        errorRate: w.errorRate,
                      }))}
                      margin={{ left: 20, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" domain={[0, 100]} unit="%" stroke="#888" />
                      <YAxis type="category" dataKey="question" width={220} stroke="#888"
                        tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [`${val}%`, "Error rate"]} />
                      <Bar dataKey="errorRate" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
