"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TestUserWorkspace from "@/components/test-user/TestUserWorkspace";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/lib/project-service";
import { isTestUserEmail } from "@/lib/portal-mode";
import { Eye, Loader2, Plus, UserPlus, Users } from "lucide-react";

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
          // Keep loading true while redirecting to avoid flashing the initial UI
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isTestUser) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-12">
        <TestUserWorkspace />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Team Management</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start your project evaluation journey here. Choose whether you want to lead a new team or join an existing one.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-bl-full"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Create New Team</CardTitle>
              </div>
              <CardDescription className="text-base">
                Start a new project team as the leader, submit Phase 1, and invite members to join later with the generated team ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Submit the Phase 1 proposal as team leader</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Share the generated Team ID with your members</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Continue through Phase 2 and Final when feedback unlocks them</span>
                </li>
              </ul>
              <Link href="/student/enrollment" className="block">
                <Button className="w-full" size="lg">
                  <Users className="mr-2 h-4 w-4" />
                  Create Team
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:border-green-300 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-bl-full"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Join Existing Team</CardTitle>
              </div>
              <CardDescription className="text-base">
                Join a team created by your leader, contribute under your own login, and see the same shared project feedback as the rest of the group.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Enter the Team ID shared by your leader</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Describe your role, modules, and contribution plan</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>View ideator and architect feedback together with your team</span>
                </li>
              </ul>
              <Link href="/student/team/join" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Team
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p><strong>Team Leader:</strong> creates the team and submits Phase 1, Phase 2, and Final payloads.</p>
            <p><strong>Team Members:</strong> join with the Team ID, contribute under their own accounts, and can see the shared feedback trail.</p>
            <p><strong>Team Size:</strong> up to 3 members total.</p>
            <p><strong>Shared Feedback:</strong> ideator feedback appears after Phase 1, and architect feedback appears when the team is fully formed.</p>
          </CardContent>
        </Card>

        <Card className="mt-8 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Eye className="mr-2 h-5 w-5 text-purple-600" />
              Already Part of a Team?
            </CardTitle>
            <CardDescription>
              If you already created or joined a team, continue from your shared team space.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student/my-team">
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                <Eye className="mr-2 h-4 w-4" />
                View My Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
