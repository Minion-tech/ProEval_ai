"use client";

import { useState, useEffect, type FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/lib/project-service";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isTestUserEmail } from "@/lib/portal-mode";

export default function Phase3Submission() {
  const router = useRouter();
  const { user } = useAuth();
  const isTestUser = isTestUserEmail(user?.email);
  const [submissionId, setSubmissionId] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [individualContributions, setIndividualContributions] = useState("");
  const [finalReportBase64, setFinalReportBase64] = useState("");
  const [presentationBase64, setPresentationBase64] = useState("");
  const [reportFileName, setReportFileName] = useState("");
  const [presentationFileName, setPresentationFileName] = useState("");
  const [existingPresentationUrl, setExistingPresentationUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetchingProject, setFetchingProject] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
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
          if (res.data.project.final_data) {
            const fin = res.data.project.final_data;
            setGithubUrl(fin.github_url || "");
            setDemoVideoUrl(fin.demo_video_url || "");
            setFinalSummary(fin.final_summary || "");
            setIndividualContributions(fin.individual_contributions || "");
            const presentation = fin.presentation_url || "";
            if (presentation.startsWith("data:")) {
              setPresentationBase64(presentation);
              setPresentationFileName("Uploaded presentation");
            } else {
              setExistingPresentationUrl(presentation);
            }
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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, type: "report" | "presentation") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (type === "report") {
        setFinalReportBase64(base64);
        setReportFileName(file.name);
      } else {
        setPresentationBase64(base64);
        setPresentationFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!githubUrl || !finalSummary || !individualContributions) {
      setError("Please complete required fields — GitHub URL, summary and contributions.");
      return;
    }

    setLoading(true);

    try {
      await projectService.submitFinal(
        submissionId.trim(),
        {
          github_url: githubUrl.trim(),
          demo_video_url: demoVideoUrl.trim() || undefined,
          final_summary: finalSummary.trim(),
          individual_contributions: individualContributions.trim(),
          final_report_url: finalReportBase64,
          presentation_url: presentationBase64,
        },
        { testMode: false }
      );
      setMessage("Final showcase submitted. Next step is the Technical Viva.");
      setTimeout(() => {
        router.push("/student/feedback");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit final showcase.");
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

          <StudentJourneyBanner currentPhase="FINAL" hasTeam={true} isLeader={false} />

          <div className="space-y-2">
            <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">Final Showcase</h1>
            <p className="text-sm text-muted-foreground">Only the leader can submit final deliverables.</p>
          </div>

          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Submitted deliverables</h2>
            </div>
            <CardContent className="space-y-6 p-6 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">GitHub</p>
                <p className="break-all font-mono text-foreground">{githubUrl || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Demo video</p>
                <p className="text-foreground">{demoVideoUrl || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Summary</p>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{finalSummary || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contributions</p>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{individualContributions || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button asChild className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              <Link href="/student/feedback">Start Viva</Link>
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

        <StudentJourneyBanner currentPhase="FINAL" hasTeam={true} isLeader={true} />

        <div className="space-y-2">
          <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">Final Showcase</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Submit final report, slides, repository and contribution breakdown. Afterwards the Technical Viva unlocks for all members.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">1 — Repository & demo</h2>
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
                  <p className="text-xs text-muted-foreground">Main repository.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoVideoUrl" className="text-sm font-medium">
                    Demo video
                  </Label>
                  <Input
                    id="demoVideoUrl"
                    type="url"
                    value={demoVideoUrl}
                    onChange={(e) => setDemoVideoUrl(e.target.value)}
                    placeholder="https://youtu.be/..."
                  />
                  <p className="text-xs text-muted-foreground">YouTube, Loom or Drive link.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Final report</h3>
                <p className="mt-1 text-xs text-muted-foreground">PDF or deck.</p>
              </div>
              <CardContent className="space-y-2 p-6">
                <Input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => handleFileUpload(e, "report")} />
                <p className="text-xs font-medium text-foreground">{reportFileName || "No file selected."}</p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Presentation</h3>
                <p className="mt-1 text-xs text-muted-foreground">Final slide deck.</p>
              </div>
              <CardContent className="space-y-2 p-6">
                <Input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => handleFileUpload(e, "presentation")} />
                <p className="text-xs font-medium text-foreground">
                  {presentationFileName || (existingPresentationUrl ? "Existing file attached" : "No file selected.")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">2 — Summary & outcomes</h2>
            </div>
            <CardContent className="p-6">
              <Textarea
                required
                rows={5}
                value={finalSummary}
                onChange={(e) => setFinalSummary(e.target.value)}
                placeholder="Outcome, performance, achievements..."
              />
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">3 — Individual contributions</h2>
              <p className="mt-1 text-xs text-muted-foreground">Who built what — for fair Viva grading.</p>
            </div>
            <CardContent className="p-6">
              <Textarea
                required
                rows={6}
                value={individualContributions}
                onChange={(e) => setIndividualContributions(e.target.value)}
                placeholder={"Member 1: Built auth & API...\nMember 2: UI components..."}
              />
            </CardContent>
          </Card>

          {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
          {message && <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">{message}</div>}

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button type="button" variant="outline" asChild className="h-9">
              <Link href="/student/my-team">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="h-9 min-w-[160px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : (
                "Submit Showcase"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
