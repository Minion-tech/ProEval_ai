"use client"

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { projectService } from "@/lib/project-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, Rocket, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { isTestUserEmail } from "@/lib/portal-mode"

export default function Phase2Submission() {
  const router = useRouter()
  const { user } = useAuth()
  const isTestUser = isTestUserEmail(user?.email)
  const [isLeader, setIsLeader] = useState(false)
  const [submissionId, setSubmissionId] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [presentationUrl, setPresentationUrl] = useState("")
  const [presentationBase64, setPresentationBase64] = useState("")
  const [presentationFileName, setPresentationFileName] = useState("")
  const [progressNotes, setProgressNotes] = useState("")
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([])
  const [pendingRisks, setPendingRisks] = useState<string[]>([])
  const [newMilestone, setNewMilestone] = useState("")
  const [newRisk, setNewRisk] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingProject, setFetchingProject] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProject() {
      if (isTestUser) {
        router.replace("/student/team")
        return
      }
      try {
        const res = await projectService.getMyProject({ testMode: false })
        if (res.data?.project) {
          setIsLeader(res.data.project.leader_id === user?.id)
          setSubmissionId(res.data.project.id)
          if (res.data.project.phase_2_data) {
            const p2 = res.data.project.phase_2_data
            setGithubUrl(p2.github_url || "")
            setPresentationUrl(p2.presentation_url || "")
            setProgressNotes(p2.progress_notes || "")
            setCompletedMilestones(p2.completed_milestones || [])
            setPendingRisks(p2.pending_risks || [])
          }
        }
      } catch (err) {
        console.error("Failed to load project:", err)
      } finally {
        setFetchingProject(false)
      }
    }
    loadProject()
  }, [isTestUser, router])

  const canSubmit =
    submissionId.trim().length > 0 &&
    githubUrl.trim().length > 0 &&
    (presentationBase64.trim().length > 0 || presentationUrl.trim().length > 0) &&
    progressNotes.trim().length >= 50 &&
    completedMilestones.length > 0

  const addMilestone = () => {
    const value = newMilestone.trim()
    if (!value) return
    setCompletedMilestones([...completedMilestones, value])
    setNewMilestone("")
  }

  const removeMilestone = (index: number) => {
    setCompletedMilestones(completedMilestones.filter((_, idx) => idx !== index))
  }

  const addRisk = () => {
    const value = newRisk.trim()
    if (!value) return
    setPendingRisks([...pendingRisks, value])
    setNewRisk("")
  }

  const removeRisk = (index: number) => {
    setPendingRisks(pendingRisks.filter((_, idx) => idx !== index))
  }

  const handlePresentationUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string
      setPresentationBase64(base64String)
      setPresentationFileName(file.name)
      setPresentationUrl("")
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!canSubmit) {
      setError("Please complete all required Phase 2 fields before submitting.")
      return
    }

    setLoading(true)

    try {
      await projectService.submitPhase2(submissionId.trim(), {
        github_url: githubUrl.trim(),
        presentation_url: presentationBase64.trim() || presentationUrl.trim(),
        progress_notes: progressNotes.trim(),
        completed_milestones: completedMilestones,
        pending_risks: pendingRisks,
      }, { testMode: false })
      setMessage("Phase 2 submission sent successfully.")
      router.push("/student/feedback")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit Phase 2 data.")
    } finally {
      setLoading(false)
    }
  }

  if (fetchingProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    // If user is not leader, render view-only summary instead of editable form
    !isLeader ? (
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild className="gap-2 -ml-4">
              <Link href="/student/my-team">
                <ArrowLeft className="h-4 w-4" />
                Back to My Team
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Phase 2: Mid-term Build (View Only)</h1>
            <p className="text-muted-foreground">Only the team leader can edit or submit Phase 2. View the submitted details and check AI feedback.</p>
          </div>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Repository & Presentation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="font-semibold">GitHub URL</h3>
                <p className="text-sm text-muted-foreground">{githubUrl || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Presentation</h3>
                <p className="text-sm text-muted-foreground">
                  {presentationFileName ? presentationFileName : presentationUrl ? presentationUrl : "—"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Progress Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{progressNotes || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => router.push('/student/feedback')}>View AI Feedback</Button>
          </div>
        </div>
      </main>
    ) : (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2 -ml-4">
            <Link href="/student/my-team">
              <ArrowLeft className="h-4 w-4" />
              Back to My Team
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Phase 2: Mid-term Build</h1>
          <p className="text-muted-foreground">
            Submit your progress, repository, and milestones for evaluation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Repository & Presentation
              </CardTitle>
              <CardDescription>
                Provide the live repository URL and upload your latest presentation file.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="githubUrl">GitHub / GitLab URL</Label>
                  <Input
                    id="githubUrl"
                    type="url"
                    required
                    value={githubUrl}
                    onChange={(event) => setGithubUrl(event.target.value)}
                    placeholder="https://github.com/your-team/project"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presentationUpload">Presentation Upload</Label>
                  <Input
                    id="presentationUpload"
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    required={!presentationBase64.trim() && !presentationUrl.trim()}
                    onChange={handlePresentationUpload}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    {presentationFileName
                      ? presentationFileName
                      : presentationUrl
                      ? `Current link: ${presentationUrl}`
                      : "Upload PDF, PPT, or PPTX."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Progress Notes</CardTitle>
              <CardDescription>
                Describe the work completed so far. Minimum 50 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Textarea
                  id="progressNotes"
                  required
                  value={progressNotes}
                  onChange={(event) => setProgressNotes(event.target.value)}
                  placeholder="Summarize milestones completed, development progress, and any blockers."
                  rows={6}
                />
                <div className="flex justify-between items-center mt-1">
                   <p className={`text-xs ${progressNotes.trim().length >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
                    {progressNotes.trim().length} / 50 characters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg">Milestones Completed</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newMilestone}
                    onChange={(event) => setNewMilestone(event.target.value)}
                    placeholder="e.g. Auth system implemented"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                  />
                  <Button type="button" size="icon" onClick={addMilestone} disabled={!newMilestone.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {completedMilestones.length > 0 ? (
                    completedMilestones.map((milestone, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border p-2 bg-muted/30"
                      >
                        <span className="text-sm">{milestone}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeMilestone(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Add at least one milestone.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg">Pending Risks</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newRisk}
                    onChange={(event) => setNewRisk(event.target.value)}
                    placeholder="e.g. Scalability concerns"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRisk())}
                  />
                  <Button type="button" size="icon" onClick={addRisk} disabled={!newRisk.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {pendingRisks.length > 0 ? (
                    pendingRisks.map((risk, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border p-2 bg-muted/30"
                      >
                        <span className="text-sm">{risk}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeRisk(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No risks listed (optional).</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {message && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/student/my-team">Cancel</Link>
            </Button>
            <Button type="submit" className="min-w-[150px] shadow-lg" disabled={!canSubmit || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Phase 2"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
    )
  )
}
