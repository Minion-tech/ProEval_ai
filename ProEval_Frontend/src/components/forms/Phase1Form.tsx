"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/lib/project-service";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Phase1FormProps {
  showCancelButton?: boolean;
  onCancel?: () => void;
}

export default function Phase1Form({
  showCancelButton = false,
  onCancel,
}: Phase1FormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    domain: "",
    objective: "",
    methodology: "",
    useCaseDiagram: "",
    useCaseDiagramName: "",
    techStack: "",
  });

  useEffect(() => {
    async function loadCurrentProject() {
      try {
        const res = await projectService.getMyProject();
        const current = res.data?.project;
        if (current) {
          setExistingSubmissionId(current.id);
          const phase1 = current.phase_1_data;
          if (phase1) {
            setFormData((prev) => ({
              ...prev,
              title: phase1.title ?? "",
              domain: phase1.domain ?? "",
              objective: phase1.abstract ?? "",
              methodology: phase1.methodology ?? "",
              useCaseDiagram: phase1.use_case_diagram ?? "",
              useCaseDiagramName: phase1.use_case_diagram ? "Previously uploaded" : "",
              techStack: Array.isArray(phase1.tech_stack) ? phase1.tech_stack.join("\n") : "",
            }));
          }
        }
      } catch {
        // Keep form usable for first submission
      } finally {
        setLoadingProject(false);
      }
    }
    loadCurrentProject();
  }, []);

  const handleUseCaseDiagramUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setError("Use case diagram must be PNG, JPG, WebP or SVG.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("File must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        useCaseDiagram: String(reader.result || ""),
        useCaseDiagramName: file.name,
      }));
      setError(null);
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        phase_1_data: {
          title: formData.title,
          domain: formData.domain,
          abstract: formData.objective,
          objectives: [formData.objective.trim()].filter(Boolean),
          methodology: formData.methodology,
          use_case_diagram: formData.useCaseDiagram,
          tech_stack: formData.techStack
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        semester: 6,
        academic_year: "2025-26",
      };

      if (existingSubmissionId) {
        await projectService.resubmitPhase1(existingSubmissionId, payload);
      } else {
        await projectService.submitPhase1(payload);
      }

      router.push("/student/feedback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Project essentials</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            High-level description of your research or application.
          </p>
        </div>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Project title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                required
                placeholder="AI-Powered Health Diagnostic System"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm font-medium">
                Domain <span className="text-destructive">*</span>
              </Label>
              <Input
                id="domain"
                required
                placeholder="Artificial Intelligence / Web Tech"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective" className="text-sm font-medium">
              Objective <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="objective"
              required
              rows={7}
              placeholder="State the problem, goals and expected outcome..."
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">200 characters recommended for better analysis.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="methodology" className="text-sm font-medium">
                Methodology <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="methodology"
                required
                rows={5}
                placeholder="Explain approach, modules, workflow and validation..."
                value={formData.methodology}
                onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="useCaseDiagram" className="text-sm font-medium">
                Use case diagram
              </Label>
              <Input
                id="useCaseDiagram"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                required={!formData.useCaseDiagram}
                onChange={handleUseCaseDiagramUpload}
              />
              <p className={`text-xs ${formData.useCaseDiagram ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {formData.useCaseDiagramName || "PNG, JPG, WebP or SVG — max 1 MB."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="techStack" className="text-sm font-medium">
              Tech stack <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="techStack"
              required
              rows={4}
              placeholder={"Next.js\nFastAPI\nPostgreSQL"}
              value={formData.techStack}
              onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">One technology per line.</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        {showCancelButton && (
          <Button variant="outline" type="button" onClick={onCancel} className="h-9">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="h-9 min-w-[140px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting
            </>
          ) : existingSubmissionId ? (
            "Resubmit Proposal"
          ) : (
            "Submit Proposal"
          )}
        </Button>
      </div>
    </form>
  );
}
