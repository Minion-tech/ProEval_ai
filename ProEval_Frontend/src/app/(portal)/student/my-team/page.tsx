"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, FileText, Users, Award, Mic, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { projectService, type MyProjectResponse } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import ProjectPhaseCards from "@/components/submission/ProjectPhaseCards";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function MyTeamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [projectData, setProjectData] = useState<MyProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (isTestUser) {
        router.replace("/student/team");
        return;
      }

      try {
        const res = await projectService.getMyProject({ testMode: false });
        if (!res.data?.project) {
          router.replace("/student/team");
          return;
        }
        setProjectData(res.data);
      } catch {
        router.replace("/student/team");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isTestUser, router]);

  // Real-time sync: poll for leader updates so Team Feed stays team-specific and live without refresh
  useEffect(() => {
    if (isTestUser || loading || !projectData?.project) return;
    const interval = setInterval(async () => {
      try {
        const res = await projectService.getMyProject({ testMode: false });
        if (res.data?.project) {
          setProjectData((prev) => {
            const next = res.data!;
            // shallow compare key fields to avoid unnecessary re-renders
            if (
              prev?.project?.phase_1_data === next.project?.phase_1_data &&
              prev?.project?.phase_2_data === next.project?.phase_2_data &&
              prev?.project?.final_data === next.project?.final_data &&
              prev?.member_count === next.member_count &&
              prev?.latest_evaluation_status === next.latest_evaluation_status
            ) {
              return prev;
            }
            return next;
          });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [isTestUser, loading, projectData]);

  const handleCopyTeamId = (teamId: string) => {
    navigator.clipboard.writeText(teamId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <p className="text-sm text-muted-foreground">Loading team</p>
      </div>
    );
  }

  if (!projectData?.project) return null;

  const { project, member_count, members, latest_evaluation_status } = projectData;
  const isLeader = project.leader_id === user?.id;
  const leaderMember = members.find((m) => m.is_leader);
  const leaderName = leaderMember?.name || "Team Leader";

  // Build feed items from leader submissions
  const feedItems: Array<{ id: string; phase: string; title: string; description: string; detail?: string; dateLabel: string }> = [];
  if (project.phase_1_data) {
    feedItems.push({
      id: "phase1",
      phase: "Phase 01 — Proposal",
      title: project.phase_1_data.title || "Project Proposal Published",
      description: project.phase_1_data.abstract?.slice(0, 160) || `Domain: ${project.phase_1_data.domain || "—"}`,
      detail: project.phase_1_data.domain ? `Domain · ${project.phase_1_data.domain}` : undefined,
      dateLabel: "Published by " + leaderName,
    });
  }
  if (project.phase_2_data) {
    feedItems.push({
      id: "phase2",
      phase: "Phase 02 — Architecture",
      title: "Architecture & Progress Published",
      description: project.phase_2_data.progress_notes?.slice(0, 160) || project.phase_2_data.github_url || "Repository and milestones shared.",
      detail: project.phase_2_data.github_url ? project.phase_2_data.github_url : undefined,
      dateLabel: "Published by " + leaderName,
    });
  }
  if (project.final_data) {
    feedItems.push({
      id: "final",
      phase: "Phase 03 — Showcase",
      title: "Final Showcase Published",
      description: project.final_data.final_summary?.slice(0, 160) || "Final deliverables are ready for review.",
      detail: project.final_data.github_url ? project.final_data.github_url : undefined,
      dateLabel: "Published by " + leaderName,
    });
  }

  // Reports derived from phase data
  const reportCards = [
    {
      key: "phase1",
      label: "Proposal",
      phase: "Phase 1",
      exists: !!project.phase_1_data,
      title: project.phase_1_data?.title || "No proposal yet",
      summary: project.phase_1_data?.abstract?.slice(0, 120) || "Waiting for leader to publish the proposal.",
    },
    {
      key: "phase2",
      label: "Architecture",
      phase: "Phase 2",
      exists: !!project.phase_2_data,
      title: project.phase_2_data ? "Architecture submitted" : "No architecture yet",
      summary: project.phase_2_data?.progress_notes?.slice(0, 120) || "Repository, slides and milestones will appear here.",
    },
    {
      key: "final",
      label: "Showcase",
      phase: "Final",
      exists: !!project.final_data,
      title: project.final_data ? "Final showcase submitted" : "No showcase yet",
      summary: project.final_data?.final_summary?.slice(0, 120) || "Report, demo and contributions will appear here.",
    },
  ];

  if (isLeader) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <div className="space-y-8 md:space-y-10">
          <StudentJourneyBanner
            currentPhase={project.current_phase}
            isLeader={isLeader}
            latestStatus={latest_evaluation_status ?? undefined}
            hasTeam={true}
            projectId={project.id}
          />

          <section className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-5 border-b border-border bg-card px-6 py-6 md:flex-row md:items-start md:justify-between md:px-8 md:py-7">
              <div className="space-y-2.5">
                <h1 className="text-[22px] font-bold tracking-tight text-foreground md:text-[26px]">
                  {project.phase_1_data?.title || "Project Team Workspace"}
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  {member_count} member{member_count !== 1 ? "s" : ""} · <span className="font-medium text-foreground/70">{project.current_phase.replace(/_/g, " ")}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-border bg-muted/20 px-4 py-2.5">
                <div className="space-y-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Team ID</p>
                  <p className="font-mono text-[13px] font-medium tracking-tight text-foreground">{project.team_id}</p>
                </div>
                <div className="ml-2 h-8 w-px bg-border" aria-hidden="true" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyTeamId(project.team_id)}
                  className="h-7 rounded-full gap-1.5 px-3 text-xs font-medium hover:bg-background"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-6 p-6 md:p-8">
              <div className="space-y-3.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Roster</h2>
                <ul className="grid gap-3 md:grid-cols-3">
                  {members.map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const isYou = member.email === user?.email;
                    return (
                      <li
                        key={member.email}
                        className={[
                          "group flex items-center gap-3 rounded-xl border px-3.5 py-3.5 transition-colors",
                          isYou ? "border-foreground/15 bg-foreground/[0.03]" : "border-border bg-card hover:bg-muted/20 hover:border-border",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            isYou ? "bg-foreground text-background" : "bg-muted text-foreground",
                          ].join(" ")}
                        >
                          {initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium leading-tight text-foreground">
                            {member.name} {isYou ? <span className="font-normal text-muted-foreground">· You</span> : ""}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {member.role}
                            {member.is_leader ? " · Leader" : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                <Button variant="outline" asChild className="h-8 rounded-full px-4 text-xs font-medium">
                  <Link href="/student/feedback">View Feedback</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Phase Deliverables</h2>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">Complete each phase to move toward final evaluation.</p>
            </div>

            <ProjectPhaseCards
              projectId={project.id}
              currentPhase={project.current_phase}
              phase1Data={project.phase_1_data}
              phase2Data={project.phase_2_data}
              finalData={project.final_data}
              isLeader={isLeader}
            />
          </section>
        </div>
      </main>
    );
  }

  // ===== Member view: Team Feed experience =====
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8 md:space-y-10">
        <StudentJourneyBanner
          currentPhase={project.current_phase}
          isLeader={false}
          latestStatus={latest_evaluation_status ?? undefined}
          hasTeam={true}
          projectId={project.id}
        />

        <section className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-5 border-b border-border bg-card px-6 py-6 md:flex-row md:items-start md:justify-between md:px-8 md:py-7">
            <div className="space-y-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-foreground md:text-[26px]">
                {project.phase_1_data?.title || "Team Feed"}
              </h1>
              <p className="text-[13px] text-muted-foreground">
                {member_count} member{member_count !== 1 ? "s" : ""} · {project.current_phase.replace(/_/g, " ")} · Team {project.team_id}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-border bg-muted/20 px-4 py-2.5">
              <div className="space-y-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Team ID</p>
                <p className="font-mono text-[13px] font-medium tracking-tight text-foreground">{project.team_id}</p>
              </div>
              <div className="ml-2 h-8 w-px bg-border" aria-hidden="true" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyTeamId(project.team_id)}
                className="h-7 rounded-full gap-1.5 px-3 text-xs font-medium hover:bg-background"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="px-6 py-4 md:px-8">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Every update published by <span className="font-medium text-foreground">{leaderName}</span> appears here automatically. No extra steps required.
            </p>
          </div>
        </section>

        <Tabs defaultValue="feed" className="w-full">
          <div className="border-b border-border">
            <TabsList className="h-auto justify-start gap-6 bg-transparent p-0">
              <TabsTrigger
                value="feed"
                className="rounded-none border-b-2 border-transparent bg-transparent px-1 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Team Feed
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="rounded-none border-b-2 border-transparent bg-transparent px-1 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Team Members
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="rounded-none border-b-2 border-transparent bg-transparent px-1 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Reports
              </TabsTrigger>
              <TabsTrigger
                value="viva"
                className="rounded-none border-b-2 border-transparent bg-transparent px-1 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Viva
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Team Feed */}
          <TabsContent value="feed" className="mt-6 outline-none">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Team Feed</h2>
                <p className="text-[13px] text-muted-foreground">Live updates published by your team leader. Automatically synced.</p>
              </div>

              {feedItems.length === 0 ? (
                <Card className="overflow-hidden rounded-[14px] border border-dashed border-border/70 bg-muted/10">
                  <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-[13.5px] font-medium text-foreground">No updates yet</p>
                    <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                      Your leader hasn&apos;t published anything yet. Updates will appear here the moment they submit.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {feedItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full border-border bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                {item.phase}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{item.dateLabel}</span>
                            </div>
                            <h3 className="text-[14px] font-semibold leading-tight text-foreground">{item.title}</h3>
                            <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">{item.description}</p>
                            {item.detail && (
                              <p className="truncate font-mono text-xs text-muted-foreground/80">{item.detail}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="overflow-hidden rounded-[14px] border border-border/60 bg-muted/20">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-[13px] text-muted-foreground">
                        Joined team <span className="font-mono font-medium text-foreground">{project.team_id}</span> · You are a member
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Team Members */}
          <TabsContent value="members" className="mt-6 outline-none">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Team Members</h2>
                <p className="text-[13px] text-muted-foreground">{member_count} member{member_count !== 1 ? "s" : ""} in this team.</p>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {members.map((member) => {
                  const initials = member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const isYou = member.email === user?.email;
                  return (
                    <li
                      key={member.email}
                      className={[
                        "flex items-center gap-3 rounded-xl border px-4 py-4 transition-colors",
                        isYou ? "border-foreground/15 bg-foreground/[0.03]" : "border-border bg-card",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          isYou ? "bg-foreground text-background" : member.is_leader ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        ].join(" ")}
                      >
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium leading-tight text-foreground">
                          {member.name} {isYou ? <span className="font-normal text-muted-foreground">· You</span> : ""}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.role}
                          {member.is_leader ? " · Leader" : ""}
                        </span>
                        {member.functions && (
                          <span className="mt-1 block truncate text-xs text-muted-foreground/80">{member.functions}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="mt-6 outline-none">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Reports</h2>
                <p className="text-[13px] text-muted-foreground">All submissions and feedback from your leader, shared with the whole team.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {reportCards.map((rc) => (
                  <Card key={rc.key} className={`overflow-hidden rounded-[14px] border bg-card shadow-sm ${rc.exists ? "border-border" : "border-dashed border-border/60 bg-muted/10"}`}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{rc.phase}</span>
                        {rc.exists ? (
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="inline-flex h-2 w-2 rounded-full bg-border" />
                        )}
                      </div>
                      <h3 className="text-[13.5px] font-semibold leading-tight text-foreground line-clamp-2">{rc.title}</h3>
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{rc.summary}</p>
                      {rc.exists ? (
                        <Button asChild variant="outline" size="sm" className="mt-1 h-8 w-full rounded-full text-xs">
                          <Link href="/student/feedback">View Report</Link>
                        </Button>
                      ) : (
                        <p className="pt-1 text-xs text-muted-foreground">Awaiting leader submission</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="overflow-hidden rounded-[14px] border border-border bg-card">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium text-foreground">Detailed feedback & timeline</p>
                    <p className="text-xs text-muted-foreground">Rubrics, guidance and roadmap for each phase.</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-4 text-xs">
                    <Link href="/student/feedback" className="inline-flex items-center gap-1.5">
                      Open Reports <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Viva */}
          <TabsContent value="viva" className="mt-6 outline-none">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Viva Section</h2>
                <p className="text-[13px] text-muted-foreground">Your personalized technical Viva — questions are tailored to your role.</p>
              </div>

              <Card className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mic className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[14px] font-semibold text-foreground">Technical Viva — 5 minute AI interview</h3>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      Every member takes an individual Viva. Questions are based on your declared role <span className="font-medium text-foreground">({members.find((m) => m.email === user?.email)?.role || "your role"})</span> and the shared project.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button asChild className="h-9 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
                      <Link href={`/student/interview/${project.id}`}>Start Viva</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-4 text-xs">
                      <Link href="/student/feedback">View Viva Feedback</Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Enable camera & microphone when prompted. ~5 minutes.</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[14px] border border-border bg-muted/20">
                <CardContent className="flex gap-3 p-5">
                  <Award className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium text-foreground">How grading works</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Viva is evaluated individually, while project reports are shared. Leader submissions do not affect your Viva questions — they are personalized from your join details.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
