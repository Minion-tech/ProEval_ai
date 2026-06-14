"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/lib/project-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

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

  // 1. Load current project for edit/resubmit flow
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
        // Keep the form usable for first-time submit if project fetch fails.
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
      setError("Use case diagram must be a PNG, JPG, WebP, or SVG image.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("Use case diagram must be 1 MB or smaller.");
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
    reader.onerror = () => setError("Could not read the selected use case diagram.");
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

      // Always redirect to feedback after submission
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Project Essentials
          </CardTitle>
          <CardDescription>
            Provide high-level details about your research or application.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                required
                placeholder="e.g. AI-Powered Health Diagnostic System"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                required
                placeholder="e.g. Artificial Intelligence / Web Tech"
                value={formData.domain}
                onChange={(e) =>
                  setFormData({ ...formData, domain: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">Project Objective</Label>
            <Textarea
              id="objective"
              required
              rows={8}
              placeholder="State the main objective, problem being solved, and expected outcome..."
              value={formData.objective}
              onChange={(e) =>
                setFormData({ ...formData, objective: e.target.value })
              }
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              Minimum 200 characters recommended for better AI analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="methodology">Methodology</Label>
              <Textarea
                id="methodology"
                required
                rows={6}
                placeholder="Explain your implementation approach, modules, workflow, and validation method..."
                value={formData.methodology}
                onChange={(e) =>
                  setFormData({ ...formData, methodology: e.target.value })
                }
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="useCaseDiagram">Use Case Diagram</Label>
              <Input
                id="useCaseDiagram"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                required={!formData.useCaseDiagram}
                onChange={handleUseCaseDiagramUpload}
              />
              <p
                className={`text-xs ${
                  formData.useCaseDiagram
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {formData.useCaseDiagramName ||
                  "Upload PNG, JPG, WebP, or SVG. Max 1 MB."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="techStack">Tech Stack</Label>
            <Textarea
              id="techStack"
              required
              rows={5}
              placeholder={"Next.js\nFastAPI\nPostgreSQL"}
              value={formData.techStack}
              onChange={(e) =>
                setFormData({ ...formData, techStack: e.target.value })
              }
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Enter one technology per line.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-4">
        {showCancelButton && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="min-w-[150px] shadow-lg">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
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
