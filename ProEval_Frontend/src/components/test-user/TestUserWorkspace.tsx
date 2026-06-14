"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TEST_SCENARIOS, TINY_IMAGE_DATA_URL, TINY_PDF_DATA_URL, getScenarioById } from "@/constants/scenarios";
import { projectService, type FinalData, type MyProjectResponse, type Phase1Data, type Phase2Data } from "@/lib/project-service";
import { Loader2, RefreshCw, Sparkles, Trash2, Users, ArrowRight, Wand2, CheckCircle2 } from "lucide-react";

interface EvaluationSnapshot {
  PHASE_1: any | null;
  PHASE_2: any | null;
  FINAL: any | null;
}

const EMPTY_PHASE1: Phase1Data = {
  title: "",
  abstract: "",
  domain: "",
  objectives: [],
  methodology: "",
  use_case_diagram: "",
  tech_stack: [],
};

const EMPTY_PHASE2: Phase2Data = {
  github_url: "",
  presentation_url: "",
  progress_notes: "",
  completed_milestones: [],
  pending_risks: [],
};

const EMPTY_FINAL: FinalData = {
  final_report_url: "",
  presentation_url: "",
  demo_video_url: "",
  github_url: "",
  final_summary: "",
  individual_contributions: "",
};

function getStatusTone(status?: string | null) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-50 text-green-700 border-green-200";
    case "AWAITING_CLARIFICATION":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";
    case "IN_PROGRESS":
    case "PENDING":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default function TestUserWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<MyProjectResponse | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationSnapshot>({
    PHASE_1: null,
    PHASE_2: null,
    FINAL: null,
  });
  const [selectedScenarioId, setSelectedScenarioId] = useState(TEST_SCENARIOS[0]?.id ?? "");
  const [phase1, setPhase1] = useState<Phase1Data>(EMPTY_PHASE1);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [phase2, setPhase2] = useState<Phase2Data>(EMPTY_PHASE2);
  const [finalData, setFinalData] = useState<FinalData>(EMPTY_FINAL);

  const scenario = useMemo(() => getScenarioById(selectedScenarioId) ?? TEST_SCENARIOS[0], [selectedScenarioId]);
  const project = projectData?.project ?? null;
  const teamId = project?.team_id ?? "";
  const phase1Status = evaluations.PHASE_1?.status ?? (project?.phase_1_data ? "IN_PROGRESS" : "NOT_STARTED");
  const phase2Status = evaluations.PHASE_2?.status ?? (project?.phase_2_data ? "IN_PROGRESS" : "NOT_STARTED");
  const finalStatus = evaluations.FINAL?.status ?? (project?.final_data ? "IN_PROGRESS" : "NOT_STARTED");

  const syncFromScenario = useCallback((scenarioId: string) => {
    const nextScenario = getScenarioById(scenarioId) ?? TEST_SCENARIOS[0];
    setPhase1({
      title: nextScenario.phase1.title,
      abstract: `${nextScenario.phase1.abstract}\n\nObjectives:\n${nextScenario.phase1.objectives}`,
      domain: nextScenario.phase1.domain,
      objectives: nextScenario.phase1.objectives
        .split("\n")
        .map((item) => item.replace(/^[^:]+:\s*/, "").trim())
        .filter(Boolean),
      methodology: nextScenario.phase1.methodology,
      use_case_diagram: TINY_IMAGE_DATA_URL,
      tech_stack: nextScenario.phase1.stack.split("\n").map((item) => item.trim()).filter(Boolean),
    });
    setClarifications([...nextScenario.clarifications]);
    setPhase2({
      github_url: nextScenario.phase2.github,
      presentation_url: nextScenario.phase2.presentationUrl,
      progress_notes: nextScenario.phase2.notes,
      completed_milestones: [...nextScenario.phase2.milestones],
      pending_risks: [...nextScenario.phase2.risks],
    });
    setFinalData({
      final_report_url: TINY_PDF_DATA_URL,
      presentation_url: TINY_PDF_DATA_URL,
      demo_video_url: nextScenario.final.demo,
      github_url: nextScenario.final.github,
      final_summary: nextScenario.final.summary,
      individual_contributions: nextScenario.final.contributions,
    });
  }, []);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectRes = await projectService.getMyProject({ testMode: true });
      const nextProjectData = projectRes.data ?? null;
      setProjectData(nextProjectData);

      if (nextProjectData?.project) {
        const currentProject = nextProjectData.project;
        const [phase1Eval, phase2Eval, finalEval] = await Promise.all([
          projectService.getEvaluation(currentProject.id, "PHASE_1", { testMode: true }).catch(() => ({ data: null })),
          projectService.getEvaluation(currentProject.id, "PHASE_2", { testMode: true }).catch(() => ({ data: null })),
          projectService.getEvaluation(currentProject.id, "FINAL", { testMode: true }).catch(() => ({ data: null })),
        ]);

        setEvaluations({
          PHASE_1: phase1Eval.data,
          PHASE_2: phase2Eval.data,
          FINAL: finalEval.data,
        });

        if (currentProject.phase_1_data) {
          const p1 = currentProject.phase_1_data;
          setPhase1({
            title: p1.title ?? "",
            abstract: p1.abstract ?? "",
            domain: p1.domain ?? "",
            objectives: Array.isArray(p1.objectives) ? p1.objectives : [],
            methodology: p1.methodology ?? "",
            use_case_diagram: p1.use_case_diagram ?? TINY_IMAGE_DATA_URL,
            tech_stack: Array.isArray(p1.tech_stack) ? p1.tech_stack : [],
          });
        }
        if (currentProject.phase_2_data) {
          setPhase2({
            github_url: currentProject.phase_2_data.github_url ?? "",
            presentation_url: currentProject.phase_2_data.presentation_url ?? "",
            progress_notes: currentProject.phase_2_data.progress_notes ?? "",
            completed_milestones: currentProject.phase_2_data.completed_milestones ?? [],
            pending_risks: currentProject.phase_2_data.pending_risks ?? [],
          });
        }
        if (currentProject.final_data) {
          setFinalData({
            final_report_url: currentProject.final_data.final_report_url ?? TINY_PDF_DATA_URL,
            presentation_url: currentProject.final_data.presentation_url ?? TINY_PDF_DATA_URL,
            demo_video_url: currentProject.final_data.demo_video_url ?? "",
            github_url: currentProject.final_data.github_url ?? "",
            final_summary: currentProject.final_data.final_summary ?? "",
            individual_contributions: currentProject.final_data.individual_contributions ?? "",
          });
        }
      } else {
        setEvaluations({ PHASE_1: null, PHASE_2: null, FINAL: null });
        syncFromScenario(selectedScenarioId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test workspace.");
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, syncFromScenario]);

  useEffect(() => {
    syncFromScenario(selectedScenarioId);
  }, [selectedScenarioId, syncFromScenario]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setBusyAction(key);
      setError(null);
      setSuccess(null);
      await action();
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateOrResubmitPhase1 = async () => {
    const payload = {
      phase_1_data: phase1,
      academic_year: "2025-26",
      semester: 8,
    };
    await runAction("phase1", async () => {
      if (project?.id) {
        await projectService.resubmitPhase1(project.id, payload, { testMode: true });
        setSuccess("Phase 1 was resubmitted with the selected scenario.");
      } else {
        await projectService.submitPhase1(payload, { testMode: true });
        setSuccess("Phase 1 was created and sent into the evaluation pipeline.");
      }
    });
  };

  const handleSubmitClarifications = async () => {
    if (!project?.id) return;
    await runAction("clarifications", async () => {
      await projectService.submitClarifications(project.id, clarifications, { testMode: true });
      setSuccess("Clarification answers were submitted.");
    });
  };

  const handleFillMembers = async () => {
    if (!teamId) return;
    await runAction("members", async () => {
      for (const member of scenario.members.slice(1)) {
        await projectService.joinTeam(
          {
            team_id: teamId,
            role: member.role,
            functions: member.func,
            modules: member.mods,
            tech_stack: member.tech,
            work_description: `${member.name} will focus on ${member.func}`,
          },
          { testMode: true }
        );
      }
      setSuccess("Mock teammates were added and the architect review should now be triggered.");
    });
  };

  const handleSubmitPhase2 = async () => {
    if (!project?.id) return;
    await runAction("phase2", async () => {
      await projectService.submitPhase2(project.id, phase2, { testMode: true });
      setSuccess("Phase 2 was submitted from the team workspace.");
    });
  };

  const handleSubmitFinal = async () => {
    if (!project?.id) return;
    await runAction("final", async () => {
      await projectService.submitFinal(project.id, finalData, { testMode: true });
      setSuccess("Final evaluation payload was submitted.");
    });
  };

  const handleReset = async () => {
    if (!project?.id) return;
    await runAction("reset", async () => {
      await projectService.deleteProject(project.id, { testMode: true });
      setSuccess("The active test project was reset.");
    });
  };

  const clarificationNeeded = phase1Status === "AWAITING_CLARIFICATION";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pipeline Workspace</h1>
          <p className="text-muted-foreground">
            Run the full test-user journey from one page with restrained autofill helpers and live evaluation status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select scenario" />
            </SelectTrigger>
            <SelectContent>
              {TEST_SCENARIOS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => syncFromScenario(selectedScenarioId)}>
            <Wand2 className="mr-2 h-4 w-4 text-primary" />
            Fill All
          </Button>
          <Button variant="outline" size="sm" onClick={loadState}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <Card className="border-2 border-primary/10 shadow-sm">
        <CardHeader className="bg-primary/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl">{project?.phase_1_data?.title || "No active test project"}</CardTitle>
              <CardDescription>
                {project ? `Team ID: ${project.team_id} • Current phase: ${project.current_phase}` : "Create or refill a project using one of the sample scenarios."}
              </CardDescription>
            </div>
            {project && (
              <Button variant="destructive" size="sm" onClick={handleReset} disabled={busyAction === "reset"}>
                {busyAction === "reset" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete / Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className={getStatusTone(phase1Status)}>Phase 1: {phase1Status}</Badge>
            <Badge variant="outline" className={getStatusTone(phase2Status)}>Phase 2: {phase2Status}</Badge>
            <Badge variant="outline" className={getStatusTone(finalStatus)}>Final: {finalStatus}</Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              Members: {projectData?.member_count ?? 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Phase 1 Proposal
            </CardTitle>
            <CardDescription>Team setup and ideator trigger stay together here for the test account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input value={phase1.title} onChange={(e) => setPhase1((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={phase1.domain} onChange={(e) => setPhase1((prev) => ({ ...prev, domain: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Abstract</Label>
              <Textarea rows={6} value={phase1.abstract} onChange={(e) => setPhase1((prev) => ({ ...prev, abstract: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Methodology</Label>
              <Textarea rows={6} value={phase1.methodology} onChange={(e) => setPhase1((prev) => ({ ...prev, methodology: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tech Stack</Label>
              <Textarea
                rows={5}
                value={phase1.tech_stack.join("\n")}
                onChange={(e) => setPhase1((prev) => ({ ...prev, tech_stack: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => syncFromScenario(selectedScenarioId)}>
                Fill Phase 1
              </Button>
              <Button onClick={handleCreateOrResubmitPhase1} disabled={busyAction === "phase1"} className="flex-1">
                {busyAction === "phase1" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {project ? "Resubmit Phase 1" : "Create Team & Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Clarifications & Members</CardTitle>
            <CardDescription>Answer ideator follow-ups, then autofill teammates to trigger the architect review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Clarification Answers</Label>
                <Button variant="outline" size="sm" onClick={() => setClarifications([...scenario.clarifications])}>
                  Fill Clarifications
                </Button>
              </div>
              {clarifications.map((answer, index) => (
                <Textarea
                  key={index}
                  rows={3}
                  value={answer}
                  onChange={(e) => {
                    const next = [...clarifications];
                    next[index] = e.target.value;
                    setClarifications(next);
                  }}
                />
              ))}
              <Button
                onClick={handleSubmitClarifications}
                disabled={!project || !clarificationNeeded || busyAction === "clarifications"}
                className="w-full"
              >
                {busyAction === "clarifications" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Submit Clarifications
              </Button>
            </div>

            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Mock Team Members</Label>
                <Button variant="outline" size="sm" onClick={handleFillMembers} disabled={!teamId || busyAction === "members"}>
                  {busyAction === "members" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  Fill Members
                </Button>
              </div>
              <div className="space-y-2">
                {scenario.members.map((member) => (
                  <div key={member.name} className="rounded-lg border bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="w-full" onClick={() => router.push("/student/feedback")} disabled={!project}>
                View Ideator / Architect Feedback
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Phase 2 Build Review</CardTitle>
              <CardDescription>Only one Phase 2 panel exists in the test flow, and it lives here on the team page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={phase2.github_url} onChange={(e) => setPhase2((prev) => ({ ...prev, github_url: e.target.value }))} placeholder="GitHub URL" />
              <Input value={phase2.presentation_url} onChange={(e) => setPhase2((prev) => ({ ...prev, presentation_url: e.target.value }))} placeholder="Presentation URL" />
              <Textarea rows={5} value={phase2.progress_notes} onChange={(e) => setPhase2((prev) => ({ ...prev, progress_notes: e.target.value }))} placeholder="Progress notes" />
              <Textarea
                rows={4}
                value={phase2.completed_milestones.join("\n")}
                onChange={(e) => setPhase2((prev) => ({ ...prev, completed_milestones: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) }))}
                placeholder="Completed milestones"
              />
              <Textarea
                rows={3}
                value={phase2.pending_risks.join("\n")}
                onChange={(e) => setPhase2((prev) => ({ ...prev, pending_risks: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) }))}
                placeholder="Pending risks"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPhase2({
                  github_url: scenario.phase2.github,
                  presentation_url: scenario.phase2.presentationUrl,
                  progress_notes: scenario.phase2.notes,
                  completed_milestones: [...scenario.phase2.milestones],
                  pending_risks: [...scenario.phase2.risks],
                })}>
                  Fill Phase 2
                </Button>
                <Button onClick={handleSubmitPhase2} disabled={!project || busyAction === "phase2"} className="flex-1">
                  {busyAction === "phase2" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Phase 2
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Final Evaluation</CardTitle>
              <CardDescription>Complete the final payload here and then review the later-phase feedback in the shared feedback page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={finalData.github_url} onChange={(e) => setFinalData((prev) => ({ ...prev, github_url: e.target.value }))} placeholder="Final GitHub URL" />
              <Input value={finalData.demo_video_url || ""} onChange={(e) => setFinalData((prev) => ({ ...prev, demo_video_url: e.target.value }))} placeholder="Demo video URL" />
              <Textarea rows={5} value={finalData.final_summary} onChange={(e) => setFinalData((prev) => ({ ...prev, final_summary: e.target.value }))} placeholder="Final summary" />
              <Textarea rows={5} value={finalData.individual_contributions} onChange={(e) => setFinalData((prev) => ({ ...prev, individual_contributions: e.target.value }))} placeholder="Individual contributions" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setFinalData({
                  final_report_url: TINY_PDF_DATA_URL,
                  presentation_url: TINY_PDF_DATA_URL,
                  demo_video_url: scenario.final.demo,
                  github_url: scenario.final.github,
                  final_summary: scenario.final.summary,
                  individual_contributions: scenario.final.contributions,
                })}>
                  Fill Final
                </Button>
                <Button onClick={handleSubmitFinal} disabled={!project || busyAction === "final"} className="flex-1">
                  {busyAction === "final" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Final
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
