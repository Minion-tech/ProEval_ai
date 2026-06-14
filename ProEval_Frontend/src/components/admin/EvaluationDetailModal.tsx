"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, AlertCircle, ShieldAlert, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminService, type AdminEvaluationRecord } from "@/lib/admin-service";
import { parseAiNarrative } from "@/lib/feedback-parser";

interface EvaluationDetailModalProps {
  open: boolean;
  projectId: string | null;
  evaluationId?: string | null;
  projectTitle?: string;
  onClose: () => void;
}

const phaseLabels: Record<string, string> = {
  PHASE_1: "Phase 1",
  PHASE_2: "Phase 2",
  FINAL: "Final",
  INTERVIEW: "AI Interview",
};

const riskTypes = ["SIMILARITY", "STYLE_SHIFT", "CODE_JUMP", "AI_GENERATED", "CONTRIBUTION_MISMATCH"];

function getAgentLogs(item: AdminEvaluationRecord): Record<string, unknown>[] {
  return Array.isArray(item.agent_logs) ? (item.agent_logs as Record<string, unknown>[]) : [];
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function asList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  return [cleanText(value)].filter(Boolean);
}

function formatTimeline(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return cleanText(entry);
      const item = entry as Record<string, unknown>;
      const period = cleanText(item.weeks || item.week || item.period || "Phase");
      const goal = cleanText(item.goal || item.guidance || item.title || item.description || item.details);
      return goal ? `${period}: ${goal}` : period;
    })
    .filter(Boolean);
}

function extractPhaseSummary(item: AdminEvaluationRecord) {
  const logs = getAgentLogs(item);
  const primary = logs[0] || {};
  const parsed = parseAiNarrative(item.ai_narrative || "");

  // Use primary log data, fallback to parsed narrative if empty
  const findings = asList(primary.findings || primary.concerns);
  const recommendations = asList(primary.recommendations || primary.improvement_actions);
  const timeline = formatTimeline(primary.timeline);

  return {
    verdict: cleanText(primary.verdict || parsed.verdict.label || item.status),
    score: item.total_score ?? primary.score ?? parsed.verdict.score,
    reasoning: cleanText(primary.reasoning || parsed.verdict.summary),
    findings: findings.length ? findings : parsed.concerns,
    recommendations: recommendations.length ? recommendations : parsed.guidance.map((entry) => entry.title),
    timeline: timeline.length
      ? timeline
      : parsed.roadmap.map((entry) => `${entry.period}: ${entry.title}${entry.description ? ` - ${entry.description}` : ""}`),
  };
}

function extractRisks(evaluations: AdminEvaluationRecord[]) {
  return evaluations
    .filter((item) => item.phase === "PHASE_2" || item.phase === "FINAL")
    .flatMap((item) =>
      getAgentLogs(item).flatMap((log) =>
        asList(log.plagiarism_risks || log.risks || log.integrity_risks).map((risk) => {
          const matchedType = riskTypes.find((type) => risk.toUpperCase().includes(type));
          return {
            id: `${item.id}-${risk}`,
            phase: phaseLabels[item.phase] || item.phase,
            type: matchedType || "RISK_SIGNAL",
            text: risk,
          };
        })
      )
    );
}

export function EvaluationDetailModal({ open, projectId, evaluationId, projectTitle, onClose }: EvaluationDetailModalProps) {
  const [evaluations, setEvaluations] = useState<AdminEvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    adminService
      .getEvaluationsByProject(projectId)
      .then((res) => {
        if (!cancelled) setEvaluations(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch evaluation details:", err);
        if (!cancelled) setError("Could not load evaluation details for this project.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const sortedEvaluations = useMemo(() => {
    // If a specific evaluation ID was clicked, show only that one
    if (evaluationId) {
      return evaluations.filter(e => e.id === evaluationId);
    }

    const order = { PHASE_1: 0, PHASE_2: 1, FINAL: 2, INTERVIEW: 3 };
    
    // Group evaluations by phase and keep only the latest one
    const latestByPhase = new Map<string, AdminEvaluationRecord>();
    
    evaluations.forEach((evaluation) => {
      const existing = latestByPhase.get(evaluation.phase);
      if (!existing || new Date(evaluation.created_at).getTime() > new Date(existing.created_at).getTime()) {
        latestByPhase.set(evaluation.phase, evaluation);
      }
    });
    
    return Array.from(latestByPhase.values()).sort((a, b) => (order[a.phase] ?? 99) - (order[b.phase] ?? 99));
  }, [evaluations, evaluationId]);

  const risks = useMemo(() => extractRisks(sortedEvaluations), [sortedEvaluations]);
  const title = projectTitle || sortedEvaluations[0]?.project_title || "Project Evaluation";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI evaluation report</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close evaluation details">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading evaluation details...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="plagiarism">Plagiarism Report</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-6 space-y-4">
                {sortedEvaluations.length ? (
                  sortedEvaluations.map((item) => {
                    const summary = extractPhaseSummary(item);
                    const isHtmlNarrative = item.ai_narrative?.trim().startsWith("<");
                    return (
                      <section key={item.id} className="rounded-lg border bg-card p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{phaseLabels[item.phase] || item.phase}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Generated {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={item.status === "FAILED" ? "destructive" : "outline"}>{item.status}</Badge>
                            <Badge variant="secondary">
                              {item.grade || (summary.score ? `Score ${summary.score}` : "No score")}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Verdict</p>
                              <p className="mt-1 text-sm font-medium">{summary.verdict || item.status}</p>
                            </div>
                            {summary.reasoning && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Agent reasoning</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{summary.reasoning}</p>
                              </div>
                            )}
                            {isHtmlNarrative && item.ai_narrative && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Narrative</p>
                                <div
                                  className="prose prose-sm mt-2 max-w-none rounded-md border bg-muted/30 p-4"
                                  dangerouslySetInnerHTML={{ __html: item.ai_narrative }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <ListBlock title="Key findings" items={summary.findings} empty="No findings recorded." />
                            <ListBlock title="Recommendations" items={summary.recommendations} empty="No recommendations recorded." />
                            <ListBlock title="Timeline" items={summary.timeline} empty="No timeline recorded." icon="clock" />
                          </div>
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                    No evaluations have been generated for this project yet.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="plagiarism" className="mt-6">
                <div className="mb-4 grid gap-3 sm:grid-cols-5">
                  {riskTypes.map((type) => (
                    <div key={type} className="rounded-lg border bg-card p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{type}</p>
                      <p className="mt-2 text-2xl font-bold">{risks.filter((risk) => risk.type === type).length}</p>
                    </div>
                  ))}
                </div>

                {risks.length ? (
                  <div className="space-y-3">
                    {risks.map((risk) => (
                      <div key={risk.id} className="rounded-lg border bg-card p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{risk.phase}</Badge>
                          <Badge variant="secondary">{risk.type}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{risk.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
                    <ShieldAlert className="h-8 w-8" />
                    <p>No plagiarism or ownership risk signals are recorded for Phase 2 or Final.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  empty,
  icon,
}: {
  title: string;
  items: string[];
  empty: string;
  icon?: "clock";
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon === "clock" ? <Clock3 className="h-4 w-4 text-muted-foreground" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="text-sm leading-6 text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
