"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/lib/project-service";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
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
                questions = [
                  "What specific real-world user or organization will benefit first from this project?",
                  "What makes this project meaningfully different from common student projects in the same domain?",
                  "What is the smallest end-to-end version you can realistically complete and demonstrate?",
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
  }, [isTestUser, router, user]);

  const handleUseCaseDiagramUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setError("Use case diagram must be PNG, JPG, WebP or SVG.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("File must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        useCaseDiagram: String(reader.result || ""),
        useCaseDiagramName: file.name,
      }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAutofillClarifications = () => {
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

      setEvalStatus("PENDING");

      const pollInterval = setInterval(async () => {
        try {
          const res = await projectService.getMyProject({ testMode: false });
          const current = res.data?.project;
          if (current) {
            const evalRes = await projectService.getEvaluation(current.id, "PHASE_1", { testMode: false });
            if (evalRes.data?.status === "AWAITING_CLARIFICATION") {
              clearInterval(pollInterval);
              const logs = evalRes.data.agent_logs || [];
              let questions: string[] = [];
              for (const log of logs) {
                if (log.stage === "clarification" || log.clarification_questions) {
                  questions = log.clarification_questions || [];
                  if (questions.length > 0) break;
                }
              }
              if (questions.length === 0) {
                questions = [
                  "What specific real-world user or organization will benefit first from this project?",
                  "What makes this project meaningfully different from common student projects in the same domain?",
                  "What is the smallest end-to-end version you can realistically complete and demonstrate?",
                ];
              }
              setClarificationQuestions(questions);
              setClarificationAnswers(new Array(questions.length).fill(""));
              setEvalStatus("AWAITING_CLARIFICATION");
            } else if (evalRes.data?.status === "COMPLETED") {
              clearInterval(pollInterval);
              router.push("/student/feedback");
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
      }, 30000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal. Please check fields and try again.");
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading workspace</p>
      </div>
    );
  }

  if (evalStatus === "AWAITING_CLARIFICATION") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <div className="space-y-8">
          <Button variant="ghost" asChild className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/student/my-team">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
            </Link>
          </Button>

          <StudentJourneyBanner currentPhase="PHASE_1" latestStatus="AWAITING_CLARIFICATION" hasTeam={true} isLeader={isLeader} />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Phase 01 — Clarification
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Answer Clarification Questions</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Your proposal has {clarificationQuestions.length} questions to clarify scope before evaluation is finalized.
            </p>
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
              <p className="text-sm font-medium text-foreground">
                Question {currentQuestionIdx + 1} of {clarificationQuestions.length}
              </p>
              <Button variant="ghost" size="sm" onClick={handleAutofillClarifications} className="h-7 text-xs">
                Autofill demo
              </Button>
            </div>
            <div className="space-y-6 p-6 md:p-8">
              <p className="text-base font-medium leading-relaxed text-foreground md:text-lg">
                {clarificationQuestions[currentQuestionIdx]}
              </p>
              <Textarea
                className="min-h-[140px]"
                placeholder="Write your answer clearly..."
                value={clarificationAnswers[currentQuestionIdx] || ""}
                onChange={(e) => {
                  const next = [...clarificationAnswers];
                  next[currentQuestionIdx] = e.target.value;
                  setClarificationAnswers(next);
                }}
              />
              <div className="flex items-center justify-between border-t border-border pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIdx((v) => Math.max(0, v - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="h-9"
                >
                  <ChevronLeft className="mr-1.5 h-4 w-4" /> Previous
                </Button>

                {currentQuestionIdx < clarificationQuestions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIdx((v) => v + 1)}
                    disabled={!(clarificationAnswers[currentQuestionIdx] || "").trim()}
                    className="h-9 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Next
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleClarificationSubmit}
                    disabled={submitting || clarificationAnswers.some((a) => !(a || "").trim())}
                    className="h-9 bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Answers
                  </Button>
                )}
              </div>
            </div>
          </section>

          {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        </div>
      </main>
    );
  }

  if (!isLeader) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <div className="space-y-8">
          <Button variant="ghost" asChild className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/student/my-team">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
            </Link>
          </Button>

          <StudentJourneyBanner currentPhase="PHASE_1" hasTeam={true} isLeader={false} />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Phase 01 — View only
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Proposal</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Only the leader can edit this proposal. You can review the submitted details.
            </p>
          </div>

          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Submitted details</h2>
            </div>
            <CardContent className="space-y-6 p-6 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</p>
                <p className="font-medium text-foreground">{formData.title || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Domain</p>
                <p className="font-medium text-foreground">{formData.domain || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Abstract</p>
                <p className="leading-relaxed text-muted-foreground">{formData.objective || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Methodology</p>
                <p className="leading-relaxed text-muted-foreground">{formData.methodology || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tech stack</p>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{formData.techStack || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button asChild className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              <Link href="/student/feedback">View Feedback</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8">
        <Button variant="ghost" asChild className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/student/my-team">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
          </Link>
        </Button>

        <StudentJourneyBanner currentPhase="PHASE_1" hasTeam={true} isLeader={true} />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Phase 01 of 03 — Proposal
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Concept</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Define title, domain, abstract, methodology and tech stack for review.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Project essentials</h2>
            </div>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Project title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    required
                    placeholder="ProEval: AI-Powered Academic Evaluation"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Descriptive title.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain" className="text-sm font-medium">
                    Domain <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="domain"
                    required
                    placeholder="Artificial Intelligence / Web Tech"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Example: Computer Vision, Cloud</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective" className="text-sm font-medium">
                  Abstract & objectives <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="objective"
                  required
                  rows={6}
                  placeholder="Describe problem, goals and expected outcomes..."
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Problem, audience and outcome.</span>
                  <span className={formData.objective.trim().length >= 100 ? "font-medium text-foreground" : ""}>
                    {formData.objective.trim().length} chars
                  </span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="methodology" className="text-sm font-medium">
                    Methodology <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="methodology"
                    required
                    rows={5}
                    placeholder="Design, modules, algorithm pipeline..."
                    value={formData.methodology}
                    onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCaseDiagram" className="text-sm font-medium">
                    Use case / architecture diagram
                  </Label>
                  <Input
                    id="useCaseDiagram"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    required={!formData.useCaseDiagram}
                    onChange={handleUseCaseDiagramUpload}
                  />
                  <p className={`text-xs ${formData.useCaseDiagram ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {formData.useCaseDiagramName || "PNG, JPG, WebP or SVG — max 1 MB."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="techStack" className="text-sm font-medium">
                  Tech stack — one per line <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="techStack"
                  required
                  rows={4}
                  placeholder={"Next.js\nFastAPI\nPostgreSQL"}
                  value={formData.techStack}
                  onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Frameworks, languages, databases, cloud.</p>
              </div>
            </CardContent>
          </Card>

          {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button variant="outline" type="button" asChild className="h-9">
              <Link href="/student/my-team">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="h-9 min-w-[160px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : existingSubmissionId ? (
                "Resubmit Proposal"
              ) : (
                "Submit Proposal"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
