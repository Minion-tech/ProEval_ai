import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect"
import { ParallaxHeroImages } from "@/components/ui/parallax-hero-images"
import { PointerHighlight } from "@/components/ui/pointer-highlight"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  IconBrain,
  IconTimeline,
  IconRocket,
  IconDeviceAnalytics,
  IconCircleCheck,
  IconArrowRight,
} from "@tabler/icons-react"

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523240715639-99a8082fb18e?q=80&w=2071&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1573161158365-59b814b3d9b1?q=80&w=2069&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6 text-center shrink-0">
        <div className="absolute inset-0 z-0">
          <BackgroundRippleEffect rows={15} cols={30} cellSize={64} />
        </div>

        <ParallaxHeroImages
          images={HERO_IMAGES}
          className="z-10 opacity-40 dark:opacity-30"
        />

        <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center gap-8">
          <PointerHighlight containerClassName="mx-auto">
            <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border shadow-xl">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ProEval AI
              </h1>
            </div>
          </PointerHighlight>

          <div className="bg-background/60 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-2xl max-w-2xl mx-auto">
            <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed">
              The ultimate platform for project evaluation and student progress
              tracking. Streamline your academic journey with{" "}
              <span className="text-foreground font-bold underline decoration-primary decoration-4 underline-offset-4">
                AI-powered insights
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
            <Button
              asChild
              size="lg"
              className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
            >
              <Link href="/login">Get Started Now</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all active:scale-95"
            >
              <Link href="/student">Student Portal</Link>
            </Button>
          </div>

          <div className="mt-16 flex flex-col items-center gap-6" suppressHydrationWarning>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">The Innovation Ecosystem</p>
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24">
              <div className="flex flex-col items-center group cursor-default">
                <div className="text-4xl md:text-5xl font-black tracking-tighter text-neutral-900 dark:text-white group-hover:scale-110 transition-transform duration-500">1.2K+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2 group-hover:text-primary transition-colors">Evaluations Completed</div>
              </div>
              <div className="flex flex-col items-center group cursor-default">
                <div className="text-4xl md:text-5xl font-black tracking-tighter text-neutral-900 dark:text-white group-hover:scale-110 transition-transform duration-500">450+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2 group-hover:text-primary transition-colors">Innovation Teams</div>
              </div>
              <div className="flex flex-col items-center group cursor-default">
                <div className="text-4xl md:text-5xl font-black tracking-tighter text-neutral-900 dark:text-white group-hover:scale-110 transition-transform duration-500">85+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2 group-hover:text-primary transition-colors">IPs &amp; Patents Filed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-slate-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why Choose ProEval AI?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our platform empowers students with
              intelligent automation and real-time project tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={IconBrain}
              title="AI Analysis"
              description="Automated project evaluation using advanced AI models to provide instant, unbiased feedback."
            />
            <FeatureCard
              icon={IconTimeline}
              title="Phase Tracking"
              description="Monitor every stage of the project lifecycle from enrollment to final submission."
            />
            <FeatureCard
              icon={IconRocket}
              title="Fast Progression"
              description="Automated coordination allows for rapid advancement through project phases without delays."
            />
            <FeatureCard
              icon={IconDeviceAnalytics}
              title="Deep Insights"
              description="Comprehensive performance reports and analytics for both departments and individuals."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold mb-6">How ProEval AI Works</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                We&apos;ve simplified the complex project evaluation process into
                three clear, actionable steps. Our goal is to let you focus on
                innovation while we handle the management.
              </p>

              <div className="space-y-6">
                <StepItem
                  number="01"
                  title="Enroll & Register Project"
                  description="Register your project domain and provide key objectives for the coordination team."
                />
                <StepItem
                  number="02"
                  title="Phased Submissions"
                  description="Upload your work in organized phases. Get AI-powered preliminary scores and coordinator feedback."
                />
                <StepItem
                  number="03"
                  title="Final Evaluation"
                  description="Complete your final review with consolidated reports and clear achievement metrics."
                />
              </div>

              <div className="mt-10">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Create Your Account <IconArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-indigo-500/20 rounded-3xl border border-primary/10 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-200/[0.1] bg-[center_top_-1px] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
                <div className="z-10 p-8 space-y-4 w-full max-w-md">
                  <Card className="shadow-2xl translate-x-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Team Alpha - Phase 2</CardTitle>
                      <CardDescription>AI Evaluation in progress...</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full w-[85%] bg-primary animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-2xl -translate-x-4 bg-primary text-primary-foreground">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Feedback Received</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs opacity-90">
                        &quot;Excellent progress on the backend architecture. Ensure
                        the API documentation is updated.&quot;
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-primary rounded-[3rem] p-12 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />

          <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">
            Ready to transform your project evaluation experience?
          </h2>
          <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto relative z-10">
            Join hundreds of students who are already using
            ProEval AI to excel in their academic journeys.
          </p>
          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <Button variant="secondary" size="lg" asChild className="rounded-full px-8">
              <Link href="/register">Get Started for Free</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full px-8 bg-transparent text-white border-white/30 hover:bg-white/10"
            >
              <Link href="/login">Portal Login</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-none bg-white dark:bg-neutral-900">
      <CardHeader>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepItem({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-6 group">
      <div className="text-4xl font-black text-primary/10 group-hover:text-primary/30 transition-colors duration-300 select-none">
        {number}
      </div>
      <div>
        <h4 className="text-xl font-bold mb-1 flex items-center">
          {title}
          <IconCircleCheck className="ml-2 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </h4>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
