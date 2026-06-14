"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { EvaluationDetailModal } from "@/components/admin/EvaluationDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminService, type AdminEvaluationRecord } from "@/lib/admin-service";

interface EvaluationRow {
  id: string;
  evaluationId: string;
  submissionId: string;
  project: string;
  teamId: string;
  teamLeaderName: string;
  semester: number;
  phase: "Phase 1" | "Phase 2" | "Final" | "AI Interview";
  status: string;
  score: number | null;
  grade?: string | null;
  evaluatedAt: string;
}

const phaseLabels: Record<string, EvaluationRow["phase"]> = {
  PHASE_1: "Phase 1",
  PHASE_2: "Phase 2",
  FINAL: "Final",
  INTERVIEW: "AI Interview",
};

function mapEvaluationRow(item: AdminEvaluationRecord): EvaluationRow {
  return {
    id: item.id,
    evaluationId: item.id,
    submissionId: item.submission_id,
    project: item.project_title || "Untitled",
    teamId: item.team_id || "N/A",
    teamLeaderName: item.team_leader_name || "Unknown",
    semester: item.semester || 0,
    phase: phaseLabels[item.phase] || "Phase 1",
    status: item.status,
    score: item.total_score ?? null,
    grade: item.grade,
    evaluatedAt: item.created_at,
  };
}

export default function AdminEvaluationsPage() {
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [rawEvaluations, setRawEvaluations] = useState<AdminEvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "scoreHigh" | "scoreLow" | "semesterHigh" | "semesterLow"
  >("newest");

  useEffect(() => {
    let cancelled = false;

    async function fetchEvaluations() {
      try {
        setLoading(true);
        setError(null);
        const res = await adminService.getEvaluations();
        if (cancelled) return;
        setRawEvaluations(res.data);
        setRows(res.data.map(mapEvaluationRow));
      } catch (err) {
        console.error("Failed to fetch admin evaluations:", err);
        if (!cancelled) setError("Failed to load evaluations. Please ensure the backend is running and you are logged in as Project Coordinator.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvaluations();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!window.confirm("Are you sure you want to delete this evaluation? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(evaluationId);
      await adminService.deleteEvaluation(evaluationId);
      // Remove from rows
      setRows(rows.filter((row) => row.evaluationId !== evaluationId));
      setRawEvaluations(rawEvaluations.filter((evaluation) => evaluation.id !== evaluationId));
    } catch (err) {
      console.error("Failed to delete evaluation:", err);
      alert("Failed to delete evaluation. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const semesters = useMemo(
    () => Array.from(new Set(rows.map((row) => row.semester))).sort((a, b) => a - b),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const lowered = search.trim().toLowerCase();

    const visibleRows = rows.filter((row) => {
      const matchSemester = semesterFilter === "all" || String(row.semester) === semesterFilter;
      const matchPhase = phaseFilter === "all" || row.phase === phaseFilter;
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      const matchSearch =
        lowered.length === 0 ||
        row.id.toLowerCase().includes(lowered) ||
        row.teamId.toLowerCase().includes(lowered) ||
        row.teamLeaderName.toLowerCase().includes(lowered) ||
        row.project.toLowerCase().includes(lowered);

      return matchSemester && matchPhase && matchStatus && matchSearch;
    });

    return visibleRows.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime();
      }
      if (sortBy === "scoreHigh") {
        return (b.score ?? -1) - (a.score ?? -1);
      }
      if (sortBy === "scoreLow") {
        return (a.score ?? Number.MAX_SAFE_INTEGER) - (b.score ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortBy === "semesterHigh") {
        return b.semester - a.semester;
      }
      return a.semester - b.semester;
    });
  }, [phaseFilter, rows, search, semesterFilter, sortBy, statusFilter]);

  const selectedProjectTitle = selectedEvaluation?.project || rawEvaluations.find(
    (item) => item.submission_id === selectedEvaluation?.submissionId
  )?.project_title;

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluation Oversight</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recent evaluations from live project submissions.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Evaluation Queue</CardTitle>
            <CardDescription>Institution-wide records with filtering and sorting controls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Team ID, Leader, Project"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map((semester) => (
                      <SelectItem key={semester} value={String(semester)}>
                        Semester {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phase</Label>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Phases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="Phase 1">Phase 1</SelectItem>
                    <SelectItem value="Phase 2">Phase 2</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                    <SelectItem value="AI Interview">AI Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest Evaluation</SelectItem>
                    <SelectItem value="oldest">Oldest Evaluation</SelectItem>
                    <SelectItem value="scoreHigh">Score: High to Low</SelectItem>
                    <SelectItem value="scoreLow">Score: Low to High</SelectItem>
                    <SelectItem value="semesterHigh">Semester: High to Low</SelectItem>
                    <SelectItem value="semesterLow">Semester: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Team ID</th>
                    <th className="px-2 py-2 font-medium">Team Leader</th>
                    <th className="px-2 py-2 font-medium">Project</th>
                    <th className="px-2 py-2 font-medium">Semester</th>
                    <th className="px-2 py-2 font-medium">Phase</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Score</th>
                    <th className="px-2 py-2 font-medium">Evaluated On</th>
                    <th className="px-2 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading live evaluations...
                        </div>
                      </td>
                    </tr>
                  ) : filteredRows.length > 0 ? (
                    filteredRows.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-2 py-3 font-mono text-xs">{item.teamId}</td>
                        <td className="px-2 py-3">{item.teamLeaderName}</td>
                        <td className="px-2 py-3">{item.project}</td>
                        <td className="px-2 py-3">{item.semester}</td>
                        <td className="px-2 py-3">{item.phase}</td>
                        <td className="px-2 py-3">
                          <Badge variant={item.status === "FAILED" ? "destructive" : "outline"}>{item.status}</Badge>
                        </td>
                        <td className="px-2 py-3">{item.grade || (item.score !== null ? item.score : "-")}</td>
                        <td className="px-2 py-3">{new Date(item.evaluatedAt).toLocaleDateString()}</td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedEvaluation(item)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteEvaluation(item.evaluationId)}
                              disabled={deleting === item.evaluationId}
                            >
                              {deleting === item.evaluationId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center text-muted-foreground">
                        No evaluation records match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EvaluationDetailModal
        open={!!selectedEvaluation}
        projectId={selectedEvaluation?.submissionId || null}
        evaluationId={selectedEvaluation?.evaluationId || null}
        projectTitle={selectedProjectTitle}
        onClose={() => setSelectedEvaluation(null)}
      />
    </main>
  );
}
