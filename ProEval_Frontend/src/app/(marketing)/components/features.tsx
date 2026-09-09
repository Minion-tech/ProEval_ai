import { Card, CardContent } from "@/components/ui/card"

export function FeatureCard({
  icon: Icon,
  title,
  description,
  number,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  number: string
}) {
  return (
    <Card className="group border-border bg-card py-0 transition-colors duration-200 hover:border-foreground/10">
      <CardContent className="p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary" aria-hidden="true">
            {number}
          </span>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground transition-colors duration-200 group-hover:border-foreground/10 group-hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
