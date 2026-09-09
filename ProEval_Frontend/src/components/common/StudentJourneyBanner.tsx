"use client";

import React from "react";
import Link from "next/link";

export interface StudentJourneyBannerProps {
  currentPhase?: string;
  isLeader?: boolean;
  latestStatus?: string;
  hasTeam?: boolean;
  className?: string;
}

export function StudentJourneyBanner({
  currentPhase = "NO_TEAM",
  isLeader = false,
  latestStatus,
  hasTeam = false,
  className = "",
}: StudentJourneyBannerProps) {
  const phaseLower = (currentPhase || "").toLowerCase();

  let p1Done = false;
  let p2Done = false;
  let finalDone = false;
  const interviewDone = false;

  if (phaseLower.includes("phase_2") || phaseLower.includes("phase 2")) {
    p1Done = true;
  } else if (phaseLower.includes("final") || phaseLower.includes("completed")) {
    p1Done = true;
    p2Done = true;
  }

  if (latestStatus === "COMPLETED" && (phaseLower.includes("final") || phaseLower.includes("completed"))) {
    finalDone = true;
  }

  const steps = [
    {
      id: "team",
      label: "Team",
      title: "Team Setup",
      href: hasTeam ? "/student/my-team" : "/student/team",
      isDone: hasTeam,
      isCurrent: !hasTeam,
    },
    {
      id: "phase1",
      label: "01",
      title: "Proposal",
      href: isLeader ? "/student/submit/phase1" : "/student/my-team",
      isDone: p1Done,
      isCurrent: hasTeam && !p1Done && !phaseLower.includes("phase_2") && !phaseLower.includes("final"),
    },
    {
      id: "phase2",
      label: "02",
      title: "Architecture",
      href: isLeader ? "/student/submit/phase2" : "/student/my-team",
      isDone: p2Done,
      isCurrent: p1Done && !p2Done,
    },
    {
      id: "final",
      label: "03",
      title: "Showcase",
      href: isLeader ? "/student/submit/final" : "/student/my-team",
      isDone: finalDone,
      isCurrent: p2Done && !finalDone,
    },
    {
      id: "interview",
      label: "04",
      title: "Viva",
      href: "/student/feedback",
      isDone: interviewDone,
      isCurrent: finalDone,
    },
  ];

  let nextActionText = "Create or join a team to start";
  let nextActionHref = "/student/team";
  let nextActionLabel = "Team Setup";

  if (!hasTeam) {
    nextActionText = "Create a new team as leader or join with a Team ID";
    nextActionHref = "/student/team";
    nextActionLabel = "Team Setup";
  } else if (!p1Done) {
    if (latestStatus === "AWAITING_CLARIFICATION") {
      nextActionText = "Clarification requested on your Phase 1 proposal";
      nextActionHref = "/student/submit/phase1";
      nextActionLabel = "Answer Questions";
    } else {
      nextActionText = isLeader
        ? "Submit Phase 1 concept for review"
        : "Waiting for leader to submit Phase 1";
      nextActionHref = isLeader ? "/student/submit/phase1" : "/student/my-team";
      nextActionLabel = isLeader ? "Submit Phase 1" : "View Team";
    }
  } else if (!p2Done) {
    nextActionText = isLeader ? "Submit Phase 2 repository and notes" : "Phase 1 complete — track Phase 2";
    nextActionHref = isLeader ? "/student/submit/phase2" : "/student/feedback";
    nextActionLabel = isLeader ? "Submit Phase 2" : "View Feedback";
  } else if (!finalDone) {
    nextActionText = isLeader ? "Submit final showcase deliverables" : "Phase 2 complete — prepare showcase";
    nextActionHref = isLeader ? "/student/submit/final" : "/student/feedback";
    nextActionLabel = isLeader ? "Submit Final" : "View Feedback";
  } else {
    nextActionText = "All phases complete — take the Technical Viva";
    nextActionHref = "/student/feedback";
    nextActionLabel = "Go to Viva";
  }

  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Project Journey
          </p>
          <p className="text-sm font-medium text-foreground">
            {hasTeam ? `Current phase — ${currentPhase.replace(/_/g, " ")}` : "No team yet — start with Team Setup"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden max-w-[280px] truncate text-xs leading-relaxed text-muted-foreground sm:block">
            {nextActionText}
          </p>
          <Link
            href={nextActionHref}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {nextActionLabel}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border bg-border md:grid-cols-5">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={[
              "flex flex-col gap-2 bg-card px-4 py-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              step.isCurrent ? "bg-muted/40" : "",
              step.isDone ? "" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {step.label}
              </span>
              {step.isDone ? (
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" />
              ) : step.isCurrent ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-border" aria-hidden="true" />
              )}
            </div>
            <span
              className={[
                "text-sm font-semibold tracking-tight",
                step.isCurrent ? "text-foreground" : step.isDone ? "text-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {step.title}
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {step.isDone ? "Completed" : step.isCurrent ? "In progress" : "Pending"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
