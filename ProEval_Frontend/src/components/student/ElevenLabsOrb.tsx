"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, PhoneCall, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

interface ElevenLabsOrbProps {
  agentId: string;
  submissionId?: string;
  userName?: string;
  userRole?: string;
  systemPrompt?: string;
  projectSummary?: string;
  initialQuestions?: string[];
  onTranscript?: (text: string) => void;
  shouldEnd?: boolean;
}

export const ElevenLabsOrb = memo(({ 
  agentId, 
  submissionId, 
  userName, 
  userRole, 
  systemPrompt, 
  projectSummary,
  initialQuestions,
  shouldEnd
}: ElevenLabsOrbProps) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected successfully.");
      setIsCalling(true);
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected.");
      setIsCalling(false);
      setIsConnecting(false);
    },
    onMessage: (message) => {
      console.log("[ElevenLabs] Message:", message);
    },
    onError: (error) => {
      console.error("[ElevenLabs] Error details:", error);
      setIsCalling(false);
      setIsConnecting(false);
    },
  });

  useEffect(() => {
    if (shouldEnd && isCalling) {
      console.log("[ElevenLabs] Parent requested session end. Ending call...");
      conversation.endSession();
    }
  }, [shouldEnd, isCalling, conversation]);

  const toggleCall = useCallback(async () => {
    if (isCalling) {
      console.log("[ElevenLabs] Ending session...");
      await conversation.endSession();
    } else {
      if (isConnecting) return;
      
      try {
        setIsConnecting(true);

        const sessionToken = `session_${Math.random().toString(36).substring(2, 15)}`;
        
        try {
          await apiClient.post("/integrations/register-session", {
            submission_id: submissionId,
            session_token: sessionToken
          });
          console.log("[ElevenLabs] Session mapped successfully:", sessionToken);
        } catch (regError) {
          console.error("[ElevenLabs] Failed to register session mapping:", regError);
        }

        console.log("[ElevenLabs] Starting session for Agent ID:", agentId);
        
        await conversation.startSession({
          agentId: agentId,
          dynamicVariables: {
            submission_id: submissionId || "",
            session_token: sessionToken,
          },
        });
      } catch (error: any) {
        console.error("[ElevenLabs] Failed to start session:", error);
        setIsConnecting(false);
        const errorMessage = error?.message || (typeof error === 'string' ? error : "Unknown connection error");
        
        if (errorMessage.includes("Abort")) {
          console.warn("[ElevenLabs] Connection was aborted. This often happens due to microphone issues or rapid re-renders.");
          return;
        }
        
        alert(`Could not connect to AI Agent: ${errorMessage}. Please check your internet or Agent ID.`);
      }
    }
  }, [isCalling, isConnecting, conversation, agentId, submissionId, userName, userRole, systemPrompt, initialQuestions]);

  const isSpeaking = conversation.isSpeaking;
  const status = conversation.status;

  useEffect(() => {
    console.log(`[ElevenLabs] Status changed: ${status}`);
    if (status === "disconnected" && isCalling) {
      setIsCalling(false);
      setIsConnecting(false);
    }
    if (status === "connected") {
      setIsConnecting(false);
    }
  }, [status, isCalling]);

  return (
    <div className="flex flex-col items-center justify-center space-y-12">
      <div className="relative flex items-center justify-center">
        <div 
          className={`absolute h-64 w-64 rounded-full bg-primary/20 blur-3xl transition-all duration-1000 ${
            status === "connected" ? "opacity-100 scale-105" : "opacity-0 scale-50"
          }`} 
        />
        
        {isSpeaking && (
          <div className="absolute h-48 w-48 rounded-full border-2 border-primary/30 animate-ping" />
        )}

        <div 
          className={`relative z-20 flex h-40 w-48 items-center justify-center rounded-full border-2 border-border/50 shadow-sm transition-all duration-500 bg-background overflow-hidden ${
            status === "connected" 
              ? "border-primary/50 shadow-sm" 
              : "border-border/50 shadow-none"
          }`}
        >
          <div className="flex items-end justify-center space-x-1 h-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className={`w-1.5 bg-primary rounded-full transition-all duration-150 ${
                  isSpeaking 
                    ? "animate-pulse" 
                    : "h-2 opacity-30"
                }`}
                style={{ 
                  height: isSpeaking ? `${Math.random() * 40 + 10}px` : "8px",
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="z-30 flex flex-col items-center space-y-4">
        <Button
          size="lg"
          onClick={toggleCall}
          disabled={status === "connecting" || isConnecting}
          className={`h-16 w-16 rounded-full transition-all duration-300 shadow-sm ${
            status === "connected"
              ? "bg-destructive hover:opacity-90"
              : "bg-primary hover:opacity-90"
          }`}
        >
          {status === "connecting" || isConnecting ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : status === "connected" ? (
            <PhoneOff className="h-8 w-8" />
          ) : (
            <PhoneCall className="h-8 w-8" />
          )}
        </Button>
        
        <p className={`text-sm font-medium tracking-wide transition-colors duration-300 ${
          status === "connected" ? "text-primary animate-pulse" : "text-muted-foreground"
        }`}>
          {status === "connected" ? "Interviewing Live..." : "Click to Start Viva"}
        </p>
      </div>
    </div>
  );
});
