"use client"

import { useState, useEffect, type FormEvent, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { projectService } from "@/lib/project-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, Trophy, FileText, Video, GitBranch } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { isTestUserEmail } from "@/lib/portal-mode"

export default function Phase3Submission() {
  const router = useRouter()
  const { user } = useAuth()
  const isTestUser = isTestUserEmail(user?.email)
  const [submissionId, setSubmissionId] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [demoVideoUrl, setDemoVideoUrl] = useState("")
  const [finalSummary, setFinalSummary] = useState("")
  const [individualContributions, setIndividualContributions] = useState("")
  const [finalReportBase64, setFinalReportBase64] = useState("")
  const [presentationBase64, setPresentationBase64] = useState("")
  const [reportFileName, setReportFileName] = useState("")
  const [presentationFileName, setPresentationFileName] = useState("")
  const [existingPresentationUrl, setExistingPresentationUrl] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [fetchingProject, setFetchingProject] = useState(true)
  const [isLeader, setIsLeader] = useState(false)
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
          if (res.data.project.final_data) {
            const final = res.data.project.final_data
            setGithubUrl(final.github_url || "")
            setDemoVideoUrl(final.demo_video_url || "")
            setFinalSummary(final.final_summary || "")
            setIndividualContributions(final.individual_contributions || "")
            const presentation = final.presentation_url || ""
            if (presentation.startsWith("data:")) {
              setPresentationBase64(presentation)
              setPresentationFileName("Uploaded presentation file")
            } else {
              setExistingPresentationUrl(presentation)
            }
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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, type: 'report' | 'presentation') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string
      if (type === 'report') {
        setFinalReportBase64(base64String)
        setReportFileName(file.name)
      } else {
        setPresentationBase64(base64String)
        setPresentationFileName(file.name)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!githubUrl || !finalSummary || !individualContributions) {
      setError("Please complete all required fields.")
      return
    }

    setLoading(true)

    try {
      await projectService.submitFinal(submissionId.trim(), {
        github_url: githubUrl.trim(),
        demo_video_url: demoVideoUrl.trim() || undefined,
        final_summary: finalSummary.trim(),
        individual_contributions: individualContributions.trim(),
        final_report_url: finalReportBase64, // Backend expects base64 or URL
        presentation_url: presentationBase64,
      }, { testMode: false })
      setMessage("Final Audit submission sent successfully.")
      router.push("/student/feedback")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit final audit data.")
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

  if (!isLeader) {
    return (
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
            <h1 className="text-3xl font-bold">Phase 3: Final Showcase (View Only)</h1>
            <p className="text-muted-foreground">Only the team leader can edit or submit the final audit. View the submitted deliverables and AI feedback below.</p>
          </div>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="font-semibold">GitHub URL</h3>
                <p className="text-sm text-muted-foreground">{githubUrl || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Demo Video</h3>
                <p className="text-sm text-muted-foreground">{demoVideoUrl || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Presentation</h3>
                <p className="text-sm text-muted-foreground">
                  {presentationFileName || existingPresentationUrl || "—"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Final Summary</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{finalSummary || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Individual Contributions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{individualContributions || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => router.push('/student/feedback')}>View AI Feedback</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
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
          <h1 className="text-3xl font-bold">Phase 3: Final Showcase</h1>
          <p className="text-muted-foreground">
            The grand finale. Submit your final report, demo, and contributions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Project Deliverables
              </CardTitle>
              <CardDescription>
                Provide links to your repository and optional demo video.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="githubUrl" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" /> GitHub URL
                  </Label>
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
                  <Label htmlFor="demoVideoUrl" className="flex items-center gap-2">
                    <Video className="h-4 w-4" /> Demo Video URL (Optional)
                  </Label>
                  <Input
                    id="demoVideoUrl"
                    type="url"
                    value={demoVideoUrl}
                    onChange={(event) => setDemoVideoUrl(event.target.value)}
                    placeholder="https://youtu.be/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Final Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                <Input
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  onChange={(e) => handleFileUpload(e, 'report')}
                />
                <p className="text-xs text-muted-foreground italic">
                  {reportFileName || "Upload PDF, PPT, or PPTX."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Presentation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                <Input
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  onChange={(e) => handleFileUpload(e, 'presentation')}
                />
                <p className="text-xs text-muted-foreground italic">
                  {presentationFileName || "Upload PDF, PPT, or PPTX."}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Final Project Summary</CardTitle>
              <CardDescription>
                A high-level overview of the final outcome and its impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                required
                value={finalSummary}
                onChange={(event) => setFinalSummary(event.target.value)}
                placeholder="Summarize the final project state, achieved goals, and core value proposition."
                rows={5}
              />
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg">Individual Contributions</CardTitle>
              <CardDescription>
                Detail the specific work done by each team member.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                required
                value={individualContributions}
                onChange={(event) => setIndividualContributions(event.target.value)}
                placeholder="Team Member 1: ...\nTeam Member 2: ..."
                rows={6}
              />
            </CardContent>
          </Card>

          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {message && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/student/my-team">Cancel</Link>
            </Button>
            <Button type="submit" className="min-w-[150px] shadow-lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Final Audit"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
