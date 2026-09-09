"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/lib/project-service";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isTestUserEmail } from "@/lib/portal-mode";

export default function Phase2Submission() {
  const router = useRouter();
  const { user } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [isLeader, setIsLeader] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [presentationUrl, setPresentationUrl] = useState("");
  const [presentationBase64, setPresentationBase64] = useState("");
  const [presentationFileName, setPresentationFileName] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([]);
  const [pendingRisks, setPendingRisks] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState("");
  const [newRisk, setNewRisk] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingProject, setFetchingProject] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (isTestUser) {
        router.replace("/student/team");
        return;
      }
      try {
        const res = await projectService.getMyProject({ testMode: false });
        if (res.data?.project) {
          setIsLeader(res.data.project.leader_id === user?.id);
          setSubmissionId(res.data.project.id);
          if (res.data.project.phase_2_data) {
            const p2 = res.data.project.phase_2_data;
            setGithubUrl(p2.github_url || "");
            setPresentationUrl(p2.presentation_url || "");
            setProgressNotes(p2.progress_notes || "");
            setCompletedMilestones(p2.completed_milestones || []);
            setPendingRisks(p2.pending_risks || []);
          }
        }
      } catch (err) {
        console.error("Failed to load project:", err);
      } finally {
        setFetchingProject(false);
      }
    }
    loadProject();
  }, [isTestUser, router, user]);

  const canSubmit =
    submissionId.trim().length > 0 &&
    githubUrl.trim().length > 0 &&
    (presentationBase64.trim().length > 0 || presentationUrl.trim().length > 0) &&
    progressNotes.trim().length >= 50 &&
    completedMilestones.length > 0;

  const addMilestone = () => {
    const value = newMilestone.trim();
    if (!value) return;
    setCompletedMilestones([...completedMilestones, value]);
    setNewMilestone("");
  };

  const removeMilestone = (index: number) => {
    setCompletedMilestones(completedMilestones.filter((_, idx) => idx !== index));
  };

  const addRisk = () => {
    const value = newRisk.trim();
    if (!value) return;
    setPendingRisks([...pendingRisks, value]);
    setNewRisk("");
  };

  const removeRisk = (index: number) => {
    setPendingRisks(pendingRisks.filter((_, idx) => idx !== index));
  };

  const handlePresentationUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setPresentationBase64(base64String);
      setPresentationFileName(file.name);
      setPresentationUrl("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canSubmit) {
      setError("Complete required fields — GitHub URL, presentation, at least 50 characters of notes and one milestone.");
      return;
    }

    setLoading(true);

    try {
      await projectService.submitPhase2(submissionId.trim(), {
        github_url: githubUrl.trim(),
        presentation_url: presentationBase64.trim() || presentationUrl.trim(),
        progress_notes: progressNotes.trim(),
        completed_milestones: completedMilestones,
        pending_risks: pendingRisks,
      }, { testMode: false });
      setMessage("Phase 2 submitted. Redirecting to feedback...");
      setTimeout(() => {
        router.push("/student/feedback");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit Phase 2.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading workspace</p>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <div className="space-y-8">
          <Button variant="ghost" asChild className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/student/my-team">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
            </Link>
          </Button>

          <StudentJourneyBanner currentPhase="PHASE_2" hasTeam={true} isLeader={false} />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phase 02 — View only</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Phase 2 — Architecture</h1>
            <p className="text-sm text-muted-foreground">Only the leader can submit. Details below.</p>
          </div>

          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Repository & progress</h2>
            </div>
            <CardContent className="space-y-6 p-6 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">GitHub</p>
                <p className="break-all font-mono text-foreground">{githubUrl || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Presentation</p>
                <p className="text-foreground">{presentationFileName || presentationUrl || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Progress notes</p>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{progressNotes || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button asChild className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              <Link href="/student/feedback">View Feedback</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8">
        <Button variant="ghost" asChild className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/student/my-team">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
          </Link>
        </Button>

        <StudentJourneyBanner currentPhase="PHASE_2" hasTeam={true} isLeader={true} />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phase 02 of 03 — Architecture</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Architecture & Progress</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Link repository, upload architecture slides and describe progress for review.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">1 — Repository & presentation</h2>
            </div>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="githubUrl" className="text-sm font-medium">
                    GitHub URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="githubUrl"
                    type="url"
                    required
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                  />
                  <p className="text-xs text-muted-foreground">Public repository.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presentationUpload" className="text-sm font-medium">
                    Presentation <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="presentationUpload"
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    required={!presentationBase64.trim() && !presentationUrl.trim()}
                    onChange={handlePresentationUpload}
                  />
                  <p className={`text-xs ${presentationFileName ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {presentationFileName || (presentationUrl ? "Attached" : "PDF, PPT or PPTX.")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">2 — Progress notes</h2>
              <p className="mt-1 text-xs text-muted-foreground">Minimum 50 characters.</p>
            </div>
            <CardContent className="p-6">
              <Textarea
                id="progressNotes"
                required
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Features built, integration, adjustments..."
                rows={6}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Clear explanation helps the review.</span>
                <span className={progressNotes.trim().length >= 50 ? "font-medium text-foreground" : "font-medium text-amber-600"}>
                  {progressNotes.trim().length} / 50
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Completed milestones <span className="text-destructive">*</span>
                </h3>
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-2">
                  <Input
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="User authentication completed"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMilestone();
                      }
                    }}
                  />
                  <Button type="button" size="icon" onClick={addMilestone} disabled={!newMilestone.trim()} className="h-9 w-9 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                  {completedMilestones.length > 0 ? (
                    completedMilestones.map((m, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                        <span className="pr-2 leading-relaxed">{m}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMilestone(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Add at least one milestone.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Pending risks</h3>
                <p className="mt-1 text-xs text-muted-foreground">Optional — blockers or risks.</p>
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-2">
                  <Input
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value)}
                    placeholder="API rate limiting"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRisk();
                      }
                    }}
                  />
                  <Button type="button" size="icon" variant="outline" onClick={addRisk} disabled={!newRisk.trim()} className="h-9 w-9 shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                  {pendingRisks.length > 0 ? (
                    pendingRisks.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                        <span className="pr-2 leading-relaxed">{r}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeRisk(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No risks listed.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
          {message && <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">{message}</div>}

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button type="button" variant="outline" asChild className="h-9">
              <Link href="/student/my-team">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit || loading} className="h-9 min-w-[160px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : (
                "Submit Phase 2"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
