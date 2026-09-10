"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectService, type MyProjectResponse } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Proposal {
  id: string;
  team_id: string;
  attempt_number: number;
  phase_1_data: unknown;
  evaluation_status: string;
  evaluation_summary: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<MyProjectResponse | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectRes = await projectService.getMyProject({ testMode: isTestUser });
      setProjectData(projectRes.data ?? null);

      if (isTestUser) {
        const proposalsRes = await projectService.getMyProposals({ testMode: true });
        setProposals((proposalsRes.data?.proposals as Proposal[]) || []);
      } else {
        setProposals([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't load your project details. Please check your connection or try again.");
    } finally {
      setLoading(false);
    }
  }, [isTestUser]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, fetchData]);

  const handleDelete = async (submissionId: string) => {
    if (!confirm("Delete this active test project and reset the workspace?")) return;
    try {
      await projectService.deleteProject(submissionId, { testMode: isTestUser });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading workspace</p>
      </div>
    );
  }

  const activeProject = projectData?.project ?? null;
  const isLeader = projectData?.user_role === "Leader / Product Manager" || activeProject?.leader_id === user?.id;
  const currentPhaseRaw = activeProject?.current_phase || "NO_TEAM";

  let humanPhase = "Team Setup Needed";
  let phaseDescription = "Create or join a team to start your project workflow.";
  let primaryCtaText = "Start Team Setup";
  let primaryCtaHref = "/student/team";

  if (activeProject) {
    const rawP = currentPhaseRaw.toLowerCase();
    if (rawP.includes("final") || rawP.includes("completed")) {
      humanPhase = "Phase 3 — Final Showcase & Viva";
      phaseDescription = "Submissions are complete. The final Technical Viva is ready when you are.";
      primaryCtaText = "Start Technical Viva";
      primaryCtaHref = `/student/interview/${activeProject.id}`;
    } else if (rawP.includes("phase_2") || rawP.includes("phase 2")) {
      humanPhase = "Phase 2 — Architecture & Code";
      phaseDescription = isLeader
        ? "Phase 1 reviewed. Submit your repository, presentation and progress notes."
        : "Phase 1 complete. Review shared feedback or check Phase 2 progress.";
      primaryCtaText = isLeader ? "Submit Phase 2" : "View Feedback";
      primaryCtaHref = isLeader ? "/student/submit/phase2" : "/student/feedback";
    } else {
      if (projectData?.latest_evaluation_status === "AWAITING_CLARIFICATION") {
        humanPhase = "Phase 1 — Clarification Needed";
        phaseDescription = "A few clarifying questions are waiting before evaluation can be finalized.";
        primaryCtaText = "Answer Questions";
        primaryCtaHref = "/student/submit/phase1";
      } else {
        humanPhase = "Phase 1 — Project Proposal";
        phaseDescription = isLeader
          ? "Submit your title, abstract, methodology and tech stack for review."
          : "Your leader will submit Phase 1. You can review the team and shared feedback in the meantime.";
        primaryCtaText = isLeader ? "Submit Phase 1" : "View Team";
        primaryCtaHref = isLeader ? "/student/submit/phase1" : "/student/my-team";
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-10 md:space-y-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {isTestUser ? "Testing Workspace" : "Project Home"}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {isTestUser
                ? "Validate the full evaluation pipeline in an isolated workspace."
                : "Track progress, understand what matters now, and take the next step."}
            </p>
            {!isTestUser && user?.name && (
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.name}</span>
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="h-8 self-start gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 leading-relaxed">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-7 shrink-0 border-destructive/20 bg-background text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        <StudentJourneyBanner
          currentPhase={currentPhaseRaw}
          isLeader={isLeader}
          latestStatus={projectData?.latest_evaluation_status ?? undefined}
          hasTeam={!!activeProject}
          projectId={activeProject?.id}
        />

        {/* Primary Next Step */}
        <section className="rounded-xl border border-border bg-card">
          <div className="px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Next step
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {humanPhase}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {phaseDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="group h-9 gap-1.5 bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Link href={primaryCtaHref} className="inline-flex items-center gap-1.5">
                    {primaryCtaText}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>

                {activeProject ? (
                  <Button variant="outline" asChild className="h-9 text-sm">
                    <Link href="/student/feedback">View Feedback</Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild className="h-9 text-sm">
                    <Link href="/student/team/join">Join with Team ID</Link>
                  </Button>
                )}

                {activeProject && isTestUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(activeProject.id)}
                    className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>

              {activeProject && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-xs">
                  <span className="text-muted-foreground">
                    Team <span className="font-mono font-medium text-foreground">{activeProject.team_id}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Role <span className="font-medium text-foreground">{isLeader ? "Leader" : "Member"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Phase <span className="font-medium text-foreground">{currentPhaseRaw.replace(/_/g, " ")}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {activeProject &&
          projectData?.user_role === "Leader / Product Manager" &&
          projectData?.latest_evaluation_status === "AWAITING_CLARIFICATION" && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Attention required
                </p>
                <h3 className="text-base font-semibold text-foreground">Clarification questions waiting</h3>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  The reviewer needs three short answers to clarify scope before finalizing Phase 1.
                </p>
              </div>
              <Button
                className="h-9 shrink-0 bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
                onClick={() => router.push("/student/submit/phase1")}
              >
                Answer Questions
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

        {/* Status Overview — calm, divider-based */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            <div className="px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Where you are</p>
              <p className="mt-3 text-base font-semibold tracking-tight text-foreground">
                {activeProject ? humanPhase.split(" — ")[0] : "Team Setup"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {activeProject
                  ? `${projectData?.member_count || 1} member · ${activeProject.team_id}`
                  : "No team yet — create or join to begin."}
              </p>
            </div>
            <div className="px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
                <li className="flex items-center gap-2 text-foreground">
                  <span className="h-1 w-1 rounded-full bg-foreground" /> Enrollment
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-1 w-1 rounded-full ${activeProject ? "bg-foreground" : "bg-border"}`} />
                  Team Setup {activeProject ? "" : "— pending"}
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-1 w-1 rounded-full ${activeProject?.phase_1_data ? "bg-foreground" : "bg-border"}`} />
                  Phase 1 Proposal {activeProject?.phase_1_data ? "" : "— pending"}
                </li>
              </ul>
            </div>
            <div className="px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Up next</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {!activeProject?.phase_2_data && <li>Phase 2 — Architecture</li>}
                {!activeProject?.final_data && <li>Phase 3 — Showcase</li>}
                <li>Technical Viva</li>
              </ul>
            </div>
            <div className="bg-muted/30 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What to do now</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {activeProject ? "Take the next step to move the project forward." : "Create or join a team to unlock the workflow."}
              </p>
              <Button asChild size="sm" className="mt-4 h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <Link href={primaryCtaHref}>{primaryCtaText}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Guidance — two quiet sections */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Team workspace</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">How leaders and members collaborate.</p>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Leader</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Creates the team, submits all phase deliverables, and shares the Team ID.
                </p>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Member</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Joins with Team ID, records contributions, and reviews shared feedback.
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-2 w-full h-9"
                onClick={() => router.push(activeProject ? "/student/my-team" : "/student/team")}
              >
                {activeProject ? "Open Team Workspace" : "Start Team Setup"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">How evaluation works</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Three phases, one Viva.</p>
            </div>
            <div className="px-6 py-6">
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phase 1 — Proposal</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Scope, originality and clarity. Clarification asked if needed.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phase 2 — Architecture</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Repository structure, presentation and milestones.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Final & Viva</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Consolidated review plus 5-minute technical Viva.</p>
                  </div>
                </li>
              </ol>
              <Button variant="outline" className="mt-6 w-full h-9" onClick={() => router.push("/student/feedback")}>
                View Feedback
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </section>
        </div>

        {isTestUser && (
          <section className="space-y-4 border-t border-border pt-8">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent test attempts</h2>
              <Badge variant="outline" className="border-border font-mono text-xs">
                {proposals.length}
              </Badge>
            </div>
            {proposals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">No test attempts yet. Create one from the team workspace.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {proposals.map((proposal) => (
                  <Card key={proposal.id} className="border border-border bg-card">
                    <CardContent className="space-y-3 p-5">
                      <p className="font-mono text-xs text-muted-foreground">{proposal.team_id} · Attempt #{proposal.attempt_number}</p>
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {(proposal.phase_1_data as { title?: string })?.title || "Untitled proposal"}
                      </p>
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {proposal.evaluation_summary || "Evaluation in progress."}
                      </p>
                      <Badge variant="outline" className="border-border text-xs">
                        {proposal.evaluation_status || "PENDING"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
