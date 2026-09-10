import { Users, FileText, Layers, Package, Mic } from "lucide-react"

export function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="group flex items-start gap-4 py-4">
      <span className="shrink-0 text-2xl font-bold tracking-[-0.02em] text-primary/20 transition-colors duration-200 group-hover:text-primary/35">
        {number}
      </span>
      <div>
        <h4 className="mb-1 text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
          {title}
        </h4>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

const steps = [
  {
    number: "01",
    title: "Team Setup",
    description: "Form or join your project team and define roles to create your workspace.",
    icon: Users,
  },
  {
    number: "02",
    title: "Phase 1 — Proposal",
    description: "Submit your project concept and technology stack for structured evaluation.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Phase 2 — Architecture",
    description: "Develop and document your system architecture and code with feedback.",
    icon: Layers,
  },
  {
    number: "04",
    title: "Final Submission",
    description: "Submit complete deliverables and demo for final evaluation.",
    icon: Package,
  },
  {
    number: "05",
    title: "AI Technical Viva",
    description: "Complete a 5-minute AI-powered technical assessment to close the journey.",
    icon: Mic,
  },
]

export function Workflow() {
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-heading"
      className="border-t border-border bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="max-w-3xl">
          <h2
            id="workflow-heading"
            className="text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl"
          >
            How a project moves through ProEval
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Five clear stages — from team formation to technical viva — in one connected workspace.
          </p>
        </div>

        {/* Desktop: horizontal editorial stepper */}
        <div className="relative mt-12 hidden lg:block">
          {/* Connector line behind numbers */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[32px] right-[32px] top-[36px] h-px bg-border"
          />
          <ol className="relative grid grid-cols-5 gap-4 xl:gap-5" aria-label="ProEval project workflow">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <li
                  key={step.number}
                  className="group relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-200 hover:border-border hover:bg-card"
                >
                  {/* Number + icon row */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">{step.number}</span>
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground transition-colors duration-200 group-hover:border-foreground/10 group-hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* Large prominent number */}
                  <span
                    aria-hidden="true"
                    className="mt-3 text-4xl font-bold leading-none tracking-[-0.04em] text-foreground/[0.07] transition-colors duration-200 group-hover:text-foreground/[0.10] xl:text-[2.75rem]"
                  >
                    {step.number}
                  </span>

                  <h3 className="mt-4 text-sm font-semibold leading-tight tracking-tight text-foreground xl:text-[15px]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>

                  {/* Connector dot on line */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-[7px] left-8 h-[11px] w-[11px] rounded-full border-2 border-background bg-foreground shadow-sm"
                  />
                </li>
              )
            })}
          </ol>
        </div>

        {/* Mobile + tablet: vertical timeline */}
        <div className="relative mt-10 lg:hidden">
          {/* Vertical line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-6 left-[19px] top-6 w-px bg-border sm:left-[23px]"
          />
          <ol className="grid gap-4 sm:gap-5" aria-label="ProEval project workflow">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <li
                  key={step.number}
                  className="group relative flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors duration-200 hover:border-border sm:gap-5 sm:p-6"
                >
                  {/* Left rail: dot + number */}
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      aria-hidden="true"
                      className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-200 group-hover:border-foreground/15 group-hover:text-foreground sm:h-11 sm:w-11"
                    >
                      <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    </span>
                    <span className="mt-2 text-[11px] font-semibold tracking-widest text-primary">{step.number}</span>
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <h3 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-muted-foreground sm:mt-10 sm:text-sm">
          Each stage unlocks the next — with feedback that guides your submission, not just a score.
        </p>
      </div>
    </section>
  )
}
