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
  const { register: registerUser, verifyOTP, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otp, setOtp] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    enrollment_no: "",
    programme: "",
    department: "",
    batch: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      await registerUser(formData)
      setSuccess("Registration successful — enter the 6-digit code sent to your email.")
      setIsVerifying(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.")
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      await verifyOTP(formData.email, otp)
      router.push("/student/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.")
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
          <Link href="/" className="text-[19px] font-semibold tracking-[-0.02em] text-foreground" aria-label="ProEval — Home">
            ProEval
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="w-full max-w-[520px] space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Student Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isVerifying ? "Verify your email" : "Create your ProEval account"}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isVerifying
                ? `Enter the 6-digit code sent to ${formData.email}.`
                : "Enter your academic details to create your student account."}
            </p>
          </div>

          <Card className="border border-border bg-card shadow-none">
            <CardContent className="p-6 sm:p-7">
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                    {success}
                  </div>
                )}

                {!isVerifying ? (
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Full name
                      </Label>
                      <Input id="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} required className="h-9" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@university.edu"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="enrollment_no" className="text-sm font-medium">
                        Enrollment number
                      </Label>
                      <Input
                        id="enrollment_no"
                        placeholder="Enter enrollment number"
                        value={formData.enrollment_no}
                        onChange={handleChange}
                        required
                        className="h-9 font-mono"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="programme" className="text-sm font-medium">
                          Programme
                        </Label>
                        <Input id="programme" placeholder="B.Tech / BCA / MCA" value={formData.programme} onChange={handleChange} required className="h-9" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department" className="text-sm font-medium">
                          Department
                        </Label>
                        <Input
                          id="department"
                          placeholder="CSE / IT / Mechanical"
                          value={formData.department}
                          onChange={handleChange}
                          required
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batch" className="text-sm font-medium">
                        Batch
                      </Label>
                      <Input id="batch" placeholder="2022 — 2026" value={formData.batch} onChange={handleChange} required className="h-9" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="h-9"
                      />
                      <p className={`text-xs ${formData.password.length >= 6 ? "text-foreground" : "text-muted-foreground"}`}>
                        {formData.password.length} / 6 characters minimum
                      </p>
                    </div>

                    <Button
                      className="h-9 w-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      type="submit"
                      disabled={loading || formData.password.length < 6}
                    >
                      {loading ? "Sending code…" : "Create account"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-sm font-medium">
                        Verification code
                      </Label>
                      <Input
                        id="otp"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="h-9 font-mono tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground">Check your inbox for the code sent to {formData.email}.</p>
                    </div>
                    <Button className="h-9 w-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90" type="submit" disabled={loading}>
                      {loading ? "Verifying…" : "Verify and continue"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 w-full border-border bg-background text-sm font-medium"
                      onClick={() => setIsVerifying(false)}
                      disabled={loading}
                      type="button"
                    >
                      Back to details
                    </Button>
                  </form>
                )}

                <div className="border-t border-border pt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => router.push("/login")} className="font-medium text-foreground underline-offset-4 hover:underline">
                      Sign in
                    </button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">By creating an account you agree to your institution’s academic evaluation policies.</p>

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
