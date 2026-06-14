"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { projectService, type MyProjectResponse } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import { AlertTriangle, ArrowRight, HelpCircle, Loader2, Mic, RefreshCw, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface Proposal {
  id: string;
  team_id: string;
  attempt_number: number;
  phase_1_data: any;
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
        setProposals(proposalsRes.data?.proposals || []);
      } else {
        setProposals([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeProject = projectData?.project ?? null;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-12">
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              {isTestUser ? "Pipeline Dashboard" : "Student Dashboard"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isTestUser
                ? "Track the active test project, reset the workspace, and jump back into the end-to-end evaluation journey."
                : "See your active team, keep track of feedback, and move through the project phases with your group."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        <Card className="border-2 border-primary/10 shadow-sm">
          <CardHeader className="bg-primary/5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {activeProject?.phase_1_data?.title || (isTestUser ? "No active test project" : "No active project yet")}
                </CardTitle>
                <CardDescription>
                  {activeProject
                    ? `Team ID: ${activeProject.team_id} • Phase: ${activeProject.current_phase}`
                    : isTestUser
                      ? "Use the team workspace to create a scenario-backed project and run the full pipeline."
                      : "Create a team or join an existing project to start your evaluation journey."}
                </CardDescription>
              </div>
              {activeProject && isTestUser ? (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(activeProject.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete / Reset
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!activeProject && projectData?.previous_projects?.some((p: any) => p.deleted_by_admin) && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Your previous project was deleted by the Project Coordinator. You can start a new team setup below.</p>
              </div>
            )}
            
            {activeProject ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    Team: {activeProject.team_id}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    Current phase: {activeProject.current_phase}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    Members: {projectData?.member_count ?? 0}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => router.push(isTestUser ? "/student/team" : "/student/my-team")}>
                    {isTestUser ? "Open Team Workspace" : "Open My Team"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/student/feedback">View Feedback</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => router.push("/student/team")}>
                  {isTestUser ? "Open Team Workspace" : "Start Team Setup"}
                </Button>
                {!isTestUser && (
                  <Button variant="outline" asChild>
                    <Link href="/student/team/join">Join Existing Team</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Alerts Section */}
        {activeProject && (
          <div className="space-y-4">
            {/* Leader: Clarification Alert */}
            {projectData?.user_role === "Leader / Product Manager" && 
             projectData?.latest_evaluation_status === "AWAITING_CLARIFICATION" && (
              <div className="flex items-center gap-4 rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-900">Clarification Needed</h3>
                  <p className="text-sm text-orange-700">The AI Mentor has questions about your proposal. Answer them to continue.</p>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => router.push("/student/submit/phase1")}>
                  Answer Questions
                </Button>
              </div>
            )}

            {/* Teammate: Welcome & Feedback Alert */}
            {projectData?.user_role !== "Leader / Product Manager" && 
             projectData?.members?.some(m => m.email === user?.email && !m.has_viewed_feedback) && (
              <div className="flex items-center gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900">Welcome to the Team!</h3>
                  <p className="text-sm text-blue-700">The AI Ideator has already analyzed the project. Review the mentorship to align with the team.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/student/feedback")}>
                  View AI Feedback
                </Button>
              </div>
            )}
          </div>
        )}

        {activeProject && 
         (activeProject.current_phase === "FINAL" || activeProject.current_phase === "ProjectPhase.FINAL") && (
          <Card className="border-2 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white">
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg text-indigo-900 dark:text-indigo-300">Final Step: AI Technical Viva</CardTitle>
                  <CardDescription>
                    {projectData?.latest_evaluation_status === "COMPLETED" 
                      ? "All evaluation phases are complete. You are now invited to your final interview."
                      : "Your final project audit is in progress. You can start your interview now or wait for the audit results."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80 max-w-xl">
                  This 5-minute conversational session with our AI Evaluator will assess your technical depth, 
                  contribution to the team, and communication skills.
                </p>
                <div className="flex items-center gap-3">
                  {projectData?.latest_evaluation_status === "IN_PROGRESS" && (
                     <Badge variant="outline" className="animate-pulse bg-indigo-100 text-indigo-700 border-indigo-200">
                        AI Audit Running...
                     </Badge>
                  )}
                  <Button 
                    onClick={() => {
                      if (activeProject?.id) {
                        router.push(`/student/interview/${activeProject.id}`);
                      } else {
                        toast.error("Project ID not found. Please refresh.");
                      }
                    }} 
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Start AI Interview
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isTestUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Recent Test Attempts</h2>
              <Badge variant="outline">{proposals.length}</Badge>
            </div>
            {proposals.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No scenario-backed attempts yet. Create one from the team workspace.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {proposals.map((proposal) => (
                  <Card key={proposal.id} className="border">
                    <CardHeader className="pb-3">
                      <Badge variant="secondary" className="w-fit">Attempt #{proposal.attempt_number}</Badge>
                      <CardTitle className="line-clamp-1 text-lg">{proposal.phase_1_data?.title}</CardTitle>
                      <CardDescription>{proposal.team_id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge variant="outline">{proposal.evaluation_status || "PENDING"}</Badge>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {proposal.evaluation_summary || "Evaluation is still in progress."}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Team Space</CardTitle>
                <CardDescription>
                  Leaders submit project phases. Members can join with a team ID and follow the shared feedback trail.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" onClick={() => router.push(activeProject ? "/student/my-team" : "/student/team")}>
                  {activeProject ? "Go to My Team" : "Create or Join a Team"}
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push("/student/feedback")}>
                  Open Shared Feedback
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How the flow works</CardTitle>
                <CardDescription>Keep the normal student portal focused on the academic workflow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Leader creates the team and submits Phase 1.</p>
                <p>2. Team members join with the shared team ID.</p>
                <p>3. Everyone can see the ideator and architect feedback once it is ready.</p>
                <p>4. Only the leader submits Phase 2 and Final deliverables.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
