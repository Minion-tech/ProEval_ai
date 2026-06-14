"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle } from "lucide-react";
import { adminService, type AdminOverview, type AdminEvaluationRecord } from "@/lib/admin-service";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [recentEvaluations, setRecentEvaluations] = useState<AdminEvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [overviewRes, evaluationsRes] = await Promise.all([
          adminService.getOverview(),
          adminService.getEvaluations()
        ]);
        
        setOverview(overviewRes.data);
        setRecentEvaluations(evaluationsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Could not load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const overviewCards = [
    { label: "Total Students", value: overview?.total_students?.toLocaleString() || "0" },
    { label: "Active Projects", value: overview?.active_projects?.toLocaleString() || "0" },
    { label: "Unresolved Flags", value: overview?.unresolved_flags?.toLocaleString() || "0" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Coordinator Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Simple institution-wide snapshot for the current semester.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((item) => (
            <Card key={item.label}>
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-3xl">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Completion</CardTitle>
              <CardDescription>Current semester progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Phase 1</span>
                  <span className="text-muted-foreground">92%</span>
                </div>
                <Progress value={92} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Phase 2</span>
                  <span className="text-muted-foreground">64%</span>
                </div>
                <Progress value={64} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Final</span>
                  <span className="text-muted-foreground">18%</span>
                </div>
                <Progress value={18} />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Recent Evaluations</CardTitle>
            <CardDescription>Latest institution-wide evaluation activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Evaluation ID</th>
                    <th className="px-2 py-2 font-medium">Project</th>
                    <th className="px-2 py-2 font-medium">Phase</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvaluations.length > 0 ? (
                    recentEvaluations.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{item.id.split('-')[0].toUpperCase()}</td>
                        <td className="px-2 py-3">{item.project_title}</td>
                        <td className="px-2 py-3">{item.phase.replace('_', ' ')}</td>
                        <td className="px-2 py-3">
                          <Badge variant={item.status === "FAILED" ? "destructive" : "outline"}>{item.status}</Badge>
                        </td>
                        <td className="px-2 py-3">{item.total_score || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">
                        No recent evaluations found.
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
