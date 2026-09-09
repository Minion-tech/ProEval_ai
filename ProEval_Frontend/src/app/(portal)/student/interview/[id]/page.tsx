"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InterviewRoom } from "@/components/student/InterviewRoom";
import { apiClient } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isStoredTestUser } from "@/lib/portal-mode";
import { ConversationProvider } from "@elevenlabs/react";

export default function StudentInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = (params?.id || "") as string;

  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");

  useEffect(() => {
    async function fetchProjectDetails() {
      try {
        const basePath = isStoredTestUser() ? "/test-projects" : "/projects";
        const { data } = await apiClient.get<unknown>(`${basePath}/my-project`);
        const project = (data as { project?: { id: string; phase_1_data?: { title?: string } } })?.project;

        if (project && project.id === submissionId) {
          setProjectTitle(project.phase_1_data?.title || "Your Project");
        } else {
          console.warn("Interview ID mismatch:", { submissionId, activeId: project?.id });
          toast.error("Invalid interview session.");
          router.push("/student/dashboard");
        }
      } catch (err) {
        console.error("Fetch Project Error:", err);
        toast.error("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjectDetails();
  }, [submissionId, router]);

  const handleInterviewComplete = async (results: unknown) => {
    try {
      const basePath = isStoredTestUser() ? "/test-projects" : "/projects";
      await apiClient.post(`${basePath}/${submissionId}/interview/results`, results as Record<string, unknown>);
      toast.success("Interview submitted successfully!");
    } catch (err) {
      console.error("Submit Results Error:", err);
      toast.error("Failed to submit interview results. Please contact support.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Final step — Viva</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Technical Viva</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Viva for <span className="font-medium text-foreground">{projectTitle}</span>. This 5-minute session is tailored to your role and contributions.
          </p>
        </div>

        <Card className="border border-border bg-card">
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Before you start</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                <span>Allow microphone access when prompted.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                <span>Session is about 5 minutes — conversational voice Q&amp;A.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                <span>Questions are personalized to your role, stack and modules.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <ConversationProvider>
          <InterviewRoom submissionId={submissionId} onComplete={handleInterviewComplete} />
        </ConversationProvider>
      </div>
    </div>
  );
}
