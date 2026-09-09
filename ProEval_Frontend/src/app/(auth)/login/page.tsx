"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const Page = () => {
  const router = useRouter()
  const { login, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      const user = await login(email, password)

      if (user.role === "STUDENT") {
        router.push("/student/dashboard")
      } else if (user.role === "ADMIN") {
        router.push("/admin/dashboard")
      } else {
        router.push("/")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="w-full border-b border-border bg-background">
        <div className="mx-auto flex h-[64px] w-full max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-[19px] font-semibold tracking-[-0.02em] text-foreground"
            aria-label="ProEval — Home"
          >
            ProEval
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Student Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your ProEval account</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enter your registered credentials to continue.
            </p>
          </div>

          <Card className="border border-border bg-card shadow-none">
            <CardContent className="p-6 sm:p-7">
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-9"
                  />
                </div>

                <Button type="submit" disabled={loading} className="h-9 w-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <div className="mt-6 border-t border-border pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  New to ProEval?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">Secure academic evaluation platform for enrolled students.</p>

          {process.env.NODE_ENV === "development" && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portal preview — development only</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Existing dashboards — sign in required. No bypass.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 border-border bg-background text-xs font-medium"
                >
                  <Link href="/student/dashboard">Student Dashboard →</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 border-border bg-background text-xs font-medium"
                >
                  <Link href="/admin/dashboard">Admin Dashboard →</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Page
