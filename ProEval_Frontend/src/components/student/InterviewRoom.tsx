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
      // Call the webhook endpoint directly with mock data
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
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Setting up AI Interview Room...</p>
      </div>
    );
  }

  if (contextError) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6 space-y-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold">{contextError}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Please ensure your backend server is running and reachable.
          </p>
          <Button onClick={fetchContext} variant="outline" size="sm">
            Retry Connection
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>AI Viva Preparation</CardTitle>
              <CardDescription>We will use your camera to validate integrity and your microphone for the conversational AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 flex space-x-2">
                  <div className="flex items-center space-x-1 rounded-full bg-green-500/80 px-3 py-1 text-xs font-bold text-white">
                    <Camera className="h-3 w-3" />
                    <span>Camera Ready</span>
                  </div>
                  <div className="flex items-center space-x-1 rounded-full bg-green-500/80 px-3 py-1 text-xs font-bold text-white">
                    <Mic className="h-3 w-3" />
                    <span>Mic Ready</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <ul className="list-inside list-disc space-y-1">
                  <li>Ensure you are in a well-lit, quiet environment.</li>
                  <li>Stay centered in the frame; we will track your focus.</li>
                  <li>The AI will ask exactly 3 technical questions about your architecture and challenges.</li>
                </ul>
              </div>

              <Button onClick={startInterview} className="w-full h-12 text-lg font-bold">
                Start Interview
              </Button>
            </CardContent>
          </Card>

          {interviewContext && (
            <Card className="border-indigo-100 bg-indigo-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <MessageSquare className="h-5 w-5" />
                  Your Personalized Viva Topics
                </CardTitle>
                <CardDescription>Our AI has reviewed your project and prepared these initial points of discussion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {interviewContext.initial_questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border bg-white p-3 shadow-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-700">{q}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-indigo-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Interviewer Agent</p>
                  <p className="mt-1 text-sm font-medium">{interviewContext.agent_name}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "interview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-neutral-900 text-white border-none shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/10 bg-neutral-800">
                <CardTitle className="flex items-center justify-between">
                   <span className="flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                     AI Technical Interviewer
                   </span>
                   <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Live Session</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[500px] flex items-center justify-center bg-black p-0 relative">
                {/* Visual Radar Decoration */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                   <div className="h-64 w-64 rounded-full border border-indigo-500/30 animate-[ping_3s_linear_infinite]" />
                   <div className="absolute h-48 w-48 rounded-full border border-indigo-500/50 animate-[ping_2s_linear_infinite]" />
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
              className="w-full bg-white text-black hover:bg-neutral-200 font-bold h-14"
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
                 <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      className="h-full w-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="text-[10px] font-mono text-green-500">
                          {telemetry.lookAwayCount > 10 ? (
                            <span className="text-yellow-500">WARNING: LOOKING AWAY</span>
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
                   <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
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
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 shadow-lg py-8">
          <CardContent className="text-center space-y-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-800 shadow-inner">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-extrabold text-green-900 dark:text-green-300">Viva Successfully Submitted!</CardTitle>
              <CardDescription className="text-lg text-green-700/80 dark:text-green-400/80 max-w-lg mx-auto">
                Excellent work! Your AI Technical Viva is complete. Our agents are now processing the transcript and telemetry to generate your detailed feedback.
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                onClick={() => window.location.href = "/student/feedback"} 
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 h-14"
              >
                 View Detailed AI Feedback
              </Button>
              {isStoredTestUser() && (
                <Button 
                  onClick={simulateAiFeedback} 
                  variant="secondary"
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-14 px-8"
                >
                   🚀 Simulate AI Feedback (Dev Mode)
                </Button>
              )}
              <Button 
                onClick={() => window.location.href = "/student/dashboard"} 
                variant="outline"
                size="lg"
                className="border-green-200 bg-white text-green-700 hover:bg-green-50 font-bold h-14"
              >
                 Back to Dashboard
              </Button>
            </div>
            
            <p className="text-xs text-green-600/60 font-medium">
              Note: It may take up to 30 seconds for the transcript and summary to appear on the feedback page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
