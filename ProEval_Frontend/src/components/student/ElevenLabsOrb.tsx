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

  // Explicitly end session if parent requests it
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
      if (isConnecting) return; // Prevent double trigger
      
      try {
        setIsConnecting(true);

        // 1. Generate a unique session token
        const sessionToken = `session_${Math.random().toString(36).substring(2, 15)}`;
        
        // 2. Register this session with our backend so the Tool Webhook knows the real submission ID
        try {
          await apiClient.post("/integrations/register-session", {
            submission_id: submissionId,
            session_token: sessionToken
          });
          console.log("[ElevenLabs] Session mapped successfully:", sessionToken);
        } catch (regError) {
          console.error("[ElevenLabs] Failed to register session mapping:", regError);
          // We will proceed anyway and hope the AI passes it correctly as a fallback
        }

        console.log("[ElevenLabs] Starting session for Agent ID:", agentId);
        
        // 3. Start the ElevenLabs call
        await conversation.startSession({
          agentId: agentId,
          dynamicVariables: {
            submission_id: submissionId || "",
            session_token: sessionToken, // Pass the token so the backend can look it up
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

  // Determine the status and color of the orb
  const isSpeaking = conversation.isSpeaking;
  const status = conversation.status;

  // Add an effect to log status changes for easier debugging
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
      {/* The Orb Visualization */}
      <div className="relative flex items-center justify-center">
        {/* Outer Glows */}
        <div 
          className={`absolute h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl transition-all duration-1000 ${
            status === "connected" ? "opacity-100 scale-110" : "opacity-0 scale-50"
          }`} 
        />
        
        {/* Animated Rings when speaking */}
        {isSpeaking && (
          <div className="absolute h-48 w-48 rounded-full border-2 border-indigo-400/30 animate-ping" />
        )}

        {/* The Core Orb */}
        <div 
          className={`relative z-20 flex h-40 w-48 items-center justify-center rounded-full border-2 border-white/10 shadow-2xl transition-all duration-500 bg-neutral-900 overflow-hidden ${
            status === "connected" 
              ? "border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.4)]" 
              : "border-white/5 shadow-none"
          }`}
        >
          <div className="flex items-end justify-center space-x-1 h-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className={`w-1.5 bg-indigo-400 rounded-full transition-all duration-150 ${
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

      {/* Call Controls */}
      <div className="z-30 flex flex-col items-center space-y-4">
        <Button
          size="lg"
          onClick={toggleCall}
          disabled={status === "connecting" || isConnecting}
          className={`h-16 w-16 rounded-full transition-all duration-300 shadow-xl ${
            status === "connected"
              ? "bg-red-500 hover:bg-red-600 scale-110"
              : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
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
          status === "connected" ? "text-indigo-400 animate-pulse" : "text-white/40"
        }`}>
          {status === "connected" ? "Interviewing Live..." : "Click to Start Viva"}
        </p>
      </div>
    </div>
  );
});
