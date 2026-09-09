"use client";

import React, { useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Camera, CheckCircle2, Loader2, Mic, MessageSquare } from "lucide-react";
import { useInterviewMonitoring } from "@/hooks/useInterviewMonitoring";
import { apiClient } from "@/lib/api";
import { ElevenLabsOrb } from "./ElevenLabsOrb";
import { isStoredTestUser } from "@/lib/portal-mode";

interface InterviewRoomProps {
  submissionId: string;
  onComplete: (results: any) => void;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({ submissionId, onComplete }) => {
  const [step, setStep] = useState<"setup" | "interview" | "result">("setup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { webcamRef, isLoading: isMonitoringLoading, error: monitoringError, telemetry } = useInterviewMonitoring(step === "interview");
  
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [interviewContext, setInterviewContext] = useState<{
    agent_name: string;
    system_prompt: string;
    initial_questions: string[];
    student_name?: string;
    student_role?: string;
    phase1_title?: string;
    project_summary?: string;
  } | null>(null);

  const fetchContext = useCallback(async () => {
    if (!submissionId || submissionId === "undefined") {
      console.warn("Invalid submissionId, skipping context fetch.");
      setContextLoading(false);
      return;
    }

    setContextLoading(true);
    setContextError(null);
    try {
      const basePath = isStoredTestUser() ? "/test-projects" : "/projects";
      const { data } = await apiClient.get<any>(`${basePath}/${submissionId}/interview/context`);
      setInterviewContext(data);
    } catch (err: any) {
      console.error("Failed to fetch interview context:", err);
      setContextError(err.message || "Failed to connect to backend API.");
    } finally {
      setContextLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const startInterview = () => {
    setStep("interview");
  };

  const finishInterview = () => {
    setIsSubmitting(true);
    setStep("result");
    const lookAwayPercentage = (telemetry.lookAwayCount / (telemetry.totalChecks || 1)) * 100;
    onComplete({
      telemetry: {
        look_away_percentage: lookAwayPercentage.toFixed(2),
        warnings_issued: lookAwayPercentage > 30 ? 1 : 0,
      },
      transcript: "Student: I used a microservices architecture with Next.js and FastAPI.\nAI: Interesting, how did you handle state management?\nStudent: I used Redux for global state and React Query for server state."
    });
  };

  const simulateAiFeedback = async () => {
    try {
      setContextLoading(true);
      await apiClient.post("/integrations/elevenlabs/webhook", {
        call: {
          call_id: `test_${Math.random().toString(36).substring(7)}`,
          variables: { submission_id: submissionId }
        },
        transcript: [
          { role: "ai", message: "Hello! Please describe your project's main goal." },
          { role: "user", message: "My project aims to automate evaluation using AI." },
          { role: "ai", message: "Great. What was the biggest technical challenge?" },
          { role: "user", message: "Integrating real-time monitoring with low latency." }
        ],
        data_collection_results: {
          student_name: interviewContext?.student_name || "Test Student",
          project_title: interviewContext?.phase1_title || "My Project",
          evaluation_summary: "The student demonstrated strong technical understanding of the project architecture and successfully addressed challenges regarding latency.",
          technical_score: 85,
          key_strengths: "Clear articulation of microservices, good problem-solving approach.",
          improvement_plan: "Deepen understanding of edge caching strategies.",
          project_challenges_summary: "Managed to reduce latency from 5s to 200ms using Redis.",
          technical_assesment_notes: "Strong proficiency in React and Python found."
        }
      });
      window.location.href = "/student/feedback";
    } catch (err) {
      console.error("Simulation Error:", err);
      alert("Failed to simulate feedback. Check console.");
    } finally {
      setContextLoading(false);
    }
  };

  if (isMonitoringLoading || contextLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Setting up interview</p>
      </div>
    );
  }

  if (contextError) {
    return (
      <Card className="border border-destructive/20 bg-destructive/10">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">{contextError}</p>
          </div>
          <p className="text-sm text-muted-foreground">Please ensure the server is reachable.</p>
          <Button onClick={fetchContext} variant="outline" size="sm" className="h-8">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (monitoringError) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold">{monitoringError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {step === "setup" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-border bg-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base font-semibold">Preparation</CardTitle>
              <CardDescription className="text-xs leading-relaxed">Camera check and microphone for the Viva.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                <Webcam ref={webcamRef} audio={false} className="h-full w-full object-cover" />
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    <Camera className="h-3 w-3" /> Camera
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    <Mic className="h-3 w-3" /> Mic
                  </span>
                </div>
              </div>

              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Quiet, well-lit environment; stay centered in frame.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Three technical questions on architecture and challenges.</span>
                </li>
              </ul>

              <Button onClick={startInterview} className="h-10 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                Start Interview
              </Button>
            </CardContent>
          </Card>

          {interviewContext && (
            <Card className="border border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-base font-semibold">Viva topics</CardTitle>
                <CardDescription className="text-xs">Tailored to your project and role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <ul className="space-y-3">
                  {interviewContext.initial_questions.map((q, i) => (
                    <li key={i} className="flex gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm leading-relaxed text-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium">
                        {i + 1}
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Interviewer</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{interviewContext.agent_name}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "interview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card text-foreground border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border bg-card">
                <CardTitle className="flex items-center justify-between">
                   <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      AI Technical Interviewer
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Live Session</span>
                 </CardTitle>
              </CardHeader>
              <CardContent className="h-[500px] flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                   <div className="h-64 w-64 rounded-full border border-primary/30 animate-[ping_3s_linear_infinite]" />
                   <div className="absolute h-48 w-48 rounded-full border border-primary/50 animate-[ping_2s_linear_infinite]" />
                </div>
                
                <div className="z-10 w-full h-full flex items-center justify-center p-4">
                      <ElevenLabsOrb 
                        agentId={process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_0001ktxk2n0wfjq8bannqea0xjtw"}
                        submissionId={submissionId}
                        userName={interviewContext?.student_name}
                        userRole={interviewContext?.student_role}
                        systemPrompt={interviewContext?.system_prompt}
                        projectSummary={interviewContext?.project_summary}
                        initialQuestions={interviewContext?.initial_questions}
                        shouldEnd={isSubmitting}
                      />
                 </div>
              </CardContent>
            </Card>
            <Button 
              size="lg"
              onClick={finishInterview} 
              className="w-full bg-primary hover:opacity-90 text-foreground font-bold h-14"
            >
               Submit Viva & Finalize
            </Button>
            <p className="text-center text-xs text-muted-foreground italic">
               * Clicking submit will end the AI session and prepare your technical feedback report.
            </p>
          </div>

          <div className="space-y-4">
            <Card>
               <CardHeader>
                 <CardTitle className="text-sm">Monitoring System</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                     <Webcam
                       ref={webcamRef}
                       audio={false}
                       className="h-full w-full object-cover opacity-50"
                     />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[10px] font-mono text-emerald-500">
                           {telemetry.lookAwayCount > 10 ? (
                             <span className="text-amber-500">WARNING: LOOKING AWAY</span>
                           ) : (
                             <span>INTEGRITY: SECURE</span>
                           )}
                        </div>
                     </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <span className="text-muted-foreground">Focus Score</span>
                       <span className="font-bold">{(100 - (telemetry.lookAwayCount / (telemetry.totalChecks || 1)) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                       <div 
                         className="h-full bg-primary transition-all duration-500" 
                         style={{ width: `${100 - (telemetry.lookAwayCount / (telemetry.totalChecks || 1)) * 100}%` }}
                       />
                    </div>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      )}

      {step === "result" && (
        <Card className="border border-border bg-card py-8">
          <CardContent className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/30">
              <CheckCircle2 className="h-7 w-7 text-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Viva submitted</h3>
              <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">Your session is complete. Feedback will be generated shortly.</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button onClick={() => (window.location.href = "/student/feedback")} className="h-9 bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                View Feedback
              </Button>
              {isStoredTestUser() && (
                <Button onClick={simulateAiFeedback} variant="outline" size="sm" className="h-9">
                  Simulate Feedback (Dev)
                </Button>
              )}
              <Button onClick={() => (window.location.href = "/student/dashboard")} variant="outline" size="sm" className="h-9">
                Dashboard
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">Transcript appears on the feedback page within ~30 seconds.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
