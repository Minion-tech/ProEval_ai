"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { parseAiNarrative } from "@/lib/feedback-parser";
import { isTestUserEmail } from "@/lib/portal-mode";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  HelpCircle,
  Download,
} from "lucide-react";
import { projectService, ProjectSubmission } from "@/lib/project-service";
import { RoadmapTimeline } from "@/components/roadmap-timeline";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";

interface EvaluationData {
  id: string;
  submission_id: string;
  phase: string;
  status: string;
  total_score: number;
  ai_narrative: string;
  agent_logs?: unknown;
  created_at: string;
}

export default function StudentFeedbackPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [projectData, setProjectData] = useState<unknown>(null);
  const [project, setProject] = useState<ProjectSubmission | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationData | null>>({
    PHASE_1: null,
    PHASE_2: null,
    FINAL: null,
    INTERVIEW: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [rawOpenFor, setRawOpenFor] = useState<string | null>(null);
  const [selectedRoadmapIndex, setSelectedRoadmapIndex] = useState(0);

  const fetchEvaluations = useCallback(
    async (silent = false) => {
      if (!user) return;

      try {
        if (!silent) setLoading(true);
        setError(null);
        const projectRes = await projectService.getMyProject({ testMode: isTestUser });
        const currentProject = projectRes.data?.project ?? null;
        if (!currentProject) {
          if (!silent) setLoading(false);
          return;
        }

        setProject(currentProject);
        setProjectData(projectRes.data);
        setIsLeader(currentProject.leader_id === user?.id);

        const phases = ["PHASE_1"];
        if (currentProject.phase_2_data) phases.push("PHASE_2");
        if (currentProject.final_data) {
          phases.push("FINAL");
          phases.push("INTERVIEW");
        }

        const evalResults: Record<string, EvaluationData | null> = {
          PHASE_1: null,
          PHASE_2: null,
          FINAL: null,
          INTERVIEW: null,
        };

        await Promise.all(
          phases.map(async (phase) => {
            try {
              const res = await projectService.getEvaluation(currentProject.id, phase, { testMode: isTestUser });
              if (res.data) {
                evalResults[phase] = res.data as EvaluationData;
              }
            } catch {
              // no evaluation yet
            }
          })
        );

        setEvaluations(evalResults);
      } catch (err) {
        console.error("Failed to fetch evaluations:", err);
        if (!silent) setError("Could not load evaluations. Please try again.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isTestUser, user]
  );

  useEffect(() => {
    if (!authLoading) {
      fetchEvaluations();
    }
  }, [user, authLoading, fetchEvaluations]);

  useEffect(() => {
    const isAnyPending = Object.values(evaluations).some((ev) => ev?.status === "PENDING" || ev?.status === "IN_PROGRESS");

    if (isAnyPending) {
      const intervalId = setInterval(() => {
        fetchEvaluations(true);
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [evaluations, fetchEvaluations]);

  useEffect(() => {
    if (project?.id && !isLeader) {
      const me = (projectData as { members?: Array<{ email: string; has_viewed_feedback?: boolean }> })?.members?.find(
        (m) => m.email === user?.email
      );
      if (me && !me.has_viewed_feedback) {
        projectService.markFeedbackViewed(project.id, { testMode: isTestUser }).catch((err) => console.error("Failed to mark viewed:", err));
      }
    }
  }, [project?.id, isLeader, projectData, user?.email, isTestUser]);

  useEffect(() => {
    setSelectedRoadmapIndex(0);
  }, [evaluations.PHASE_1?.id, evaluations.PHASE_2?.id, evaluations.FINAL?.id, evaluations.INTERVIEW?.id]);

  const renderPhaseFeedback = (phaseKey: string, phaseLabel: string) => {
    const item = evaluations[phaseKey] as unknown as {
      id: string;
      status: string;
      total_score: number;
      ai_narrative: string;
      agent_logs: Array<{
        agent?: string;
        reasoning?: string;
        findings?: string[];
        concerns?: string[];
        recommendations?: string[];
        improvement_actions?: string[];
        timeline?: Array<{ weeks?: string; period?: string; goal?: string; title?: string; description?: string }>;
        clarification_questions?: string[];
        clarification_evaluations?: Array<{ question_index?: number; notes?: string; answer?: string }>;
      }>;
      created_at: string;
    } | null;

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading {phaseLabel}</p>
        </div>
      );
    }

    if (!item) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No {phaseLabel} submission found</p>
            <p className="text-sm leading-relaxed text-muted-foreground">Submit your {phaseLabel} to receive feedback.</p>
            <Button variant="outline" size="sm" onClick={() => fetchEvaluations()} className="h-8">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      );
    }

    if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
      return (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Analysis in progress</p>
            <p className="text-sm text-muted-foreground">This usually takes under a minute. Refresh to check.</p>
            <Button variant="outline" size="sm" onClick={() => fetchEvaluations()} className="h-8">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      );
    }

    const getSubmitRoute = () => {
      if (phaseKey === "PHASE_2") return "/student/submit/phase2";
      if (phaseKey === "FINAL") return "/student/submit/final";
      return "/student/submit/phase1";
    };

    if (item.status === "AWAITING_CLARIFICATION") {
      return (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <HelpCircle className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Clarification needed</p>
            <p className="text-sm text-muted-foreground">A few questions need answers before evaluation is finalized.</p>
            {isLeader ? (
              <Button onClick={() => router.push(getSubmitRoute())} className="h-8 bg-primary font-medium text-primary-foreground hover:bg-primary/90">
                Provide answers
              </Button>
            ) : (
              <Button variant="outline" disabled className="h-8">
                Waiting for leader
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (item.status === "FAILED") {
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
            <p className="text-sm font-medium text-foreground">Analysis failed</p>
            <p className="text-sm text-muted-foreground">Resubmit to trigger a new evaluation.</p>
            {isLeader ? (
              <Button variant="outline" size="sm" onClick={() => router.push(getSubmitRoute())} className="h-8">
                Edit & resubmit
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="h-8">
                Leader only
              </Button>
            )}
          </div>
        </div>
      );
    }

    const buildParsedFromAgentLogs = (raw: typeof item) => {
      const clean = (value: unknown) => {
        if (!value && value !== 0) return "";
        return value
          .toString()
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/#+\s*/g, "")
          .replace(/(^|\s)[\-–•]\s+/g, "$1")
          .replace(/&quot;/g, '"')
          .replace(/\s{2,}/g, " ")
          .trim();
      };

      const htmlMode = raw.ai_narrative?.trim().startsWith("<");
      if (!htmlMode || !raw.agent_logs?.length) {
        return parseAiNarrative(raw.ai_narrative);
      }

      const primaryLog = (
        raw.agent_logs.find((l) => l.agent === "Architect") ||
        raw.agent_logs.find((l) => l.agent === "Ideator") ||
        raw.agent_logs[0] ||
        {}
      ) as unknown as Record<string, unknown>;
      const secondaryLog = (
        raw.agent_logs.length > 1 ? raw.agent_logs.find((l) => l.agent === "Ideator") || raw.agent_logs[1] : {}
      ) as unknown as Record<string, unknown>;

      const guidanceItems = [
        ...((primaryLog.improvement_actions as string[]) || (primaryLog.recommendations as string[]) || []),
        ...((secondaryLog.improvement_actions as string[]) || (secondaryLog.recommendations as string[]) || []),
      ] as string[];
      const concernsItems = [
        ...((primaryLog.findings as string[]) || (primaryLog.concerns as string[]) || []),
        ...((secondaryLog.findings as string[]) || (secondaryLog.concerns as string[]) || []),
      ] as string[];
      const timelineItems = [...((primaryLog.timeline as unknown[]) || []), ...((secondaryLog.timeline as unknown[]) || [])] as Array<Record<string, string>>;

      return {
        verdict: {
          label: ((primaryLog.verdict as string) || "REFINE").toString().toUpperCase(),
          score: Number(raw.total_score ?? 0),
          summary: clean(primaryLog.reasoning as string | undefined),
        },
        guidance: Array.from(new Set(guidanceItems)).map((t) => ({ title: clean(t), description: "" })),
        concerns: Array.from(new Set(concernsItems)).map((t) => clean(t)),
        roadmap: timelineItems.map((s) => ({
          period: clean(s.weeks || s.period || "Phase"),
          title: clean(s.goal || s.title || ""),
          description: clean(s.description || ""),
        })),
        clarificationAnswers: (
          ((secondaryLog.clarification_evaluations as unknown[]) || (primaryLog.clarification_evaluations as unknown[]) || []) as unknown[]
        ).map((c: unknown, index: number) => {
          const entry = c as { question_index?: number; notes?: string; answer?: string };
          const feedback = clean(entry.notes) || clean(entry.answer) || "No feedback available.";
          return `Answer ${entry.question_index || index + 1}: ${feedback}`;
        }),
        ideatorReview: clean(raw.agent_logs.find((l) => l.agent === "Ideator")?.reasoning || ""),
        architectReview: clean(raw.agent_logs.find((l) => l.agent === "Architect")?.reasoning || ""),
        raw: raw.ai_narrative,
      };
    };

    const parsed = buildParsedFromAgentLogs(item);
    const formattedDate = item.created_at
      ? new Date(item.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      : "—";
    const projectTitle = (project as { phase_1_data?: { title?: string } })?.phase_1_data?.title || "Project";
    const roadmapItem = parsed.roadmap[selectedRoadmapIndex] || parsed.roadmap[0];

    const downloadReport = () => {
      const title = projectTitle;
      const date = formattedDate;
      const verdict = parsed.verdict.label;
      const summary = parsed.verdict.summary;

      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${phaseLabel} Report</title>
        <style>
          body { font-family: 'Geist', Helvetica, sans-serif; line-height: 1.6; color: #111; }
          h1 { font-size: 20px; border-bottom: 1px solid #E5E5E5; padding-bottom: 8px; }
          h2 { font-size: 14px; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.08em; color: #737373; }
          .summary { font-size: 13px; color: #171717; margin: 12px 0; padding: 12px; border: 1px solid #E5E5E5; }
        </style>
        </head>
        <body>
          <h1>${phaseLabel}: ${title}</h1>
          <p style="font-size:12px;color:#737373;">Date: ${date} · Verdict: ${verdict} · Score: ${parsed.verdict.score}/100</p>
          <h2>Summary</h2>
          <div class="summary">${summary}</div>
          ${parsed.guidance.length ? `<h2>Guidance</h2><ul>${parsed.guidance.map((g) => `<li>${g.title}</li>`).join("")}</ul>` : ""}
          ${parsed.concerns.length ? `<h2>Concerns</h2><ul>${parsed.concerns.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
          <p style="margin-top:32px;font-size:10px;color:#A1A1A1;border-top:1px solid #E5E5E5;padding-top:8px;">Generated by ProEval · ${item.id} · ${phaseLabel}</p>
        </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", content], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ProEval_${phaseKey}_Report.doc`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-8">
        {/* Verdict */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{phaseLabel}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{projectTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">“{parsed.verdict.summary || "Evaluation completed."}”</p>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-border font-mono text-xs font-medium">
                {parsed.verdict.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score <span className="font-medium text-foreground">{parsed.verdict.score}/100</span>
              </span>
              <span className="hidden text-xs text-muted-foreground md:inline">· {formattedDate}</span>
            </div>
            <Button size="sm" variant="outline" onClick={downloadReport} className="h-8 w-fit gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Download report
            </Button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="space-y-6">
            <Card className="border border-border bg-card">
              <CardContent className="space-y-4 p-6">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Overview</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{parsed.verdict.summary || "Evaluation available. See detailed sections for guidance."}</p>
              </CardContent>
            </Card>

            {phaseKey === "PHASE_1" ? (
              <div className="space-y-4">
                {item.agent_logs?.some((l) => l.agent === "Ideator") && (
                  <Card className="border border-border bg-card">
                    <CardContent className="space-y-4 p-6">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">Concept review</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {(item.agent_logs.find((l) => l.agent === "Ideator")?.reasoning as string) || ""}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {item.agent_logs?.some((l) => l.agent === "Architect") ? (
                  <Card className="border border-border bg-card">
                    <CardContent className="space-y-4 p-6">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">Technical review</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {(item.agent_logs.find((l) => l.agent === "Architect")?.reasoning as string) || ""}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Technical review pending</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Available once the team is complete.</p>
                  </div>
                )}
              </div>
            ) : (
              <Card className="border border-border bg-card">
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground prose-p:text-muted-foreground">
                    <div dangerouslySetInnerHTML={{ __html: item.ai_narrative }} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border border-border bg-card">
              <CardContent className="space-y-6 p-6">
                {parsed.guidance.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">Guidance</h3>
                    <ul className="space-y-2">
                      {parsed.guidance.map((g, idx) => (
                        <li key={idx} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                          {g.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsed.concerns.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">Risks</h3>
                    <ul className="space-y-2">
                      {parsed.concerns.map((c, idx) => (
                        <li key={idx} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsed.clarificationAnswers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">Clarification feedback</h3>
                    <ul className="space-y-2">
                      {parsed.clarificationAnswers.map((a: string, idx: number) => (
                        <li key={idx} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Answer {idx + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsed.roadmap.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">Roadmap</h3>
                    <RoadmapTimeline items={parsed.roadmap} selectedIndex={selectedRoadmapIndex} onSelect={setSelectedRoadmapIndex} />
                    {roadmapItem && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{roadmapItem.period}</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{roadmapItem.title}</p>
                        {roadmapItem.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{roadmapItem.description}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="font-mono">{item.id.slice(0, 8)}</span>
                  <span>{phaseLabel}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-full justify-center text-xs" onClick={() => setRawOpenFor(rawOpenFor === item.id ? null : item.id)}>
                  {rawOpenFor === item.id ? "Hide details" : "View details"}
                </Button>
                {rawOpenFor === item.id && (
                  <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                    {JSON.stringify(item.agent_logs, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Please log in to view feedback.</p>
      </div>
    );
  }

  const tabs = [
    { key: "PHASE_1", label: "Phase 1", show: true },
    { key: "PHASE_2", label: "Phase 2", show: isTestUser || !!project?.phase_2_data || !!evaluations.PHASE_2 },
    { key: "FINAL", label: "Final", show: isTestUser || !!project?.final_data || !!evaluations.FINAL },
    { key: "INTERVIEW", label: "Viva", show: isTestUser || !!evaluations.INTERVIEW },
  ].filter((t) => t.show);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8 md:space-y-10">
        <StudentJourneyBanner
          currentPhase={project?.current_phase || "NO_TEAM"}
          isLeader={isLeader}
          latestStatus={(projectData as { latest_evaluation_status?: string })?.latest_evaluation_status}
          hasTeam={!!project}
          projectId={project?.id}
        />

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Feedback</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Mentorship & Feedback</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Structured evaluation of your proposal, architecture and Viva — with clear next steps.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <Tabs defaultValue="PHASE_1" className="w-full">
          <div className="border-b border-border">
            <TabsList className="h-auto justify-start gap-6 bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-none border-b-2 border-transparent bg-transparent px-1 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="pt-8">
            <TabsContent value="PHASE_1" className="mt-0 outline-none">
              {renderPhaseFeedback("PHASE_1", "Proposal")}
            </TabsContent>
            {tabs.some((t) => t.key === "PHASE_2") && (
              <TabsContent value="PHASE_2" className="mt-0 outline-none">
                {renderPhaseFeedback("PHASE_2", "Architecture")}
              </TabsContent>
            )}
            {tabs.some((t) => t.key === "FINAL") && (
              <TabsContent value="FINAL" className="mt-0 outline-none">
                {renderPhaseFeedback("FINAL", "Final Review")}
              </TabsContent>
            )}
            {tabs.some((t) => t.key === "INTERVIEW") && (
              <TabsContent value="INTERVIEW" className="mt-0 outline-none">
                {renderPhaseFeedback("INTERVIEW", "Viva")}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </main>
  );
}
