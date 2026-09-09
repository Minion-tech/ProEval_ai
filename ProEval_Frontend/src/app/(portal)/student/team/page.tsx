"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TestUserWorkspace from "@/components/test-user/TestUserWorkspace";
import { StudentJourneyBanner } from "@/components/common/StudentJourneyBanner";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import { ArrowRight, Loader2 } from "lucide-react";

export default function StudentTeamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const isTestUser = isTestUserEmail(user?.email);

  useEffect(() => {
    if (authLoading || !user || isTestUser) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await projectService.getMyProject({ testMode: false });
        if (response.data?.project) {
          router.replace("/student/my-team");
          return;
        }
      } catch (err) {
        console.error("Failed to check project status:", err);
      }
      setLoading(false);
    };

    checkStatus();
  }, [authLoading, isTestUser, router, user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isTestUser) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <TestUserWorkspace />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="space-y-10 md:space-y-12">
        <StudentJourneyBanner currentPhase="NO_TEAM" hasTeam={false} />

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 01 — Team Setup
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Team Setup
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Work in teams of 1–3. Create a new team as leader or join an existing team with a Team ID.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col border border-border bg-card">
            <div className="space-y-4 p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Leader path
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Create a new team</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Start a new project, submit the Phase 1 proposal and receive a Team ID to invite teammates.
              </p>
              <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Complete Phase 1 proposal — title, abstract and tech stack</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Receive a Team ID to share</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Continue through Phase 2 and Final as leader</span>
                </li>
              </ul>
            </div>
            <div className="mt-auto border-t border-border p-6 md:p-7">
              <Button asChild className="group w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                <Link href="/student/enrollment" className="inline-flex items-center justify-center gap-1.5">
                  Create Team
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col border border-border bg-card">
            <div className="space-y-4 p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Member path
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Join an existing team</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Join a team created by a classmate. Enter the Team ID and record your role.
              </p>
              <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Obtain the Team ID from your leader</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Specify role, modules and responsibilities</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span>Access shared feedback and prepare for Viva</span>
                </li>
              </ul>
            </div>
            <div className="mt-auto border-t border-border p-6 md:p-7">
              <Button asChild variant="outline" className="group w-full border-border font-medium">
                <Link href="/student/team/join" className="inline-flex items-center justify-center gap-1.5">
                  Join with Team ID
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        <section className="rounded-xl border border-border bg-muted/30 px-6 py-6 md:px-7">
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          <dl className="mt-4 space-y-3 text-sm leading-relaxed">
            <div>
              <dt className="font-medium text-foreground">Team ID</dt>
              <dd className="text-muted-foreground">
                A short identifier generated when a leader creates a team, e.g. <span className="font-mono text-xs text-foreground">TEAM-2026-X89K</span>.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Working alone</dt>
              <dd className="text-muted-foreground">A leader may work solo and complete all phases as a team of one.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Changing teams</dt>
              <dd className="text-muted-foreground">View roster and feedback anytime under My Team.</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
