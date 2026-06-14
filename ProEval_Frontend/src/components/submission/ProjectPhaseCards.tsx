"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isTestUserEmail } from "@/lib/portal-mode";
import { projectService } from "@/lib/project-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Terminal, Trophy, Mic, Lock, CheckCircle2, Loader2, Info } from "lucide-react";

interface ProjectPhaseCardsProps {
  projectId: string;
  currentPhase: string;
  phase1Data?: unknown;
  phase2Data?: unknown;
  finalData?: unknown;
  isLeader: boolean;
}

interface EvalStatus {
  status: string;
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" };
    case "AWAITING_CLARIFICATION":
      return { label: "Clarification Needed", color: "bg-orange-100 text-orange-700 border-orange-200" };
    case "IN_PROGRESS":
      return { label: "In Review", color: "bg-blue-100 text-blue-700 border-blue-200" };
    case "AVAILABLE":
      return { label: "Available", color: "bg-blue-50 text-blue-600 border-blue-100" };
    case "LOCKED":
      return { label: "Locked", color: "bg-gray-100 text-gray-500 border-gray-200" };
    default:
      return { label: "Not Started", color: "bg-gray-100 text-gray-600 border-gray-200" };
  }
};

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
      if (!user) return;
      setLoading(true);
      try {
        const [e1, e2, e3] = await Promise.all([
          projectService.getEvaluation(projectId, "PHASE_1", { testMode: isTestUser }).catch(() => ({ data: null })),
          projectService.getEvaluation(projectId, "PHASE_2", { testMode: isTestUser }).catch(() => ({ data: null })),
          projectService.getEvaluation(projectId, "FINAL", { testMode: isTestUser }).catch(() => ({ data: null })),
        ]);

        const p1Status = e1.data?.status || (phase1Data ? "IN_PROGRESS" : "NOT_STARTED");
        const p2Status = (currentPhase === "PHASE_1" && e1.data?.status !== "COMPLETED") ? "LOCKED" : (e2.data?.status || (phase2Data ? "IN_PROGRESS" : "AVAILABLE"));
        const p3Status = (currentPhase === "PHASE_1" || (currentPhase === "PHASE_2" && e2.data?.status !== "COMPLETED")) ? "LOCKED" : (e3.data?.status || (finalData ? "IN_PROGRESS" : "AVAILABLE"));
        
        // Interview is only available if all 3 phases are COMPLETED
        const interviewStatus = (p1Status === "COMPLETED" && p2Status === "COMPLETED" && p3Status === "COMPLETED") ? "AVAILABLE" : "LOCKED";

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

  const phases = [
    {
      id: "phase1",
      title: "Phase 1: Project Concept",
      description: "Define your project title, abstract, domain, and initial goals. This is your project's foundation.",
      icon: <Rocket className="h-8 w-8" />,
      status: phaseStatuses.phase1,
      isLocked: false,
      color: "border-blue-200 bg-blue-50/50",
      path: "/student/submit/phase1",
    },
    {
      id: "phase2",
      title: "Phase 2: Mid-term Build",
      description: "Submit your code repository, architecture diagrams, and progress milestones for evaluation.",
      icon: <Terminal className="h-8 w-8" />,
      status: phaseStatuses.phase2,
      isLocked: phaseStatuses.phase2 === "LOCKED",
      color: phaseStatuses.phase2 === "LOCKED" ? "border-gray-200 bg-gray-50/50" : "border-indigo-200 bg-indigo-50/50",
      path: "/student/submit/phase2",
    },
    {
      id: "final",
      title: "Phase 3: Final Showcase",
      description: "The grand finale. Submit your final report, demo video, and complete source code.",
      icon: <Trophy className="h-8 w-8" />,
      status: phaseStatuses.final,
      isLocked: phaseStatuses.final === "LOCKED",
      color: phaseStatuses.final === "LOCKED" ? "border-gray-200 bg-gray-50/50" : "border-amber-200 bg-amber-50/50",
      path: "/student/submit/final",
    },
    {
      id: "interview",
      title: "AI Technical Interview",
      description: "Final technical viva. Face the AI to validate your technical depth and original contributions.",
      icon: <Mic className="h-8 w-8" />,
      status: phaseStatuses.interview,
      isLocked: phaseStatuses.interview === "LOCKED",
      color: phaseStatuses.interview === "LOCKED" ? "border-gray-200 bg-gray-50/50" : "border-violet-200 bg-violet-50/50",
      path: projectId ? `/student/interview/${projectId}` : "#",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[240px] rounded-3xl border border-dashed border-slate-200 bg-white/70">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {phases.map((phase) => {
        const statusInfo = getStatusDisplay(phase.status);
        const disabled = phase.isLocked || (phase.id !== 'interview' && !isLeader && phase.status === "NOT_STARTED");
        
        let label = phase.isLocked ? "Locked" : (isLeader ? "Start Submission" : "Leader-only");

        if (phase.id === 'interview') {
          label = phase.isLocked ? "Complete All Three Phases" : "Start Interview";
        } else {
          if (phase.status === "COMPLETED") {
            label = isLeader ? "View/Edit Submission" : "View Submission";
          } else if (phase.status === "AWAITING_CLARIFICATION") {
            label = isLeader ? "Provide Clarification" : "View Clarification";
          }
        }

        return (
          <Card key={phase.id} className={`relative overflow-hidden border-2 transition-all hover:shadow-md ${phase.color} ${phase.isLocked ? "opacity-75 grayscale" : ""}`}>
            {phase.isLocked && (
              <div className="absolute top-4 right-4 text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
            )}
            <CardHeader className="pb-4">
              <div className={`p-3 rounded-xl bg-white w-fit shadow-sm border mb-4 ${phase.isLocked ? "text-gray-400" : "text-primary"}`}>
                {phase.icon}
              </div>
              <CardTitle className="text-xl font-bold">{phase.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-2 h-12">{phase.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Badge className={`px-3 py-1 border ${statusInfo.color}`} variant="outline">
                  {statusInfo.label}
                </Badge>
                {phase.status === "COMPLETED" && (
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </div>
                )}
              </div>
              <Button asChild disabled={disabled} className={`w-full py-6 text-base font-bold shadow-lg transition-transform active:scale-95 ${disabled ? "bg-gray-400" : ""}`}>
                <Link href={disabled ? "#" : phase.path}>{label}</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
