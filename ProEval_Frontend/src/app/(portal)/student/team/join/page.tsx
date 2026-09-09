"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/lib/project-service";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function TeamJoinPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    enrollmentNo: "",
    programme: "",
    department: "",
    batch: "",
    email: "",
    teamId: "",
    role: "",
    functions: "",
    modules: "",
    techStack: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        enrollmentNo: user.enrollment_no || prev.enrollmentNo,
        programme: user.programme || prev.programme,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    if (!formData.teamId.trim()) {
      setError("Please enter the Team ID provided by your team leader.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.role.trim()) {
      setError("Please enter your role, for example Frontend Developer.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.functions.trim() || formData.functions.trim().length < 10) {
      setError("Please describe your planned contributions with at least 10 characters — this helps personalize the Viva.");
      setIsSubmitting(false);
      return;
    }

    try {
      await projectService.joinTeam({
        team_id: formData.teamId.trim(),
        role: formData.role.trim(),
        functions: formData.functions.trim(),
        modules: formData.modules.trim() || "Core Components",
        tech_stack: formData.techStack.trim() || undefined,
      });
      setMessage("You have joined the team. Redirecting to your workspace...");
      setTimeout(() => {
        router.push("/student/my-team");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not find a team with that Team ID. Please check with your leader.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8 md:space-y-10">
        <Button variant="ghost" asChild className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/student/team">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Team Setup
          </Link>
        </Button>

        <StudentJourneyBanner currentPhase="NO_TEAM" hasTeam={false} />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Join team
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Join Project Team</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Enter the Team ID shared by your leader and describe your role. This is used to personalize your Viva.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Team connection</h2>
              <p className="mt-1 text-xs text-muted-foreground">Connect to your group project.</p>
            </div>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="teamId" className="text-sm font-medium">
                  Team ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="teamId"
                  required
                  value={formData.teamId}
                  onChange={(e) => handleInputChange("teamId", e.target.value)}
                  placeholder="TEAM-2026-X89K"
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">Ask your leader for the Team ID generated after creating the team.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Your role <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role"
                    required
                    value={formData.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    placeholder="Frontend Engineer"
                  />
                  <p className="text-xs text-muted-foreground">Primary functional role.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="techStack" className="text-sm font-medium">
                    Your tech stack
                  </Label>
                  <Input
                    id="techStack"
                    value={formData.techStack}
                    onChange={(e) => handleInputChange("techStack", e.target.value)}
                    placeholder="React, Node.js, Python"
                  />
                  <p className="text-xs text-muted-foreground">Technologies you will use.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="functions" className="text-sm font-medium">
                  Contributions & tasks <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="functions"
                  required
                  rows={3}
                  value={formData.functions}
                  onChange={(e) => handleInputChange("functions", e.target.value)}
                  placeholder="Describe modules or features you will build, for example authentication, database schema, API integration."
                />
                <p className="text-xs text-muted-foreground">At least 10 characters. Used to tailor Viva questions.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modules" className="text-sm font-medium">
                  Modules
                </Label>
                <Input
                  id="modules"
                  value={formData.modules}
                  onChange={(e) => handleInputChange("modules", e.target.value)}
                  placeholder="/src/components/auth, /api/users"
                />
                <p className="text-xs text-muted-foreground">Optional — code areas you own.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-muted/30">
            <div className="border-b border-border bg-background/50 px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Student identity</h2>
              <p className="mt-1 text-xs text-muted-foreground">Verified from your account.</p>
            </div>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Full name</dt>
                  <dd className="mt-1 font-medium text-foreground">{formData.fullName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Enrollment</dt>
                  <dd className="mt-1 font-mono text-foreground">{formData.enrollmentNo || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</dt>
                  <dd className="mt-1 font-medium text-foreground">{formData.email || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {message && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <p>{message}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button variant="outline" type="button" asChild className="h-9">
              <Link href="/student/team">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-9 bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining
                </>
              ) : (
                "Confirm & Join"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
