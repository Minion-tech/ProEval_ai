"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InterviewRoom } from "@/components/student/InterviewRoom";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        const { data } = await apiClient.get<any>(`${basePath}/my-project`);
        const project = data?.project;
        
        if (project && project.id === submissionId) {
          setProjectTitle(project.phase_1_data?.title || "Your Project");
        } else {
          // Fallback or error if ID doesn't match active project
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

  const handleInterviewComplete = async (results: any) => {
    try {
      const basePath = isStoredTestUser() ? "/test-projects" : "/projects";
      await apiClient.post(`${basePath}/${submissionId}/interview/results`, results);
      toast.success("Interview submitted successfully!");
    } catch (err) {
      console.error("Submit Results Error:", err);
      toast.error("Failed to submit interview results. Please contact support.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Technical Viva</h1>
        <p className="text-muted-foreground">
          Final evaluation for: <span className="font-semibold text-foreground">{projectTitle}</span>
        </p>
      </div>

      <ConversationProvider>
        <InterviewRoom 
          submissionId={submissionId} 
          onComplete={handleInterviewComplete} 
        />
      </ConversationProvider>
    </div>
  );
}
