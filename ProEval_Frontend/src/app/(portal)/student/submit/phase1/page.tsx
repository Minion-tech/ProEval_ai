"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/lib/project-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, HelpCircle, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isTestUserEmail } from "@/lib/portal-mode";
import { TEST_SCENARIOS } from "@/constants/scenarios";

export default function Phase1Submission() {
  const router = useRouter();
  const { user } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [isLeader, setIsLeader] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [evalStatus, setEvalStatus] = useState<string | null>(null);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  
  const [formData, setFormData] = useState({
    title: "",
    domain: "",
    objective: "",
    methodology: "",
    useCaseDiagram: "",
    useCaseDiagramName: "",
    techStack: "",
  });

  // Load current project and check evaluation status
  useEffect(() => {
    async function loadCurrentProject() {
      if (isTestUser) {
        router.replace("/student/team");
        return;
      }
      try {
        const res = await projectService.getMyProject({ testMode: false });
        const current = res.data?.project;
        if (current) {
          setIsLeader(current.leader_id === user?.id);
          setExistingSubmissionId(current.id);
          const phase1 = current.phase_1_data;
          if (phase1) {
            setFormData((prev) => ({
              ...prev,
              title: phase1.title ?? "",
              domain: phase1.domain ?? "",
              objective: phase1.abstract ?? "",
              methodology: phase1.methodology ?? "",
              useCaseDiagram: phase1.use_case_diagram ?? "",
              useCaseDiagramName: phase1.use_case_diagram ? "Previously uploaded" : "",
              techStack: Array.isArray(phase1.tech_stack) ? phase1.tech_stack.join("\n") : "",
            }));
          }

          // Check Phase 1 Evaluation for Clarifications
          const evalRes = await projectService.getEvaluation(current.id, "PHASE_1", { testMode: false });
          if (evalRes.data) {
            setEvalStatus(evalRes.data.status);
            if (evalRes.data.status === "AWAITING_CLARIFICATION") {
              const logs = evalRes.data.agent_logs || [];
              let questions: string[] = [];
              for (const log of logs) {
                if (log.stage === "clarification" || log.clarification_questions) {
                  questions = log.clarification_questions || [];
                  if (questions.length > 0) break;
                }
              }
              
              if (questions.length === 0) {
                 // Fallback if logs don't have them explicitly
                 questions = [
                    "What specific real-world user or organization will benefit first from this project?",
                    "What makes this project meaningfully different from common student projects in the same domain?",
                    "What is the smallest end-to-end version you can realistically complete and demonstrate in Phase 1/early Phase 2?",
                 ];
              }
              setClarificationQuestions(questions);
              setClarificationAnswers(new Array(questions.length).fill(""));
            }
          }
        }
      } catch (err) {
        console.error("Error loading project data:", err);
      } finally {
        setLoadingProject(false);
      }
    }
    loadCurrentProject();
  }, [isTestUser, router]);

  const handleUseCaseDiagramUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        useCaseDiagram: String(reader.result || ""),
        useCaseDiagramName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };



  const handleAutofillClarifications = () => {
     // Find matching scenario or just use the first one's clarifications for demo
     const scenario = TEST_SCENARIOS[0];
     setClarificationAnswers([...scenario.clarifications]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        phase_1_data: {
          title: formData.title,
          domain: formData.domain,
          abstract: formData.objective,
          objectives: [formData.objective.trim()].filter(Boolean),
          methodology: formData.methodology,
          use_case_diagram: formData.useCaseDiagram,
          tech_stack: formData.techStack
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        semester: 8,
        academic_year: "2026",
      };

      if (existingSubmissionId) {
        await projectService.resubmitPhase1(existingSubmissionId, payload, { testMode: false });
      } else {
        const res = await projectService.submitPhase1(payload, { testMode: false });
        if (res.data?.id) setExistingSubmissionId(res.data.id);
      }

      // Instead of navigating away, we wait for the AI to generate clarifications
      setEvalStatus("PENDING");
      
      // Start polling for the status to change to AWAITING_CLARIFICATION
      const pollInterval = setInterval(async () => {
        try {
          const res = await projectService.getMyProject({ testMode: false });
          const current = res.data?.project;
          if (current) {
            const evalRes = await projectService.getEvaluation(current.id, "PHASE_1", { testMode: false });
            if (evalRes.data?.status === "AWAITING_CLARIFICATION" || evalRes.data?.status === "COMPLETED") {
               clearInterval(pollInterval);
               window.location.reload(); // Refresh to trigger the clarification view
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);

      // Timeout after 60 seconds
      setTimeout(() => clearInterval(pollInterval), 60000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal.");
      setSubmitting(false);
    }
  };

  const handleClarificationSubmit = async () => {
    if (!existingSubmissionId) return;
    setSubmitting(true);
    try {
      await projectService.submitClarifications(existingSubmissionId, clarificationAnswers, { testMode: false });
      router.push("/student/feedback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit clarifications.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (evalStatus === "AWAITING_CLARIFICATION") {
    return (
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="space-y-6">
          <Button variant="ghost" asChild className="gap-2 -ml-4">
            <Link href="/student/my-team">
              <ArrowLeft className="h-4 w-4" /> Back to My Team
            </Link>
          </Button>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Mentorship Clarification</h1>
            <p className="text-muted-foreground">
              The AI Mentors need a few more details to finalize your Phase 1 evaluation.
            </p>
          </div>

          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Question {currentQuestionIdx + 1} of {clarificationQuestions.length}
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleAutofillClarifications}>
                 <Sparkles className="h-3 w-3 mr-1 text-primary" /> Autofill
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-lg font-medium leading-relaxed">
                  {clarificationQuestions[currentQuestionIdx]}
                </p>
                <Textarea
                  className="min-h-[150px] text-base"
                  placeholder="Type your answer here..."
                  value={clarificationAnswers[currentQuestionIdx]}
                  onChange={(e) => {
                    const newAnswers = [...clarificationAnswers];
                    newAnswers[currentQuestionIdx] = e.target.value;
                    setClarificationAnswers(newAnswers);
                  }}
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                
                {currentQuestionIdx < clarificationQuestions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    disabled={!clarificationAnswers[currentQuestionIdx].trim()}
                  >
                    Next Question <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleClarificationSubmit}
                    disabled={submitting || clarificationAnswers.some(a => !a.trim())}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Submit All Answers
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        </div>
      </main>
    );
  }
  // If user is not the leader, show a read-only view of the submitted Phase 1 data
  if (!isLeader) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-3xl">
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
            <h1 className="text-3xl font-extrabold tracking-tight">Phase 1: Project Concept (View Only)</h1>
            <p className="text-muted-foreground">Only the team leader can edit or resubmit this proposal. You can view the submitted details below and check AI feedback in the Feedback section.</p>
          </div>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Project Essentials
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold">Title</h3>
                <p className="text-sm text-muted-foreground">{formData.title || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Domain</h3>
                <p className="text-sm text-muted-foreground">{formData.domain || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Abstract & Objectives</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.objective || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Methodology</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.methodology || "—"}</p>
              </div>
              <div>
                <h3 className="font-semibold">Tech Stack</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.techStack || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => router.push('/student/feedback')}>View AI Feedback</Button>
          </div>
        </div>
      </main>
    );
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

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Project Essentials
              </CardTitle>
              <CardDescription>Provide high-level details about your research or application.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input 
                    id="title" 
                    required 
                    placeholder="e.g. AI-Powered Health Diagnostic System" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input 
                    id="domain" 
                    required 
                    placeholder="e.g. Artificial Intelligence / Web Tech" 
                    value={formData.domain}
                    onChange={e => setFormData({...formData, domain: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Project Abstract & Objectives</Label>
                <Textarea 
                  id="objective" 
                  required 
                  rows={8}
                  placeholder="State the main objective, problem being solved, and expected outcome..." 
                  value={formData.objective}
                  onChange={e => setFormData({...formData, objective: e.target.value})}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="methodology">Methodology</Label>
                  <Textarea
                    id="methodology"
                    required
                    rows={6}
                    placeholder="Explain your implementation approach..."
                    value={formData.methodology}
                    onChange={e => setFormData({...formData, methodology: e.target.value})}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="useCaseDiagram">Use Case Diagram</Label>
                  <Input
                    id="useCaseDiagram"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    required={!formData.useCaseDiagram}
                    onChange={handleUseCaseDiagramUpload}
                  />
                  <p className={`text-xs ${formData.useCaseDiagram ? "text-green-600" : "text-muted-foreground"}`}>
                    {formData.useCaseDiagramName || "Upload PNG, JPG, WebP, or SVG. Max 1 MB."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="techStack">Tech Stack</Label>
                <Textarea
                  id="techStack"
                  required
                  rows={5}
                  placeholder={"Next.js\nFastAPI\nPostgreSQL"}
                  value={formData.techStack}
                  onChange={e => setFormData({...formData, techStack: e.target.value})}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Enter one technology per line.</p>
              </div>
            </CardContent>
          </Card>

          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
               <Link href="/student/my-team">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[150px] shadow-lg">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                existingSubmissionId ? "Resubmit Proposal" : "Submit Proposal"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
