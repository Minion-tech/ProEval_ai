"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { projectService } from "@/lib/project-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function TeamJoinPage() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: "",
    enrollmentNo: "",
    programme: "",
    department: "",
    batch: "",
    email: "",
    teamId: "",
    role: "",
    functions: "",
    modules: "",
    techStack: "",
  })

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        enrollmentNo: user.enrollment_no || prev.enrollmentNo,
        programme: user.programme || prev.programme,
        email: user.email || prev.email,
      }))
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    // Basic validation
    if (!formData.teamId.trim()) {
      setError("Team ID is required.")
      setIsSubmitting(false)
      return
    }
    if (!formData.role.trim()) {
      setError("Role is required.")
      setIsSubmitting(false)
      return
    }
    if (!formData.functions.trim()) {
      setError("Functions are required. Describe the tasks you will handle.")
      setIsSubmitting(false)
      return
    }
    if (formData.functions.trim().length < 10) {
      setError("Functions must be at least 10 characters to describe your contribution.")
      setIsSubmitting(false)
      return
    }

    try {
      await projectService.joinTeam({
        team_id: formData.teamId.trim(),
        role: formData.role.trim(),
        functions: formData.functions.trim(),
        modules: formData.modules.trim() || "Core Components",
        tech_stack: formData.techStack.trim() || undefined,
      })
      setMessage("Successfully joined the team! Your personalized AI orientation is being prepared.")
      // Redirect to my-team page after 2 seconds
      setTimeout(() => {
        window.location.href = "/student/my-team";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join team.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Join Team</h1>
          <p className="text-gray-600">
            Join an existing project team and specify your role and contributions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>
                Your information is auto-filled from your registration. Please verify and update if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="Arjun Sharma"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrollmentNo">Enrollment Number</Label>
                  <Input
                    id="enrollmentNo"
                    value={formData.enrollmentNo}
                    onChange={(e) => handleInputChange("enrollmentNo", e.target.value)}
                    placeholder="EN2025001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programme">Programme</Label>
                  <Input
                    id="programme"
                    value={formData.programme}
                    onChange={(e) => handleInputChange("programme", e.target.value)}
                    placeholder="B.Tech Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Input
                    id="batch"
                    value={formData.batch}
                    onChange={(e) => handleInputChange("batch", e.target.value)}
                    placeholder="2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="arjun@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Join Details */}
          <Card>
            <CardHeader>
              <CardTitle>Team Join Details</CardTitle>
              <CardDescription>
                Enter the team ID provided by your team leader and specify your role and contributions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamId">Team ID</Label>
                <Input
                  id="teamId"
                  value={formData.teamId}
                  onChange={(e) => handleInputChange("teamId", e.target.value)}
                  placeholder="TEAM-2025-1234"
                />
                <p className="text-sm text-muted-foreground">
                  Ask your team leader for the Team ID after they submit the Phase 1 proposal.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Your Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  placeholder="Frontend Developer"
                />
                <p className="text-sm text-muted-foreground">
                  e.g., Frontend Developer, Backend Developer, UI/UX Designer, Tester
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="functions">Your Functions</Label>
                <Textarea
                  id="functions"
                  value={formData.functions}
                  onChange={(e) => handleInputChange("functions", e.target.value)}
                  placeholder="Describe what specific tasks you will handle in the project."
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  e.g., "Develop the user authentication system, implement login/logout functionality"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modules">Modules/Components</Label>
                <Textarea
                  id="modules"
                  value={formData.modules}
                  onChange={(e) => handleInputChange("modules", e.target.value)}
                  placeholder="List the parts of the codebase you will work on."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="techStack">Your Skills / Tech Stack</Label>
                <Input
                  id="techStack"
                  value={formData.techStack}
                  onChange={(e) => handleInputChange("techStack", e.target.value)}
                  placeholder="e.g., React, Node.js, Python, Figma"
                />
                <p className="text-sm text-muted-foreground">
                  The AI uses this to tailor your technical starting points.
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Messages */}
          {message && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <Button type="submit" disabled={isSubmitting} className="px-8">
              {isSubmitting ? "Joining Team..." : "Join Team"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}