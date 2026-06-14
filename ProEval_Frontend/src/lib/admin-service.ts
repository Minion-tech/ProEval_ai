import { apiClient } from "./api";

export interface AdminOverview {
  total_students: number;
  active_projects: number;
  unresolved_flags: number;
}

export interface AdminSystemSettings {
  max_team_members: number;
  pass_threshold: number;
  distinction_threshold: number;
  growth_bonus_max: number;
  ai_rate_limit_per_minute: number;
  current_academic_year: string;
  current_semester: string;
}

export interface BulkStudent {
  name: string;
  enrollment_no: string;
  email?: string;
  programme: "BTECH" | "MTECH" | "MCA" | "PHD";
  department: string;
  batch: string;
}

export interface WhitelistStudent extends BulkStudent {
  id?: string;
  is_registered?: boolean;
}

export interface RegisteredStudent {
  id: string;
  name: string;
  email: string;
  enrollment_no: string;
  programme: "BTECH" | "MTECH" | "MCA" | "PHD";
  department: string;
  batch: string;
  is_verified: boolean;
}

export interface ProjectRecord {
  id: string;
  [key: string]: unknown;
}

export type EvaluationPhase = "PHASE_1" | "PHASE_2" | "FINAL";
export type EvaluationStatus = "PENDING" | "IN_PROGRESS" | "AWAITING_CLARIFICATION" | "COMPLETED" | "FAILED";

export interface AdminEvaluationRecord {
  id: string;
  submission_id: string;
  project_id: string;
  project_title: string;
  team_id?: string | null;
  team_leader_name?: string | null;
  semester?: number | null;
  academic_year?: string | null;
  phase: EvaluationPhase;
  status: EvaluationStatus;
  total_score?: number | null;
  grade?: string | null;
  ai_narrative?: string | null;
  agent_logs?: unknown;
  roadmap_json?: unknown;
  created_at: string;
  updated_at: string;
}

export const adminService = {
  getOverview() {
    return apiClient.get<AdminOverview>("/admin/reports/cohort");
  },

  getStudentUsers() {
    return apiClient.get<RegisteredStudent[]>("/admin/users/students");
  },

  deleteStudent(studentId: string) {
    return apiClient.delete(`/admin/users/students/${studentId}`);
  },

  uploadStudents(students: BulkStudent[]) {
    return apiClient.post("/admin/users/students/upload", { students });
  },

  getStudentWhitelist() {
    return apiClient.get<WhitelistStudent[]>("/admin/users/students/whitelist");
  },

  deletePreapprovedStudent(studentId: string) {
    return apiClient.delete(`/admin/users/students/whitelist/${studentId}`);
  },

  getProjects() {
    return apiClient.get<ProjectRecord[]>("/admin/projects");
  },

  deleteProject(projectId: string) {
    return apiClient.delete(`/admin/projects/${projectId}`);
  },

  updateProjectStatus(projectId: string, action: "APPROVED" | "REJECTED" | "REQUEST_REVISION", feedback?: string) {
    return apiClient.patch(`/admin/projects/${projectId}/status`, { action, feedback });
  },

  getEvaluations() {
    return apiClient.get<AdminEvaluationRecord[]>("/admin/evaluations");
  },

  getEvaluationsByProject(projectId: string) {
    return apiClient.get<AdminEvaluationRecord[]>(`/admin/projects/${projectId}/evaluations`);
  },

  getEvaluationDetail(submissionId: string, phase: EvaluationPhase) {
    return apiClient.get<AdminEvaluationRecord>(`/admin/evaluations/${submissionId}/${phase}`);
  },

  retriggerEvaluation(evaluationId: string) {
    return apiClient.post(`/admin/evaluations/${evaluationId}/trigger`);
  },

  deleteEvaluation(evaluationId: string) {
    return apiClient.delete(`/admin/evaluations/${evaluationId}`);
  },

  getIntegrityFlags() {
    return apiClient.get<unknown[]>("/admin/integrity");
  },

  resolveIntegrityFlag(flagId: string, resolution_note: string) {
    return apiClient.patch(`/admin/integrity/${flagId}/resolve`, { resolution_note });
  },

  getRubrics() {
    return apiClient.get<unknown[]>("/admin/rubrics");
  },

  setDefaultRubric(rubricId: string) {
    return apiClient.patch(`/admin/rubrics/${rubricId}/set-default`);
  },

  getSettings() {
    return apiClient.get<AdminSystemSettings>("/admin/settings");
  },

  updateSettings(payload: Partial<AdminSystemSettings>) {
    return apiClient.patch<AdminSystemSettings>("/admin/settings", payload);
  },

  startSemesterExport(semester: string) {
    return apiClient.post("/admin/reports/export", { semester, format: "pdf" });
  },
};
