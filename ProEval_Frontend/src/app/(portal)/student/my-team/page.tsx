"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { projectService, type MyProjectResponse } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import ProjectPhaseCards from "@/components/submission/ProjectPhaseCards";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  const handleCopyTeamId = (teamId: string) => {
    navigator.clipboard.writeText(teamId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading team</p>
      </div>
    );
  }

  if (!projectData?.project) return null;

  const { project, member_count, members, latest_evaluation_status } = projectData;
  const isLeader = project.leader_id === user?.id;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-10 md:space-y-12">
        <StudentJourneyBanner
          currentPhase={project.current_phase}
          isLeader={isLeader}
          latestStatus={latest_evaluation_status ?? undefined}
          hasTeam={true}
          projectId={project.id}
        />

        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-4 border-b border-border px-6 py-6 md:flex-row md:items-start md:justify-between md:px-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Team workspace · {isLeader ? "Leader" : "Member"}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {project.phase_1_data?.title || "Project Team Workspace"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {member_count} member{member_count !== 1 ? "s" : ""} · Phase {project.current_phase.replace(/_/g, " ")}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team ID</p>
                <p className="font-mono text-sm font-medium tracking-tight text-foreground">{project.team_id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyTeamId(project.team_id)}
                className="ml-2 h-7 gap-1.5 text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <CardContent className="space-y-8 p-6 md:p-8">
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Roster</h2>
              <ul className="grid gap-3 md:grid-cols-3">
                {members.map((member) => {
                  const initials = member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <li
                      key={member.email}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {member.name} {member.email === user?.email ? "· You" : ""}
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
              <Button variant="outline" asChild className="h-9">
                <Link href="/student/feedback">View Feedback</Link>
              </Button>
            </div>
          </CardContent>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Phase Deliverables</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Complete each phase to move toward final evaluation.</p>
          </div>

          <ProjectPhaseCards
            projectId={project.id}
            currentPhase={project.current_phase}
            phase1Data={project.phase_1_data}
            phase2Data={project.phase_2_data}
            finalData={project.final_data}
            isLeader={isLeader}
          />

          {!isLeader && (
            <Card className="border border-dashed border-border bg-muted/20">
              <CardContent className="space-y-3 px-6 py-8 text-center">
                <h3 className="text-sm font-semibold text-foreground">Member access</h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  Only the leader submits deliverables. You share the same feedback trail and can prepare for the Viva.
                </p>
                <Button variant="outline" asChild size="sm" className="mt-1">
                  <Link href="/student/feedback">Open Feedback</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
