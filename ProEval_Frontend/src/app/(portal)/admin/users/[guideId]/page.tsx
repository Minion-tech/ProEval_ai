"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminService } from "@/lib/admin-service";
import { Loader2, ArrowLeft } from "lucide-react";

interface StudentProjectUnderGuide {
  semester: number;
  academic_year: string;
  team_id: string;
  student_leader: string;
  teammates: string[];
  topic_name: string;
  current_phase: string;
  phase_1_submitted: boolean;
  phase_2_submitted: boolean;
  final_submitted: boolean;
}

interface GuideProfile {
  id: string;
  name: string;
  email: string;
  department: string | null | undefined;
  specialization: string | null | undefined;
  is_active: boolean;
  projects: StudentProjectUnderGuide[];
}

export default function GuideProfilePage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const resolvedParams = use(params);
  const guideId = resolvedParams.guideId;
  const [data, setData] = useState<GuideProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const response = await adminService.getGuideProfile(guideId);
        setData(response.data);
      } catch (err) {
        console.error("Failed to load guide profile:", err);
        setError("Could not load faculty profile. It may not exist.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [guideId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error || "Profile Not Found"}</h2>
        <Button asChild>
          <Link href="/admin/users">Back to Users</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10 max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Faculty View Profile</h1>
            <p className="text-sm text-muted-foreground">
              Full guide profile and student team project information.
            </p>
          </div>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Link>
          </Button>
        </div>

        <Card className="border-2 shadow-sm">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-2xl">{data.name}</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest">Guide ID: {data.id}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4 p-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Email Address</p>
              <p className="font-medium text-primary">{data.email}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Department</p>
              <p className="font-medium">{data.department || "N/A"}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Specialization</p>
              <p className="font-medium">{data.specialization || "General"}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Status</p>
              <Badge variant={data.is_active ? "default" : "secondary"}>
                {data.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Badge className="rounded-full h-6 w-6 flex items-center justify-center p-0">{data.projects.length}</Badge>
              Assigned Teams
            </CardTitle>
            <CardDescription>
              Detailed list of student projects currently under this faculty's supervision.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-muted/50 border-b text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Academic Year / Sem</th>
                    <th className="px-6 py-4">Team ID</th>
                    <th className="px-6 py-4">Leader / Topic</th>
                    <th className="px-6 py-4">Teammates</th>
                    <th className="px-6 py-4">Current Phase</th>
                    <th className="px-6 py-4">Submissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.projects.length > 0 ? (
                    data.projects.map((item) => (
                      <tr key={`${item.team_id}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-medium">{item.academic_year}</p>
                          <p className="text-xs text-muted-foreground italic">Semester {item.semester}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono bg-background">{item.team_id}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-primary">{item.topic_name}</p>
                          <p className="text-xs text-muted-foreground">Lead by: {item.student_leader}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.teammates.length > 0 ? (
                               item.teammates.map((tm, idx) => (
                                 <Badge key={idx} variant="secondary" className="text-[10px] py-0">{tm}</Badge>
                               ))
                            ) : <span className="text-xs text-muted-foreground italic">Solo Project</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-50">
                            {item.current_phase.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex gap-2">
                             <div className={`h-2.5 w-2.5 rounded-full ${item.phase_1_submitted ? 'bg-green-500' : 'bg-gray-200'}`} title="Phase 1" />
                             <div className={`h-2.5 w-2.5 rounded-full ${item.phase_2_submitted ? 'bg-green-500' : 'bg-gray-200'}`} title="Phase 2" />
                             <div className={`h-2.5 w-2.5 rounded-full ${item.final_submitted ? 'bg-green-500' : 'bg-gray-200'}`} title="Final" />
                           </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        No student teams currently assigned to this guide.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
