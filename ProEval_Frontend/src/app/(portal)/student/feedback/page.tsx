"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { parseAiNarrative } from "@/lib/feedback-parser";
import { isTestUserEmail } from "@/lib/portal-mode";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Lightbulb, 
  Users, 
  Loader2, 
  Clock, 
  RefreshCw, 
  HelpCircle, 
  Target,
  ShieldAlert,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Code2,
  Download,
  Mic
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { projectService, ProjectSubmission } from "@/lib/project-service";
import { RoadmapTimeline } from "@/components/roadmap-timeline";

interface EvaluationData {
  id: string;
  submission_id: string;
  phase: string;
  status: string;
  total_score: number;
  ai_narrative: string;
  agent_logs?: any;
  created_at: string;
}

export default function StudentFeedbackPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [projectData, setProjectData] = useState<any>(null);
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

  const fetchEvaluations = useCallback(async (silent = false) => {
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
              evalResults[phase] = res.data;
            }
          } catch {
            // No evaluation for this phase yet
          }
        })
      );

      setEvaluations(evalResults);
    } catch (err) {
      console.error("Failed to fetch evaluations:", err);
      if (!silent) setError("Could not load your evaluations. Please try again later.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isTestUser, user]);

  useEffect(() => {
    if (!authLoading) {
      fetchEvaluations();
    }
  }, [user, authLoading, fetchEvaluations]);

  // Polling mechanism for pending evaluations
  useEffect(() => {
    const isAnyPending = Object.values(evaluations).some(
      (ev) => ev?.status === "PENDING" || ev?.status === "IN_PROGRESS"
    );

    if (isAnyPending) {
      const intervalId = setInterval(() => {
        fetchEvaluations(true); // silent fetch
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(intervalId);
    }
  }, [evaluations, fetchEvaluations]);

  // Mark feedback as viewed when this page is opened
  useEffect(() => {
    if (project?.id && !isLeader) {
      const me = projectData?.members?.find((m: any) => m.email === user?.email);
      if (me && !me.has_viewed_feedback) {
        projectService.markFeedbackViewed(project.id, { testMode: isTestUser })
          .catch(err => console.error("Failed to mark feedback viewed:", err));
      }
    }
  }, [project?.id, isLeader, projectData?.members, user?.email, isTestUser]);

  useEffect(() => {
    setSelectedRoadmapIndex(0);
  }, [evaluations.PHASE_1?.id, evaluations.PHASE_2?.id, evaluations.FINAL?.id, evaluations.INTERVIEW?.id]);

  const renderPhaseFeedback = (phaseKey: string, phaseLabel: string) => {
    const item = evaluations[phaseKey];

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Fetching {phaseLabel} evaluation...</p>
        </div>
      );
    }

    if (!item) {
      return (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-muted p-3 rounded-full">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No {phaseLabel} submission found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submit your {phaseLabel} proposal to receive AI mentorship feedback.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchEvaluations()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
      return (
        <Card className="border-dashed border-2 border-blue-200">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-blue-50 p-3 rounded-full">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
            <div>
              <p className="font-semibold">AI Mentor is analyzing your proposal...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This usually takes 30–60 seconds. Click refresh to check.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchEvaluations()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </CardContent>
        </Card>
      );
    }

    const getSubmitRoute = () => {
      if (phaseKey === "PHASE_2") return "/student/submit/phase2";
      if (phaseKey === "FINAL") return "/student/submit/final";
      return "/student/submit/phase1";
    };

    if (item.status === "AWAITING_CLARIFICATION") {
      return (
        <Card className="border-2 border-orange-200 bg-orange-50/30">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-orange-100 p-3 rounded-full">
              <HelpCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-900">Clarification Needed</p>
              <p className="text-sm text-orange-700 mt-1 max-w-md">
                The AI Mentors have some questions about your proposal before they can provide a final verdict.
              </p>
            </div>
            {isLeader ? (
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => router.push(getSubmitRoute())}>Provide Clarifications</Button>
            ) : (
              <Button className="bg-orange-100 text-muted-foreground" disabled>Awaiting Leader</Button>
            )}
          </CardContent>
        </Card>
      );
    }

    if (item.status === "FAILED") {
      return (
        <Card className="border-2 border-red-200">
          <CardContent className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-red-50 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-semibold">AI analysis failed.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Resubmit your proposal to trigger a new evaluation.
              </p>
            </div>
            {isLeader ? (
              <Button variant="outline" size="sm" onClick={() => router.push(getSubmitRoute())}>Edit &amp; Resubmit</Button>
            ) : (
              <Button variant="outline" size="sm" disabled>Leader Only</Button>
            )}
          </CardContent>
        </Card>
      );
    }

    const buildParsedFromAgentLogs = (item: any) => {
      const cleanAgentText = (value: any) => {
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

      const htmlMode = item.ai_narrative?.trim().startsWith("<");
      if (!htmlMode || !item.agent_logs?.length) {
        return parseAiNarrative(item.ai_narrative);
      }

      const primaryLog = item.agent_logs.find((l: any) => l.agent === "Architect") || item.agent_logs.find((l: any) => l.agent === "Ideator") || item.agent_logs[0] || {};
      const secondaryLog = item.agent_logs.length > 1 ? (item.agent_logs.find((l: any) => l.agent === "Ideator") || item.agent_logs[1]) : {};
      
      const guidanceItems = [
        ...(primaryLog.improvement_actions || primaryLog.recommendations || []),
        ...(secondaryLog.improvement_actions || secondaryLog.recommendations || []),
      ];
      const concernsItems = [
        ...(primaryLog.findings || primaryLog.concerns || []),
        ...(secondaryLog.findings || secondaryLog.concerns || []),
      ];
      
      const timelineItems = [
        ...(primaryLog.timeline || []),
        ...(secondaryLog.timeline || []),
      ];

      return {
        verdict: {
          label: (primaryLog.verdict || "REFINE").toString().toUpperCase(),
          score: Number(item.total_score ?? primaryLog.score ?? secondaryLog.score ?? 0),
          summary: cleanAgentText(primaryLog.reasoning || ""),
        },
        guidance: Array.from(new Set(guidanceItems)).map((item: any) => ({ title: cleanAgentText(item), description: "" })),
        concerns: Array.from(new Set(concernsItems)).map((item: any) => cleanAgentText(item)),
        roadmap: timelineItems.map((s: any) => ({
          period: cleanAgentText(s.weeks || s.week || s.period || "Phase"),
          title: cleanAgentText(s.goal || s.guidance || s.title || ""),
          description: cleanAgentText(s.description || s.details || ""),
        })),
        clarificationAnswers: (secondaryLog.clarification_evaluations || primaryLog.clarification_evaluations || []).map((c: any, index: number) => {
          const questionIndex = c.question_index || index + 1;
          const feedback = cleanAgentText(c.notes) || cleanAgentText(c.answer) || "No AI feedback available.";
          return `Answer ${questionIndex}: ${feedback}`;
        }),
        ideatorReview: cleanAgentText(item.agent_logs.find((l: any) => l.agent === "Ideator")?.reasoning || ""),
        architectReview: cleanAgentText(item.agent_logs.find((l: any) => l.agent === "Architect")?.reasoning || ""),
        raw: item.ai_narrative,
      };
    };

    const parsed = buildParsedFromAgentLogs(item);
    const isHtmlOutput = !!item.ai_narrative?.trim().startsWith("<");
    const ideatorSection = parsed.ideatorReview;
    const architectSection = parsed.architectReview;
    const formattedDate = item.created_at
      ? new Date(item.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";
    const projectTitle = project?.phase_1_data?.title || "Project";
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
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          h2 { color: #334155; margin-top: 25px; border-left: 4px solid #6366f1; padding-left: 10px; }
          .verdict { font-weight: bold; padding: 10px; border-radius: 5px; background: #f8fafc; display: inline-block; }
          .summary { font-style: italic; color: #475569; margin: 20px 0; padding: 15px; background: #f1f5f9; }
          ul { margin-bottom: 20px; }
          li { margin-bottom: 8px; }
          .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          .transcript { background: #1e293b; color: #f8fafc; padding: 15px; font-family: monospace; font-size: 11px; border-radius: 8px; }
        </style>
        </head>
        <body>
          <h1>${phaseLabel}: ${title}</h1>
          <p><strong>Date:</strong> ${date}</p>
          <div class="verdict">AI Verdict: ${verdict}</div>
          
          <h2>Evaluation Summary</h2>
          <div class="summary">${summary}</div>

          ${parsed.guidance.length > 0 ? `
            <h2>Guidance & Recommendations</h2>
            <ul>${parsed.guidance.map(g => `<li><strong>${g.title}</strong></li>`).join('')}</ul>
          ` : ''}

          ${parsed.concerns.length > 0 ? `
            <h2>Critical Risks & Concerns</h2>
            <ul>${parsed.concerns.map(c => `<li>${c}</li>`).join('')}</ul>
          ` : ''}

          ${parsed.roadmap.length > 0 ? `
            <h2>Execution Roadmap</h2>
            ${parsed.roadmap.map(r => `<p><strong>${r.period}:</strong> ${r.title}<br/>${r.description}</p>`).join('')}
          ` : ''}

          ${item.ai_narrative ? `
            <h2>AI Detailed Analysis</h2>
            <div>${item.ai_narrative}</div>
          ` : ''}

          <div class="footer">
            Generated by ProEval AI | Report ID: ${item.id} | Evaluation Phase: ${phaseLabel}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ProEval_${phaseKey}_Report_${title.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    const verdictColor = 
      parsed.verdict.label === "APPROVE" || parsed.verdict.label === "PASS" || parsed.verdict.label === "ON_TRACK" ? "text-green-600 border-green-200 bg-green-50" :
      parsed.verdict.label === "REFINE" || parsed.verdict.label === "REVIEW" || parsed.verdict.label === "AT_RISK" ? "text-orange-600 border-orange-200 bg-orange-50" :
      "text-red-600 border-red-200 bg-red-50";

    return (
      <div className="space-y-10">
        {phaseKey === "INTERVIEW" && (
           <div className="bg-violet-50 border-2 border-violet-200 rounded-[2rem] p-8 flex items-center gap-6 mb-6">
              <div className="h-16 w-16 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                 <Mic className="h-8 w-8 text-white" />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-violet-900">Conversational AI Assessment</h3>
                 <p className="text-violet-700/80">This evaluation combines your technical responses with behavioral telemetry from the live viva session.</p>
              </div>
           </div>
        )}
        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.95fr]">
        <section className="space-y-6">
          <div className={`relative overflow-hidden rounded-[2rem] border-2 p-10 shadow-xl ${verdictColor}`}>
            <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900">
              <Sparkles className="h-64 w-64" />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                    {phaseKey === "PHASE_2" ? "Mentor Progress Review" : phaseKey === "INTERVIEW" ? "Viva Assessment" : "AI Mentorship Report"}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                  {projectTitle}
                </h2>
                <p className="text-xl text-slate-700 font-medium leading-relaxed">
                  &ldquo;{parsed.verdict.summary}&rdquo;
                </p>
              </div>

              <div className="flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-[2rem] p-8 border shadow-sm min-w-[200px]">
                <span className="text-base font-bold text-slate-900">Detailed AI Feedback</span>
                <p className="mt-4 text-sm leading-6 text-slate-600">Open the panel to view the full report and roadmap.</p>
              </div>
            </div>
          </div>

          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Overview</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {parsed.verdict.summary || "The AI evaluation has been generated and is available in the report panel."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-1">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Open report panel</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Full AI mentorship is available in the side canvas.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="sticky top-6 rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Detailed report</p>
                <h2 className="text-2xl font-black text-slate-900">{phaseLabel} Canvas</h2>
              </div>
              <Button size="sm" className="inline-flex items-center gap-2" onClick={downloadReport}>
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
            <div className="space-y-6 p-6">
              {/* Global Verdict Summary */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-2">Evaluation Summary</p>
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className={`text-sm font-bold ${verdictColor}`}>
                    {parsed.verdict.label}
                  </Badge>
                  <span className="text-sm font-bold text-slate-900">Score: {parsed.verdict.score}/100</span>
                </div>
                <p className="text-sm leading-7 text-slate-600 italic">"{parsed.verdict.summary || "AI analysis completed."}"</p>
              </div>

              {/* Phase 1 Specialized Multi-Agent Output */}
              {phaseKey === "PHASE_1" ? (
                <div className="space-y-6">
                  {/* Ideator Agent Section */}
                  {item.agent_logs?.some((l: any) => l.agent === "Ideator") && (
                    <div className="rounded-3xl border-2 border-sky-100 bg-sky-50/30 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-sky-600 text-white">
                          <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-sky-900 leading-tight">Ideator Mentorship</h3>
                          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Concept & Feasibility</p>
                        </div>
                      </div>
                      
                      {(() => {
                        const log = item.agent_logs.find((l: any) => l.agent === "Ideator");
                        return (
                          <div className="space-y-4">
                            <div className="rounded-2xl bg-white/80 p-4 border border-sky-100">
                              <p className="text-sm leading-relaxed text-slate-700">{log.reasoning}</p>
                            </div>
                            {log.findings?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-800">Key Observations</h4>
                                <ul className="space-y-1.5">
                                  {log.findings.map((f: string, i: number) => (
                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Architect Agent Section */}
                  {item.agent_logs?.some((l: any) => l.agent === "Architect") ? (
                    <div className="rounded-3xl border-2 border-violet-100 bg-violet-50/30 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-violet-600 text-white">
                          <Target className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-violet-900 leading-tight">Architect Review</h3>
                          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Technical Implementation</p>
                        </div>
                      </div>
                      
                      {(() => {
                        const log = item.agent_logs.find((l: any) => l.agent === "Architect");
                        return (
                          <div className="space-y-4">
                            <div className="rounded-2xl bg-white/80 p-4 border border-violet-100">
                              <p className="text-sm leading-relaxed text-slate-700">{log.reasoning}</p>
                            </div>
                            {log.recommendations?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-800">Technical Guidance</h4>
                                <ul className="space-y-1.5">
                                  {log.recommendations.map((r: string, i: number) => (
                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                      <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-500">Architect Review Pending</h4>
                      <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-1">
                        Triggered automatically once your team is fully formed (Leader + 2 Members).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Narrative for other phases */
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-500 mb-4">AI formatted output</p>
                  <div className="prose prose-slate max-w-none text-sm leading-7 text-slate-700">
                    <div dangerouslySetInnerHTML={{ __html: item.ai_narrative }} />
                  </div>
                </div>
              )}

              {parsed.guidance.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4 text-slate-900">
                    <Lightbulb className="h-5 w-5 text-orange-600" />
                    <h3 className="text-base font-black">Guidance</h3>
                  </div>
                  <div className="space-y-3">
                    {parsed.guidance.map((item, idx) => (
                      <div key={idx} className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        {item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsed.concerns.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4 text-slate-900">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <h3 className="text-base font-black">Critical Risks</h3>
                  </div>
                  <div className="space-y-3">
                    {parsed.concerns.map((concern, idx) => (
                      <div key={idx} className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{concern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsed.clarificationAnswers.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4 text-slate-900">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h3 className="text-base font-black">Clarification Feedback</h3>
                  </div>
                  <div className="space-y-3">
                    {parsed.clarificationAnswers.map((answer: string, idx: number) => (
                      <div key={idx} className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <span className="block text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Answer {idx + 1}</span>
                        <p>{answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsed.roadmap.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4 text-slate-900">
                    <CalendarDays className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-base font-black">Execution Roadmap</h3>
                  </div>
                  <RoadmapTimeline
                    items={parsed.roadmap}
                    selectedIndex={selectedRoadmapIndex}
                    onSelect={(index) => setSelectedRoadmapIndex(index)}
                  />
                  {roadmapItem && (
                    <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-2">Selected step</p>
                      <p className="text-sm font-semibold text-slate-900">{roadmapItem.title || roadmapItem.period}</p>
                      {roadmapItem.description ? (
                        <p className="mt-2 text-sm text-slate-600">{roadmapItem.description}</p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-xs">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{item.id.split('-')[0]}</Badge>
              <span>Generated on {formattedDate}</span>
           </div>
           <div className="flex items-center gap-1">
              <span>Evaluation Phase:</span>
              <span className="font-bold text-slate-900">{phaseLabel}</span>
           </div>
        </div>
        {item.agent_logs && (
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={() => setRawOpenFor(rawOpenFor === item.id ? null : item.id)}>
              {rawOpenFor === item.id ? 'Hide raw agent log' : 'View raw agent log'}
            </Button>
            {rawOpenFor === item.id && (
              <div className="mt-3 p-4 bg-black/5 rounded-md overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-slate-800">{JSON.stringify(item.agent_logs, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-lg font-medium">Please log in to view your feedback.</p>
      </div>
    );
  }

  const tabs = [
    { key: "PHASE_1", label: "Phase 1", show: true },
    { key: "PHASE_2", label: "Phase 2", show: isTestUser || !!project?.phase_2_data || !!evaluations.PHASE_2 },
    { key: "FINAL", label: "Final Audit", show: isTestUser || !!project?.final_data || !!evaluations.FINAL },
    { key: "INTERVIEW", label: "AI Viva", show: isTestUser || !!evaluations.INTERVIEW },
  ].filter((tab) => tab.show);

  return (
    <main className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Mentorship Feedback</h1>
          <p className="text-muted-foreground">Actionable insights generated by ProEval AI to help your project succeed.</p>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

        <Tabs defaultValue="PHASE_1" className="w-full">
          <TabsList className={`grid w-full h-14 bg-slate-100/50 p-1 border rounded-2xl ${
            tabs.length === 1 ? "grid-cols-1" : 
            tabs.length === 2 ? "grid-cols-2" : 
            tabs.length === 3 ? "grid-cols-3" : "grid-cols-4"
          }`}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-sm font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-12">
            <TabsContent value="PHASE_1" className="outline-none">{renderPhaseFeedback("PHASE_1", "Initial Proposal")}</TabsContent>
            {tabs.some((tab) => tab.key === "PHASE_2") && (
              <TabsContent value="PHASE_2" className="outline-none">{renderPhaseFeedback("PHASE_2", "Mid-term Build")}</TabsContent>
            )}
            {tabs.some((tab) => tab.key === "FINAL") && (
              <TabsContent value="FINAL" className="outline-none">{renderPhaseFeedback("FINAL", "Final Evaluation")}</TabsContent>
            )}
            {tabs.some((tab) => tab.key === "INTERVIEW") && (
              <TabsContent value="INTERVIEW" className="outline-none">{renderPhaseFeedback("INTERVIEW", "Technical Viva")}</TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </main>
  );
}
