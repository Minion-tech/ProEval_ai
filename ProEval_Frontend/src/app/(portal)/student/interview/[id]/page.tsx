"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InterviewRoom } from "@/components/student/InterviewRoom";
import { apiClient } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground">Preparing your viva</p>
          <p className="text-xs text-muted-foreground">Loading interview session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Technical Viva</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Viva for <span className="font-medium text-foreground">{projectTitle}</span>. This 5-minute session is tailored to your role and contributions.
          </p>
        </div>

        <Card className="border border-border bg-card">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Before you start</h2>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Allow camera and microphone access when prompted.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Session is about 5 minutes — conversational voice Q&amp;A.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Questions are personalized to your role, stack and modules.</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <ConversationProvider>
          <InterviewRoom submissionId={submissionId} onComplete={handleInterviewComplete} />
        </ConversationProvider>
      </div>
    </div>
  );
}
