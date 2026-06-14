"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { projectService, type Phase2Data } from "@/lib/project-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Phase2FormProps {
  submissionId: string;
  existingData?: Partial<Phase2Data>;
}

export default function Phase2Form({ submissionId, existingData }: Phase2FormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [githubUrl, setGithubUrl] = useState(existingData?.github_url ?? "");
  const [presentationUrl, setPresentationUrl] = useState(existingData?.presentation_url ?? "");
  const [progressNotes, setProgressNotes] = useState(existingData?.progress_notes ?? "");
  const [milestones, setMilestones] = useState<string[]>(
    existingData?.completed_milestones?.length ? existingData.completed_milestones : [""]
  );
  const [risks, setRisks] = useState<string[]>(
    existingData?.pending_risks?.length ? existingData.pending_risks : [""]
  );

  const updateList = (
    list: string[],
    setter: (v: string[]) => void,
    index: number,
    value: string
  ) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const addItem = (list: string[], setter: (v: string[]) => void) =>
    setter([...list, ""]);

  const removeItem = (list: string[], setter: (v: string[]) => void, index: number) => {
    if (list.length === 1) return;
    setter(list.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const filledMilestones = milestones.filter((m) => m.trim());
    const filledRisks = risks.filter((r) => r.trim());

    if (!githubUrl.trim() || !presentationUrl.trim() || !progressNotes.trim() || filledMilestones.length === 0) {
      setError("GitHub URL, Presentation URL, Progress Notes, and at least one completed milestone are required.");
      return;
    }

    const payload: Phase2Data = {
      github_url: githubUrl.trim(),
      presentation_url: presentationUrl.trim(),
      progress_notes: progressNotes.trim(),
      completed_milestones: filledMilestones,
      pending_risks: filledRisks,
    };

    setSubmitting(true);
    try {
      await projectService.submitPhase2(submissionId, payload);
      router.push("/student/feedback");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase 2 — Mid-Term Progress</CardTitle>
        <CardDescription>
          Submit your implementation progress, architecture, and completed milestones for AI review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GitHub URL */}
          <div className="space-y-2">
            <Label htmlFor="github_url">GitHub Repository URL *</Label>
            <Input
              id="github_url"
              placeholder="https://github.com/your-org/your-repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              required
            />
          </div>

          {/* Presentation URL */}
          <div className="space-y-2">
            <Label htmlFor="presentation_url">Presentation URL *</Label>
            <Input
              id="presentation_url"
              placeholder="https://drive.google.com/... or similar"
              value={presentationUrl}
              onChange={(e) => setPresentationUrl(e.target.value)}
            />
          </div>

          {/* Progress Notes */}
          <div className="space-y-2">
            <Label htmlFor="progress_notes">Progress Notes *</Label>
            <Textarea
              id="progress_notes"
              placeholder="Detailed summary of the work completed so far (min 50 characters)..."
              rows={5}
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{progressNotes.length} / 3000</p>
          </div>

          {/* Completed Milestones */}
          <div className="space-y-3">
            <Label>Completed Milestones *</Label>
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Milestone ${i + 1}`}
                  value={m}
                  onChange={(e) => updateList(milestones, setMilestones, i, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(milestones, setMilestones, i)}
                  disabled={milestones.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem(milestones, setMilestones)}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Milestone
            </Button>
          </div>

          {/* Pending Risks */}
          <div className="space-y-3">
            <Label>Pending Risks / Blockers (optional)</Label>
            {risks.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Risk ${i + 1}`}
                  value={r}
                  onChange={(e) => updateList(risks, setRisks, i, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(risks, setRisks, i)}
                  disabled={risks.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem(risks, setRisks)}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Risk
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting for AI Review…
              </>
            ) : (
              "Submit Phase 2"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
