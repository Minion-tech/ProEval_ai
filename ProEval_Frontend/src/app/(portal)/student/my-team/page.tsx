"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, ExternalLink, Loader2, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { projectService, type MyProjectResponse } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import Phase1Form from "@/components/forms/Phase1Form";
import ProjectPhaseCards from "@/components/submission/ProjectPhaseCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyTeamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [projectData, setProjectData] = useState<MyProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!projectData?.project) return null;

  const { project, user_role, member_count, members } = projectData;
  const isLeader = project.leader_id === user?.id;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="border-2 shadow-sm">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-2xl font-extrabold tracking-tight">
                {project.phase_1_data?.title || "My Team"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-mono">
                  {project.team_id}
                </Badge>
                <Badge>{project.current_phase.replace("_", " ")}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{member_count} member{member_count !== 1 ? "s" : ""}</span>
              <span>•</span>
              <span>
                Your role: <strong>{user_role}</strong>
              </span>
            </div>

            <div className="grid gap-2">
              {members.map((member) => (
                <div key={member.email} className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  {member.is_leader && <Crown className="h-4 w-4 shrink-0 text-yellow-500" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => router.push("/student/feedback")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Shared Feedback
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ProjectPhaseCards
            projectId={project.id}
            currentPhase={project.current_phase}
            phase1Data={project.phase_1_data}
            phase2Data={project.phase_2_data}
            finalData={project.final_data}
            isLeader={isLeader}
          />

          {isLeader ? (
            <div className="space-y-4 border-t pt-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-extrabold tracking-tight">Refine Project Proposal</h2>
                <p className="text-muted-foreground">
                  As the team leader, you can edit and resubmit Phase 1 after reviewing AI feedback.
                </p>
              </div>
              <Phase1Form />
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="font-medium">Only the team leader can edit and resubmit project phases.</p>
                <p className="mt-1 text-sm">Members still see the same feedback trail and team progress.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
