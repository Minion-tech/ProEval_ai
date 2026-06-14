"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminService } from "@/lib/admin-service";
import { Loader2, Trash2, AlertCircle } from "lucide-react";

interface ProjectRow {
  id: string;
  team_id: string;
  title: string;
  current_phase: string;
  admin_status: string;
  academic_year: string;
  semester: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsRes = await adminService.getProjects();
      
      const mappedProjects = (projectsRes.data as any[]).map(p => ({
        id: p.id,
        team_id: p.team_id,
        title: p.phase_1_data?.title || "Untitled",
        current_phase: p.current_phase,
        admin_status: p.admin_status,
        academic_year: p.academic_year,
        semester: p.semester
      }));

      setProjects(mappedProjects);
    } catch (err) {
      console.error("Failed to fetch admin projects:", err);
      setError("Failed to load projects. Please ensure you are logged in as Project Coordinator.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This will reset the student's dashboard and allow them to submit a new project.")) return;

    try {
      setDeleting(projectId);
      await adminService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete project.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading institution projects...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Institution Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage all student project submissions and monitor the automated evaluation process.
            </p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            {projects.length} Active Projects
          </Badge>
        </div>

        {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Submissions</CardTitle>
            <CardDescription>Monitor project lifecycles and automated evaluations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b text-muted-foreground font-bold">
                  <tr>
                    <th className="px-2 py-4 font-medium">Team ID</th>
                    <th className="px-2 py-4 font-medium">Project Title</th>
                    <th className="px-2 py-4 font-medium">Phase</th>
                    <th className="px-2 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-2 py-4">
                        <span className="font-mono font-bold text-primary">{item.team_id}</span>
                      </td>
                      <td className="px-2 py-4 max-w-[300px] truncate font-medium" title={item.title}>
                        {item.title}
                      </td>
                      <td className="px-2 py-4">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                          {item.current_phase.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-2 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-9 px-3 gap-1"
                            disabled={deleting === item.id}
                            onClick={() => handleDelete(item.id)}
                          >
                            {deleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && !loading && (
                      <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground italic">
                              No active project submissions found.
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
