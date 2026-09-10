import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Check, Circle, ArrowRight, Clock3, FileText, Users } from "lucide-react"

// Static preview data — mirrors real Student Dashboard, no API
const preview = {
  projectTitle: "AI-Powered Academic Evaluation Platform",
  teamId: "TEAM-2024-CS-042",
  role: "Leader / Product Manager",
  currentPhase: "PHASE_2",
  progress: 67,
  phases: [
    { id: "team", step: "Team", title: "Team Setup", status: "completed" as const },
    { id: "phase1", step: "01", title: "Proposal", status: "completed" as const, score: 78 },
    { id: "phase2", step: "02", title: "Architecture", status: "current" as const, score: 84 },
    { id: "final", step: "03", title: "Showcase", status: "pending" as const },
    { id: "viva", step: "04", title: "Viva", status: "pending" as const },
  ],
  evaluation: {
    phase: "Architecture Review",
    score: 84,
    max: 100,
    status: "In review",
    verdict: "Refine",
    summary: "Your architecture is technically sound, but the data flow needs more clarity.",
    recommendation: "Add a clear explanation of how requests move between the API and database.",
  },
}

function PhaseDot({ status }: { status: "completed" | "current" | "pending" }) {
  if (status === "completed") {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
      >
        <Check className="h-3 w-3" />
      </span>
    )
  }
  if (status === "current") {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-primary/10"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card"
    >
      <Circle className="h-2.5 w-2.5 text-muted-foreground/40" />
    </span>
  )
}

export function ProductPreview() {
  return (
    <section
      aria-labelledby="product-preview-heading"
      className="border-t border-border bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Section heading — mirrors hero width/spacing */}
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="product-preview-heading"
            className="mx-auto max-w-[18ch] text-balance text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-[2.5rem]"
          >
            Project evaluation, organized in one place
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            A realistic preview of the student workspace — phases, progress, and feedback in a single dashboard.
          </p>
        </div>

        {/* Product frame — subtle depth, no neon/glass */}
        <div className="mx-auto mt-10 max-w-5xl sm:mt-12">
          {/* Outer subtle frame — neutral canvas depth */}
          <div className="rounded-[20px] border border-border bg-card p-2 sm:p-3 shadow-sm">
            {/* Inner dashboard — card surface */}
            <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
              {/* Dashboard top bar — mimics app header */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  </span>
                  <span className="hidden text-xs font-medium text-muted-foreground sm:inline">ProEval</span>
                  <span aria-hidden="true" className="hidden h-3 w-px bg-border sm:block" />
                  <span className="text-xs font-semibold tracking-tight text-foreground">Project Workspace</span>
                  <Badge variant="outline" className="hidden border-border bg-muted/40 px-2 py-0 text-[11px] font-medium sm:inline-flex">
                    Preview
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">{preview.progress}% Complete</span>
                  <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground">
                    {preview.progress}%
                  </span>
                </div>
              </div>

              {/* Desktop: sidebar + main | Mobile: stacked */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
                {/* Left — project + workflow (mobile: first) */}
                <div className="order-1 border-border bg-muted/[0.18] lg:border-r">
                  {/* Project header */}
                  <div className="border-b border-border px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          My Project
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
                          {preview.projectTitle}
                        </h3>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            <span className="font-mono font-medium text-foreground">{preview.teamId}</span>
                          </span>
                          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden="true" />
                          <span className="truncate">{preview.role}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Progress</span>
                        <span className="font-mono text-xs font-medium text-foreground">{preview.progress}%</span>
                      </div>
                      <Progress value={preview.progress} className="h-1.5 bg-muted" aria-label={`Project progress ${preview.progress} percent`} />
                      <p className="text-xs leading-relaxed text-muted-foreground">Phase 2 — Architecture — In Progress</p>
                    </div>
                  </div>

                  {/* Workflow */}
                  <div className="px-5 py-5 sm:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Workflow</p>
                    <ul className="mt-4 space-y-3" role="list" aria-label="Project phases">
                      {preview.phases.map((phase) => (
                        <li key={phase.id} className="flex items-center gap-3">
                          <PhaseDot status={phase.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "text-sm font-medium tracking-tight",
                                  phase.status === "pending" ? "text-muted-foreground" : "text-foreground",
                                ].join(" ")}
                              >
                                {phase.title}
                              </span>
                              {phase.score !== undefined && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                  {phase.score}/100
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {phase.status === "completed"
                                ? "Completed"
                                : phase.status === "current"
                                  ? "In progress"
                                  : "Pending"}
                              {phase.step !== "Team" ? ` · Step ${phase.step}` : ""}
                            </p>
                          </div>
                          {phase.status === "completed" && (
                            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Done</span>
                          )}
                          {phase.status === "current" && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* AI Guidance — actionable recommendation */}
                    <div className="mt-6 rounded-lg border border-border bg-card p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">AI Guidance</p>
                      <p className="mt-2 text-sm font-medium leading-snug text-foreground">“{preview.evaluation.summary}”</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Recommendation:</span> {preview.evaluation.recommendation}
                      </p>
                      <div className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-foreground px-3 text-xs font-semibold text-background">
                        View recommendation
                        <ArrowRight className="ml-1.5 h-3 w-3" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — evaluation + status */}
                <div className="order-2 min-w-0 bg-card">
                  {/* Evaluation header bar */}
                  <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Current evaluation</p>
                      <h3 className="mt-1 text-sm font-semibold tracking-tight text-foreground sm:text-base">
                        {preview.evaluation.phase}
                        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground sm:text-sm">
                          {preview.evaluation.score} / {preview.evaluation.max}
                        </span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-border bg-card font-mono text-xs">
                        {preview.evaluation.verdict}
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                        <Clock3 className="mr-1 h-3 w-3" aria-hidden="true" />
                        {preview.evaluation.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Grid inside main — keeps mobile readable (stacked) */}
                  <div className="grid gap-px bg-border">
                    {/* AI Feedback */}
                    <div className="bg-card px-5 py-5 sm:px-6 sm:py-6">
                      <h4 className="text-sm font-semibold tracking-tight text-foreground">AI Feedback</h4>
                      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
                        “{preview.evaluation.summary}”
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <Card className="border-border bg-muted/20 py-3" size="sm">
                          <CardContent className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Structure</p>
                            <p className="text-sm font-medium text-foreground">Well organized</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">Clear component boundaries.</p>
                          </CardContent>
                        </Card>
                        <Card className="border-amber-200 bg-amber-50/60 py-3 dark:border-amber-900/30 dark:bg-amber-950/20" size="sm">
                          <CardContent className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Attention</p>
                            <p className="text-sm font-medium text-foreground">Data flow</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">Needs more clarity.</p>
                          </CardContent>
                        </Card>
                        <Card className="border-border bg-muted/20 py-3" size="sm">
                          <CardContent className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recommendation</p>
                            <p className="text-sm font-medium text-foreground">Add explanation</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">API → Database flow.</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Status overview — mirrors real dashboard */}
                    <div className="grid grid-cols-1 divide-y divide-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      <div className="px-5 py-5 sm:px-6">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Where you are</p>
                        <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">Phase 2</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Architecture & Code — in progress</p>
                      </div>
                      <div className="px-5 py-5 sm:px-6">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          <li className="flex items-center gap-2 text-foreground">
                            <span className="h-1 w-1 rounded-full bg-foreground" aria-hidden="true" /> Enrollment
                          </li>
                          <li className="flex items-center gap-2 text-foreground">
                            <span className="h-1 w-1 rounded-full bg-foreground" aria-hidden="true" /> Team Setup
                          </li>
                          <li className="flex items-center gap-2 text-foreground">
                            <span className="h-1 w-1 rounded-full bg-foreground" aria-hidden="true" /> Proposal — 78/100
                          </li>
                        </ul>
                      </div>
                      <div className="bg-muted/30 px-5 py-5 sm:px-6">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Up next</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <li>Final Showcase</li>
                          <li>AI Technical Viva</li>
                        </ul>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Complete Phase 2 to unlock Final.</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer note — makes clear this is preview data */}
                  <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 sm:px-6">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Preview data</span> · Demonstration only · No live project connected
                    </p>
                    <span className="hidden font-mono text-xs text-muted-foreground sm:inline">TEAM-2024-CS-042 · Phase 2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Caption below preview */}
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-muted-foreground sm:text-sm">
            The actual workspace adapts to your role — leaders submit and manage phases, members track progress and feedback.
          </p>
        </div>
      </div>
    </section>
  )
}
