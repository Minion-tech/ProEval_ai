"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, PhoneCall, Loader2 } from "lucide-react";
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

  const isConnected = status === "connected";
  const isIdle = !isConnected && !isConnecting;

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Orb Visual */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div 
          className={`absolute h-72 w-72 rounded-full transition-all duration-1000 ${
            isConnected 
              ? "bg-primary/15 blur-3xl opacity-100 scale-100" 
              : "bg-primary/10 blur-3xl opacity-0 scale-75"
          }`} 
        />

        {/* Speaking rings */}
        {isSpeaking && (
          <>
            <div className="absolute h-52 w-52 rounded-full border border-primary/20 animate-[ping_2.5s_ease-in-out_infinite]" />
            <div className="absolute h-40 w-40 rounded-full border border-primary/15 animate-[ping_2s_ease-in-out_infinite_0.5s]" />
          </>
        )}

        {/* Main orb */}
        <div 
          className={`relative z-10 flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all duration-500 ${
            isConnected 
              ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-[0_0_40px_-8px] shadow-primary/20" 
              : isConnecting
              ? "border-border/60 bg-muted/30"
              : "border-border/40 bg-muted/20"
          }`}
        >
          {/* Audio visualizer bars */}
          <div className="flex items-end justify-center gap-[3px] h-10">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isConnected && isSpeaking
                    ? "bg-primary"
                    : isConnected
                    ? "bg-primary/40"
                    : "bg-muted-foreground/20"
                }`}
                style={{ 
                  height: isConnected && isSpeaking 
                    ? `${Math.random() * 32 + 8}px` 
                    : isConnected 
                    ? "6px" 
                    : "4px",
                  animationDelay: `${i * 0.08}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status + Call Button */}
      <div className="flex flex-col items-center gap-5">
        {/* Status text */}
        <div className="text-center">
          {isConnected ? (
            <p className="text-sm font-medium text-primary animate-pulse">
              Interview in progress
            </p>
          ) : isConnecting ? (
            <p className="text-sm font-medium text-muted-foreground">
              Connecting to AI interviewer...
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Press to begin your viva
            </p>
          )}
          {isConnected && (
            <p className="mt-1 text-xs text-muted-foreground">
              Speak clearly — the AI interviewer is listening
            </p>
          )}
        </div>

        {/* Call button */}
        <div className="relative">
          {/* Button glow */}
          {isConnected && (
            <div className="absolute inset-0 -m-1 rounded-full bg-destructive/20 blur-md animate-pulse" />
          )}
          <Button
            size="lg"
            onClick={toggleCall}
            disabled={status === "connecting" || isConnecting}
            className={`relative z-10 h-14 w-14 rounded-full transition-all duration-300 shadow-lg ${
              isConnected
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20"
                : isConnecting
                ? "bg-muted text-muted-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
            }`}
          >
            {status === "connecting" || isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isConnected ? (
              <PhoneOff className="h-5 w-5" />
            ) : (
              <PhoneCall className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mic indicator */}
        {isConnected && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5">
            <Mic className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">Mic active</span>
          </div>
        )}
      </div>
    </div>
  );
});
