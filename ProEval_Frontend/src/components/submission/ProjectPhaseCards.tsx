"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isTestUserEmail } from "@/lib/portal-mode";
import { projectService } from "@/lib/project-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock, Clock3 } from "lucide-react";

interface ProjectPhaseCardsProps {
  projectId: string;
  currentPhase: string;
  phase1Data?: unknown;
  phase2Data?: unknown;
  finalData?: unknown;
  isLeader: boolean;
}

const phaseCopy = [
  {
    id: "phase1",
    step: "01",
    title: "Proposal",
    what: "Define title, abstract, domain and methodology.",
    why: "Sets scope and unlocks review.",
    path: "/student/submit/phase1",
  },
  {
    id: "phase2",
    step: "02",
    title: "Architecture",
    what: "Repository, slides and milestones.",
    why: "Evaluation of structure and progress.",
    path: "/student/submit/phase2",
  },
  {
    id: "final",
    step: "03",
    title: "Showcase",
    what: "Report, demo and deliverables.",
    why: "Final audit and Viva preparation.",
    path: "/student/submit/final",
  },
  {
    id: "interview",
    step: "04",
    title: "Viva",
    what: "5-minute technical Viva.",
    why: "Individual technical assessment.",
    path: "",
  },
];

export default function ProjectPhaseCards({
  projectId,
  currentPhase,
  phase1Data,
  phase2Data,
  finalData,
  isLeader,
}: ProjectPhaseCardsProps) {
  const { user } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [loading, setLoading] = useState(true);
  const [phaseStatuses, setPhaseStatuses] = useState({
    phase1: "NOT_STARTED",
    phase2: "LOCKED",
    final: "LOCKED",
    interview: "LOCKED",
  });

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!user || !projectId) return;
      setLoading(true);
      try {
        const [e1, e2, e3] = await Promise.all([
          projectService.getEvaluation(projectId, "PHASE_1", { testMode: isTestUser }).catch(() => ({ data: null })),
          projectService.getEvaluation(projectId, "PHASE_2", { testMode: isTestUser }).catch(() => ({ data: null })),
          projectService.getEvaluation(projectId, "FINAL", { testMode: isTestUser }).catch(() => ({ data: null })),
        ]);

        const p1Status = e1.data?.status || (phase1Data ? "IN_PROGRESS" : "NOT_STARTED");
        const p2Status = currentPhase === "PHASE_1" && e1.data?.status !== "COMPLETED" ? "LOCKED" : e2.data?.status || (phase2Data ? "IN_PROGRESS" : "AVAILABLE");
        const p3Status =
          currentPhase === "PHASE_1" || (currentPhase === "PHASE_2" && e2.data?.status !== "COMPLETED")
            ? "LOCKED"
            : e3.data?.status || (finalData ? "IN_PROGRESS" : "AVAILABLE");

        const interviewStatus = p1Status === "COMPLETED" && p2Status === "COMPLETED" && p3Status === "COMPLETED" ? "AVAILABLE" : "LOCKED";

        setPhaseStatuses({
          phase1: p1Status,
          phase2: p2Status,
          final: p3Status,
          interview: interviewStatus,
        });
      } catch (err) {
        console.error("Failed to fetch phase statuses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [currentPhase, finalData, phase1Data, phase2Data, projectId, isTestUser, user]);

  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[14px] border border-dashed border-border bg-muted/10">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="text-xs text-muted-foreground">Loading phases</p>
        </div>
      </div>
    );
  }

  const statuses: Record<string, string> = {
    phase1: phaseStatuses.phase1,
    phase2: phaseStatuses.phase2,
    final: phaseStatuses.final,
    interview: phaseStatuses.interview,
  };

  const getStatusLabel = (s: string) => {
    if (s === "COMPLETED") return "Completed";
    if (s === "AWAITING_CLARIFICATION") return "Needs clarification";
    if (s === "IN_PROGRESS") return "In review";
    if (s === "AVAILABLE") return "Ready";
    if (s === "LOCKED") return "Locked";
    return "Not started";
  };

  return (
    <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
      {phaseCopy.map((phase) => {
        const status = statuses[phase.id] || "NOT_STARTED";
        const isLocked = status === "LOCKED";
        const disabled = isLocked || (phase.id !== "interview" && !isLeader && status === "NOT_STARTED");
        const path = phase.id === "interview" ? (projectId ? `/student/interview/${projectId}` : "#") : phase.path;

        let label = isLocked ? "Locked" : isLeader ? "Open" : "View";
        if (phase.id === "interview") label = isLocked ? "Locked" : "Start Viva";
        else if (status === "COMPLETED") label = isLeader ? "View / Edit" : "View";
        else if (status === "AWAITING_CLARIFICATION") label = isLeader ? "Clarify" : "View";

        const isClarification = status === "AWAITING_CLARIFICATION";
        const isCompleted = status === "COMPLETED";
        const isReady = status === "AVAILABLE";
        const isReview = status === "IN_PROGRESS";

        return (
          <Card
            key={phase.id}
            className={[
              "group flex flex-col overflow-hidden rounded-[14px] border bg-card transition-all duration-200",
              isLocked
                ? "border-dashed border-border/70 bg-muted/10"
                : isClarification
                  ? "border-primary/30 bg-card shadow-sm hover:shadow-md hover:border-primary/40"
                  : isCompleted
                    ? "border-border bg-card hover:border-border hover:shadow-sm"
                    : isReady
                      ? "border-border bg-card shadow-sm hover:shadow-md hover:border-border"
                      : "border-border bg-card hover:border-border hover:shadow-sm",
            ].join(" ")}
          >
            <div className="space-y-3.5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Step {phase.step}
                </span>
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium leading-none",
                    isLocked
                      ? "bg-muted text-muted-foreground"
                      : isCompleted
                        ? "bg-foreground text-background"
                        : isClarification
                          ? "bg-primary text-primary-foreground"
                          : isReady
                            ? "bg-primary/10 text-primary"
                            : isReview
                              ? "bg-muted text-foreground"
                              : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : isCompleted ? (
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  ) : isClarification ? (
                    <Clock3 className="h-3 w-3" />
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isReady ? "bg-primary" : isReview ? "bg-foreground animate-pulse" : "bg-muted-foreground/60"
                      }`}
                    />
                  )}
                  {getStatusLabel(status)}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{phase.title}</h3>
              <div className="space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground/70">What:</span> {phase.what}
                </p>
                <p className="text-muted-foreground/80">{phase.why}</p>
              </div>
            </div>
            <CardContent className="mt-auto p-5 pt-0">
              <Button
                asChild={!disabled}
                disabled={disabled}
                size="sm"
                variant={disabled ? "outline" : "default"}
                className={[
                  "h-8 w-full rounded-full text-xs font-semibold transition-all duration-200",
                  disabled
                    ? "border-border bg-muted/30 text-muted-foreground"
                    : isLocked
                      ? "border-border bg-muted text-muted-foreground"
                      : isClarification
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow"
                        : "bg-foreground text-background hover:bg-foreground/90 shadow-sm",
                ].join(" ")}
              >
                {disabled ? <span>{label}</span> : <Link href={path}>{label}</Link>}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
