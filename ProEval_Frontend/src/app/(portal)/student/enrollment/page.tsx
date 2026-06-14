"use client"

import { type ChangeEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { projectService, MyProjectResponse } from "@/lib/project-service"
import { isTestUserEmail } from "@/lib/portal-mode"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Loader2, CheckCircle2, Copy, Check, FileText, Presentation, Video, Code, Sparkles, History } from "lucide-react"

export default function StudentEnrollmentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const isTestUser = isTestUserEmail(user?.email)
  const [currentPhase, setCurrentPhase] = useState(1)
  const [submissionId, setSubmissionId] = useState("")
  const [existingProject, setExistingProject] = useState<MyProjectResponse | null>(null)
  
  const [formData, setFormData] = useState({
    fullName: "",
    enrollmentNo: "",
    programme: "",
    department: "",
    batch: "",
    email: "",
    academicYear: "2025-26",
    projectTitle: "",
    projectObjective: "",
    domain: "",
    methodology: "",
    useCaseDiagram: "",
    useCaseDiagramName: "",
    techStack: "",
    semester: "",
  })

  const [phase2Data, setPhase2Data] = useState({
    githubUrl: "",
    presentationUrl: "",
    progressNotes: "",
    completedMilestones: [] as string[],
    pendingRisks: [] as string[],
    newMilestone: "",
    newRisk: "",
  })

  const [finalData, setFinalData] = useState({
    final_report_url: "",
    presentation_url: "",
    demo_video_url: "",
    github_url: "",
    final_summary: "",
    individual_contributions: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!loading && isTestUser) {
      router.replace("/student/team")
      return
    }
    if (!loading && user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        enrollmentNo: user.enrollment_no || prev.enrollmentNo,
        programme: user.programme || prev.programme,
        department: user.department || prev.department,
        batch: user.batch || prev.batch,
        email: user.email || prev.email,
      }))
      
      const fetchData = async () => {
        try {
          const projectResponse = await projectService.getMyProject();
          if (projectResponse.data) {
            const projectData = projectResponse.data;
            setExistingProject(projectData);
            
            if (projectData.project) {
                setSubmissionId(projectData.project.id);
                // Auto-advance phase based on project status
                if (projectData.project.current_phase === "PHASE_2") {
                    setCurrentPhase(2);
                } else if (projectData.project.current_phase === "FINAL" || projectData.project.current_phase === "SUBMITTED") {
                    setCurrentPhase(3);
                    if (projectData.project.final_data) {
                        setFinalData(projectData.project.final_data);
                    }
                }
            }
          }
        } catch (err) {
          console.error("Failed to fetch project data:", err);
        } finally {
          setIsInitialLoading(false);
        }
      }
      fetchData();
    }
  }, [isTestUser, loading, router, user])

  const phases = [
    { number: 1, label: "Proposal" },
    { number: 2, label: "Mid-term" },
    { number: 3, label: "Final" },
  ]

  const semesters = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"]

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleUseCaseDiagramUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      setError("Use case diagram must be a PNG, JPG, WebP, or SVG image.")
      return
    }

    if (file.size > 1024 * 1024) {
      setError("Use case diagram must be 1 MB or smaller.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        useCaseDiagram: String(reader.result || ""),
        useCaseDiagramName: file.name,
      }))
      setError(null)
    }
    reader.onerror = () => setError("Could not read the selected use case diagram.")
    reader.readAsDataURL(file)
  }

  const handlePhase2InputChange = (field: string, value: string) => {
    setPhase2Data({ ...phase2Data, [field]: value })
  }

  const handleFinalInputChange = (field: string, value: string) => {
    setFinalData({ ...finalData, [field]: value })
  }

  const handleFinalArtifactUpload = (field: "final_report_url" | "presentation_url") => (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]
    const allowedExtensions = [".pdf", ".ppt", ".pptx"]
    const lowerName = file.name.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
      setError("Final report and presentation files must be PDF, PPT, or PPTX.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Final report and presentation files must be 10 MB or smaller.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFinalData((prev) => ({
        ...prev,
        [field]: String(reader.result || ""),
      }))
      setError(null)
    }
    reader.onerror = () => setError("Could not read the selected final artifact.")
    reader.readAsDataURL(file)
  }

  const addMilestone = () => {
    const value = phase2Data.newMilestone.trim()
    if (!value) return
    setPhase2Data({
      ...phase2Data,
      completedMilestones: [...phase2Data.completedMilestones, value],
      newMilestone: "",
    })
  }

  const removeMilestone = (index: number) => {
    setPhase2Data({
      ...phase2Data,
      completedMilestones: phase2Data.completedMilestones.filter((_, idx) => idx !== index),
    })
  }

  const addRisk = () => {
    const value = phase2Data.newRisk.trim()
    if (!value) return
    setPhase2Data({
      ...phase2Data,
      pendingRisks: [...phase2Data.pendingRisks, value],
      newRisk: "",
    })
  }

  const removeRisk = (index: number) => {
    setPhase2Data({
      ...phase2Data,
      pendingRisks: phase2Data.pendingRisks.filter((_, idx) => idx !== index),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (currentPhase === 1) {
      const payload = {
        phase_1_data: {
          title: formData.projectTitle,
          abstract: formData.projectObjective,
          domain: formData.domain,
          objectives: [formData.projectObjective.trim()].filter(Boolean),
          methodology: formData.methodology,
          use_case_diagram: formData.useCaseDiagram,
          tech_stack: formData.techStack
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        academic_year: formData.academicYear,
        semester: Number(formData.semester.replace(/[^0-9]/g, "")) || 6,
      }

      setIsSubmitting(true)
      try {
        const response = await projectService.submitPhase1(payload)
        setSubmissionId(response.data.id)
        setMessage(`Phase 1 proposal submitted successfully! Team ID: ${response.data.team_id}. Share this ID with your team members.`)
        const projectResponse = await projectService.getMyProject();
        if (projectResponse.data) setExistingProject(projectResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit Phase 1 proposal.")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentPhase === 2) {
      if (!submissionId) {
        setError("Submission ID not found. Please complete Phase 1 first.")
        return
      }

      setIsSubmitting(true)
      try {
        await projectService.submitPhase2(submissionId, {
          github_url: phase2Data.githubUrl.trim(),
          presentation_url: phase2Data.presentationUrl.trim(),
          progress_notes: phase2Data.progressNotes.trim(),
          completed_milestones: phase2Data.completedMilestones,
          pending_risks: phase2Data.pendingRisks,
        })
        setMessage("Phase 2 mid-term submission sent successfully!")
        const projectResponse = await projectService.getMyProject();
        if (projectResponse.data) setExistingProject(projectResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit Phase 2 data.")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentPhase === 3) {
      if (!submissionId) {
        setError("Submission ID not found.")
        return
      }

      setIsSubmitting(true)
      try {
        await projectService.submitFinal(submissionId, {
            ...finalData,
            demo_video_url: finalData.demo_video_url || undefined
        })
        setMessage("Final project submission successful! Your submission has been received for final review.")
        const projectResponse = await projectService.getMyProject();
        if (projectResponse.data) setExistingProject(projectResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit Final project.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  if (loading || isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (existingProject?.project && existingProject.project.current_phase === "COMPLETED") {
      return (
          <div className="container mx-auto px-4 py-12 text-center space-y-4">
              <h1 className="text-2xl font-bold text-green-600">Project Fully Completed</h1>
              <p>You have successfully completed all project phases and evaluations.</p>
              <Button onClick={() => router.push("/student/my-team")}>View Final Results</Button>
          </div>
      )
  }

  const isPhase1Valid =
    formData.projectTitle?.trim()?.length >= 10 &&
    formData.projectObjective?.trim()?.length >= 50 &&
    formData.methodology?.trim()?.length >= 50 &&
    formData.useCaseDiagram?.trim()?.length >= 20 &&
    formData.techStack
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean).length > 0

  const isPhase2Valid =
    phase2Data.githubUrl.trim().length > 0 &&
    phase2Data.presentationUrl.trim().length > 0 &&
    phase2Data.progressNotes.trim().length >= 50 &&
    phase2Data.completedMilestones.length > 0

  const isPhase3Valid = 
    finalData.final_report_url.length > 10 &&
    finalData.presentation_url.length > 10 &&
    finalData.github_url.length > 10 &&
    finalData.final_summary.length >= 100

  const hasActiveProject = !!existingProject?.project;
  const isLeader = existingProject?.user_role === "Team Leader";

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold">Student Enrollment</h1>
            {hasActiveProject && (
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
                    Team ID: {existingProject?.project?.team_id}
                </div>
            )}
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center gap-4">
          {phases.map((phase, idx) => (
            <div key={phase.number} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentPhase >= phase.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {phase.number}
              </div>
              <div className="text-sm font-medium">
                Phase {phase.number} · {phase.label}
              </div>
              {idx < phases.length - 1 && (
                <div className={`w-16 h-1 ${currentPhase > phase.number ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle>
              {currentPhase === 1 && "Project Proposal"}
              {currentPhase === 2 && "Mid-term Submission"}
              {currentPhase === 3 && "Final Project Submission"}
            </CardTitle>
            <CardDescription>
              {currentPhase === 1 && "Submit your project proposal for coordination review"}
              {currentPhase === 2 && "Submit your mid-term progress report"}
              {currentPhase === 3 && "Submit your final report, presentation, repo, and summary so the agents can identify hackathon and resume-readiness gaps"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasActiveProject && !isLeader ? (
                <div className="p-8 text-center space-y-4">
                    <h3 className="text-xl font-semibold">Joined Team: {existingProject?.project?.team_id}</h3>
                    <p>You are a member of this team. Only the Team Leader can submit project details for any phase.</p>
                    <Button onClick={() => router.push("/student/my-team")}>View Team Progress</Button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phase 1 View */}
                {currentPhase === 1 && (
                    <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Project Identification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" disabled value={formData.fullName} className="bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="enrollmentNo">Enrollment No.</Label>
                        <Input id="enrollmentNo" disabled value={formData.enrollmentNo} className="bg-gray-50" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectTitle">Project Title</Label>
                      <Input
                        id="projectTitle"
                        placeholder="Smart irrigation system using IoT sensors"
                        value={formData.projectTitle}
                        onChange={(e) => handleInputChange("projectTitle", e.target.value)}
                        disabled={hasActiveProject}
                        className={formData.projectTitle.length > 0 && formData.projectTitle.length < 10 ? "border-red-500" : ""}
                      />
                      <p className={`text-[10px] mt-1 ${formData.projectTitle.length >= 10 ? "text-green-600" : "text-gray-500"}`}>
                        {formData.projectTitle.length} / 10 characters minimum
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectObjective">Project Objective</Label>
                      <Textarea
                        id="projectObjective"
                        placeholder="State the main objective, problem being solved, and expected outcome..."
                        className={`min-h-32 ${formData.projectObjective.length > 0 && formData.projectObjective.length < 50 ? "border-red-500" : ""}`}
                        value={formData.projectObjective}
                        onChange={(e) => handleInputChange("projectObjective", e.target.value)}
                        disabled={hasActiveProject}
                      />
                      <p className={`text-[10px] mt-1 ${formData.projectObjective.length >= 50 ? "text-green-600" : "text-gray-500"}`}>
                        {formData.projectObjective.length} / 50 characters minimum
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Input
                                id="domain"
                                placeholder="AI / ML, Web Development, IoT"
                                value={formData.domain}
                                onChange={(e) => handleInputChange("domain", e.target.value)}
                                disabled={hasActiveProject}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="techStack">Tech Stack</Label>
                            <Textarea
                                id="techStack"
                                placeholder={"Next.js\nFastAPI\nPostgreSQL"}
                                value={formData.techStack}
                                onChange={(e) => handleInputChange("techStack", e.target.value)}
                                disabled={hasActiveProject}
                                rows={4}
                            />
                            <p className="text-[10px] text-muted-foreground">Enter one technology per line.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="methodology">Methodology</Label>
                            <Textarea
                                id="methodology"
                                placeholder="Explain your planned implementation approach, modules, workflow, and validation method..."
                                className={`min-h-32 ${formData.methodology.length > 0 && formData.methodology.length < 50 ? "border-red-500" : ""}`}
                                value={formData.methodology}
                                onChange={(e) => handleInputChange("methodology", e.target.value)}
                                disabled={hasActiveProject}
                            />
                            <p className={`text-[10px] mt-1 ${formData.methodology.length >= 50 ? "text-green-600" : "text-gray-500"}`}>
                                {formData.methodology.length} / 50 characters minimum
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="useCaseDiagram">Use Case Diagram</Label>
                            <Input
                                id="useCaseDiagram"
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                onChange={handleUseCaseDiagramUpload}
                                disabled={hasActiveProject}
                            />
                            <p className={`text-[10px] mt-1 ${formData.useCaseDiagram ? "text-green-600" : "text-gray-500"}`}>
                                {formData.useCaseDiagramName || "Upload PNG, JPG, WebP, or SVG. Max 1 MB."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Select value={formData.semester} onValueChange={(val) => handleInputChange("semester", val)}>
                                <SelectTrigger>
                                <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent>
                                {semesters.map((sem) => (
                                    <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    </div>
                )}

                {/* Phase 2 View */}
                {currentPhase === 2 && (
                    <div className="space-y-6">
                    <Card className="border-none shadow-none bg-gray-50/50 p-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="githubUrl">GitHub Repository URL</Label>
                                <div className="flex items-center gap-2">
                                    <Code className="text-gray-400 w-4 h-4" />
                                    <Input
                                        id="githubUrl"
                                        type="url"
                                        value={phase2Data.githubUrl}
                                        onChange={(e) => handlePhase2InputChange("githubUrl", e.target.value)}
                                        placeholder="https://github.com/your-team/project"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="presentationUrl">Presentation PDF / Slides URL</Label>
                                <div className="flex items-center gap-2">
                                    <Presentation className="text-gray-400 w-4 h-4" />
                                    <Input
                                        id="presentationUrl"
                                        type="url"
                                        value={phase2Data.presentationUrl}
                                        onChange={(e) => handlePhase2InputChange("presentationUrl", e.target.value)}
                                        placeholder="https://drive.google.com/... or PDF link"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="progressNotes">Progress Notes (Min 50 chars)</Label>
                                <Textarea
                                    id="progressNotes"
                                    value={phase2Data.progressNotes}
                                    onChange={(e) => handlePhase2InputChange("progressNotes", e.target.value)}
                                    placeholder="Summarize milestones completed..."
                                    rows={5}
                                />
                                <p className="text-[10px] text-muted-foreground">{phase2Data.progressNotes.length} / 50 characters</p>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label>Milestones Completed</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={phase2Data.newMilestone}
                                    onChange={(e) => handlePhase2InputChange("newMilestone", e.target.value)}
                                    placeholder="Add a milestone"
                                />
                                <Button type="button" size="sm" onClick={addMilestone}>Add</Button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {phase2Data.completedMilestones.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs bg-white p-2 border rounded">
                                        <span>{m}</span>
                                        <Button variant="ghost" size="sm" className="h-6 text-red-500" onClick={() => removeMilestone(i)}>x</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label>Active Risks</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={phase2Data.newRisk}
                                    onChange={(e) => handlePhase2InputChange("newRisk", e.target.value)}
                                    placeholder="Add a risk"
                                />
                                <Button type="button" size="sm" onClick={addRisk}>Add</Button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {phase2Data.pendingRisks.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs bg-white p-2 border rounded">
                                        <span>{r}</span>
                                        <Button variant="ghost" size="sm" className="h-6 text-red-500" onClick={() => removeRisk(i)}>x</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </div>
                )}

                {/* Phase 3 View (Final) */}
                {currentPhase === 3 && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" /> Final Report URL (PDF)
                                </Label>
                                <Input 
                                    type="file"
                                    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                    onChange={handleFinalArtifactUpload("final_report_url")}
                                />
                                <p className="text-xs text-muted-foreground">{finalData.final_report_url ? "Report file selected" : "Upload PDF, PPT, or PPTX. Max 10 MB."}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Presentation className="w-4 h-4 text-orange-600" /> Presentation URL (PPT/PDF)
                                </Label>
                                <Input 
                                    type="file"
                                    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                    onChange={handleFinalArtifactUpload("presentation_url")}
                                />
                                <p className="text-xs text-muted-foreground">{finalData.presentation_url ? "Presentation file selected" : "Upload PDF, PPT, or PPTX. Max 10 MB."}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="w-4 h-4 text-purple-600" /> GitHub URL
                                </Label>
                                <Input 
                                    placeholder="Link to the final GitHub repository used as engineering evidence" 
                                    value={finalData.github_url}
                                    onChange={(e) => handleFinalInputChange("github_url", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-red-600" /> Demo Video Link (Optional)
                                </Label>
                                <Input 
                                    placeholder="Optional YouTube / Drive demo used to strengthen hackathon readiness" 
                                    value={finalData.demo_video_url}
                                    onChange={(e) => handleFinalInputChange("demo_video_url", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Final Outcome Summary (Min 100 chars)</Label>
                                <Textarea 
                                    className="min-h-32"
                                    placeholder="Summarize the problem, target user, what was built, main technical depth, and the strongest outcome or impact..."
                                    value={finalData.final_summary}
                                    onChange={(e) => handleFinalInputChange("final_summary", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground text-right">{finalData.final_summary.length} / 100</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Individual Contribution Audit (Min 50 chars)</Label>
                                <Textarea 
                                    placeholder="Detail who owned which modules, what each member built, and what technical decisions or responsibilities they handled..."
                                    value={finalData.individual_contributions}
                                    onChange={(e) => handleFinalInputChange("individual_contributions", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground text-right">{finalData.individual_contributions.length} / 50</p>
                            </div>
                        </div>
                    </div>
                )}

                {message && (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-green-800 font-semibold">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>{message.split('!')[0]}!</span>
                        </div>
                        
                        {existingProject?.project?.team_id && currentPhase === 1 && (
                            <div className="space-y-3">
                                <p className="text-sm text-green-700">Share this unique **Team ID** with your teammates:</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white border border-green-200 rounded-lg px-4 py-3 font-mono text-lg font-bold text-primary flex items-center justify-between shadow-sm">
                                        {existingProject?.project?.team_id}
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => copyToClipboard(existingProject?.project?.team_id || "")}
                                        >
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            <span className="ml-2 text-xs">{copied ? "Copied" : "Copy"}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <p className="text-xs text-green-600 italic flex-1">Submission received. Navigate to your Team Dashboard for detailed status.</p>
                            <Button 
                                type="button" 
                                size="sm" 
                                variant="outline" 
                                className="text-primary border-primary hover:bg-primary/5"
                                onClick={() => router.push("/student/feedback")}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                View AI Feedback
                            </Button>
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-4 pt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentPhase(Math.max(1, currentPhase - 1))}
                        disabled={currentPhase === 1 || isSubmitting}
                    >
                        Previous
                    </Button>

                    <div className="flex gap-3">
                        {currentPhase < 3 && hasActiveProject && (
                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={() => setCurrentPhase(currentPhase + 1)}
                            >
                                Next Phase (Dev)
                            </Button>
                        )}
                        
                        <Button
                            type="submit"
                            disabled={
                                (currentPhase === 1 && !isPhase1Valid) ||
                                (currentPhase === 2 && !isPhase2Valid) ||
                                (currentPhase === 3 && !isPhase3Valid) ||
                                isSubmitting ||
                                (currentPhase === 1 && hasActiveProject)
                            }
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {isSubmitting ? "Submitting..." : `Submit Phase ${currentPhase}`}
                        </Button>
                    </div>
                </div>
                </form>
            )}
          </CardContent>
        </Card>

        {/* Project History Section */}
        {existingProject && existingProject.previous_projects?.length > 0 && (
            <Card className="border-2 border-dashed bg-muted/20">
                <CardHeader className="flex flex-row items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <CardTitle className="text-lg">Project Submission History</CardTitle>
                        <CardDescription>Your previous project records (including deleted or reset ones)</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {existingProject.previous_projects.map((prev, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm">
                                <div>
                                    <p className="font-bold text-sm">{prev.team_id}</p>
                                    <p className="text-xs text-muted-foreground">{prev.academic_year} · Semester {prev.semester}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase">Deleted by Admin</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </main>
  )
}
