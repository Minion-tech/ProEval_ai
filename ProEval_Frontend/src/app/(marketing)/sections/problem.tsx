import { Card, CardContent } from "@/components/ui/card"

const problems = [
  {
    n: "01",
    title: "Fragmented Evaluation",
    desc: "Project evaluation is spread across disconnected stages without a single workspace.",
  },
  {
    n: "02",
    title: "Unclear Progress",
    desc: "Students don't always know what comes next or where their project stands.",
  },
  {
    n: "03",
    title: "Delayed Feedback",
    desc: "Feedback arrives too late to meaningfully improve the next submission.",
  },
  {
    n: "04",
    title: "Disconnected Stages",
    desc: "Team setup, submissions, evaluation, and viva can feel like separate tools.",
  },
]

export function Problem() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="border-t border-border bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-3xl">
          <h2
            id="problem-heading"
            className="text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl"
          >
            The Problem
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Traditional project evaluation is fragmented. Unclear workflows, late feedback, and disconnected stages make
            it hard to move forward with confidence.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:gap-5">
          {problems.map((p) => (
            <Card key={p.n} className="border-border bg-card py-0 shadow-sm">
              <CardContent className="p-6 sm:p-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary" aria-hidden="true">
                  {p.n}
                </span>
                <h3 className="mt-3 text-base font-semibold leading-tight tracking-tight text-foreground sm:text-[15px]">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 max-w-3xl border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground sm:pl-5">
          ProEval was designed to replace that friction with one coherent journey — where each stage connects to the next.
        </p>
      </div>
    </section>
  )
}
