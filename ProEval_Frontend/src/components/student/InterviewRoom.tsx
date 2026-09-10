"use client";

import React, { useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Camera, CheckCircle2, Loader2, Mic, Shield, VideoOff } from "lucide-react";
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
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
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

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission("granted");
    } catch {
      setCameraPermission("denied");
    }
  }, []);

  useEffect(() => {
    if (step === "setup" && cameraPermission === "pending") {
      requestCameraPermission();
    }
  }, [step, cameraPermission, requestCameraPermission]);

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
      <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-border bg-card py-16">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground">Setting up your interview</p>
          <p className="text-xs text-muted-foreground">Initializing camera and AI systems...</p>
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <Card className="border border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Unable to connect</p>
            <p className="max-w-sm text-sm text-muted-foreground">{contextError}</p>
          </div>
          <Button onClick={fetchContext} variant="outline" size="sm" className="h-8 px-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (monitoringError) {
    return (
      <Card className="border border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Monitoring error</p>
            <p className="text-xs text-muted-foreground">{monitoringError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Setup Step ─── */}
      {step === "setup" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Camera Card */}
          <Card className="border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Camera & Microphone</CardTitle>
                {cameraPermission === "granted" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ready
                  </span>
                )}
                {cameraPermission === "denied" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Blocked
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {cameraPermission === "denied" ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 py-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <VideoOff className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-foreground">Camera access denied</p>
                    <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                      Enable camera and microphone in your browser settings, then try again.
                    </p>
                  </div>
                  <Button onClick={requestCameraPermission} variant="outline" size="sm" className="h-8 px-4">
                    Request Access
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
                    <Webcam ref={webcamRef} audio={false} className="h-full w-full object-cover" />
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-foreground">
                        <Camera className="h-3 w-3" /> Camera
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-foreground">
                        <Mic className="h-3 w-3" /> Mic
                      </span>
                    </div>
                    {cameraPermission === "pending" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    <span>Quiet, well-lit environment — stay centered in frame.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    <span>Three technical questions on architecture and challenges.</span>
                  </li>
                </ul>

                <Button
                  onClick={startInterview}
                  disabled={cameraPermission === "denied"}
                  className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Topics Card */}
          {interviewContext && (
            <Card className="border border-border bg-card overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Viva Topics</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Tailored to your project and role.</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {interviewContext.initial_questions.map((q, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground">{q}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">{interviewContext.agent_name?.charAt(0) || "A"}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Interviewer</p>
                    <p className="text-sm font-medium text-foreground">{interviewContext.agent_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Interview Step ─── */}
      {step === "interview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main AI Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden border border-border bg-card">
              <CardHeader className="border-b border-border px-6 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    AI Technical Interviewer
                  </CardTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative flex h-[480px] items-center justify-center bg-gradient-to-b from-muted/20 to-card p-6">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-72 w-72 rounded-full border border-primary/10 animate-[ping_4s_linear_infinite] opacity-40" />
                  <div className="absolute h-56 w-56 rounded-full border border-primary/15 animate-[ping_3s_linear_infinite] opacity-30" />
                </div>
                <div className="z-10 w-full h-full flex items-center justify-center">
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
              className="w-full h-12 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Submit Viva & Finalize
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Submitting ends the AI session and prepares your technical feedback report.
            </p>
          </div>

          {/* Monitoring Sidebar */}
          <div className="space-y-4">
            <Card className="overflow-hidden border border-border bg-card">
              <CardHeader className="border-b border-border px-5 py-3.5">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-tight text-foreground">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  Integrity Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      className="h-full w-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ${
                        telemetry.lookAwayCount > 10 
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" 
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {telemetry.lookAwayCount > 10 ? "Focus Warning" : "Tracking Active"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Focus Score</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {(100 - (telemetry.lookAwayCount / (telemetry.totalChecks || 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full bg-primary transition-all duration-500" 
                        style={{ width: `${100 - (telemetry.lookAwayCount / (telemetry.totalChecks || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Result Step ─── */}
      {step === "result" && (
        <Card className="overflow-hidden border border-border bg-card">
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Viva Submitted</h3>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                Your session is complete. Your technical feedback report will be generated shortly.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button onClick={() => (window.location.href = "/student/feedback")} className="h-10 px-6 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                View Feedback
              </Button>
              {isStoredTestUser() && (
                <Button onClick={simulateAiFeedback} variant="outline" size="sm" className="h-10 px-4">
                  Simulate Feedback (Dev)
                </Button>
              )}
              <Button onClick={() => (window.location.href = "/student/dashboard")} variant="outline" size="sm" className="h-10 px-4">
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
