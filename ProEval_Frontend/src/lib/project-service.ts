import { apiClient } from "./api";
import { isStoredTestUser } from "./portal-mode";

export interface Phase1Data {
  title: string;
  abstract: string;
  domain: string;
  objectives: string[];
  methodology: string;
  use_case_diagram: string;
  tech_stack: string[];
}

export interface ProjectSubmission {
  id: string;
  team_id: string;
  leader_id: string;
  current_phase: string;
  academic_year: string;
  semester: number;
  created_at: string;
  phase_1_data?: Phase1Data;
  phase_2_data?: Phase2Data;
  final_data?: FinalData;
  is_deleted?: boolean;
  deleted_by_admin?: boolean;
}

export interface Phase2Data {
  github_url: string;
  presentation_url: string;
  progress_notes: string;
  completed_milestones: string[];
  pending_risks: string[];
}

export interface FinalData {
  final_report_url: string;
  presentation_url: string;
  demo_video_url?: string;
  github_url: string;
  final_summary: string;
  individual_contributions: string;
}

export interface TeamJoinData {
  team_id: string;
  role: string;
  functions: string;
  modules: string;
  tech_stack?: string;
  work_description?: string;
}

export interface TeamMemberInfo {
  name: string;
  email: string;
  role: string;
  functions: string;
  modules: string;
  is_leader: boolean;
  has_viewed_feedback: boolean;
  ai_feedback?: {
    orientation?: string;
  };
}

export interface MyProjectResponse {
  project: ProjectSubmission | null;
  user_role: string | null;
  member_count: number;
  members: TeamMemberInfo[];
  previous_projects: ProjectSubmission[];
  latest_evaluation_status?: string | null;
  latest_evaluation_phase?: string | null;
}

const TEST_BASE_PATH = "/test-projects";
const NORMAL_BASE_PATH = "/projects";

function getBasePath(testMode?: boolean) {
  const useTestMode = typeof testMode === "boolean" ? testMode : isStoredTestUser();
  return useTestMode ? TEST_BASE_PATH : NORMAL_BASE_PATH;
}

export const projectService = {
  async markFeedbackViewed(submissionId: string, options?: { testMode?: boolean }) {
    return apiClient.patch<void>(`${getBasePath(options?.testMode)}/${submissionId}/view-feedback`);
  },
  async submitPhase1(data: {
    phase_1_data: Phase1Data;
    academic_year: string;
    semester: number;
  }, options?: { testMode?: boolean }) {
    return apiClient.post<ProjectSubmission>(`${getBasePath(options?.testMode)}/`, data);
  },
  async resubmitPhase1(
    submissionId: string,
    data: {
      phase_1_data: Phase1Data;
      academic_year: string;
      semester: number;
    },
    options?: { testMode?: boolean }
  ) {
    return apiClient.patch<ProjectSubmission>(`${getBasePath(options?.testMode)}/${submissionId}/phase-1`, data);
  },
  async submitPhase2(submissionId: string, data: Phase2Data, options?: { testMode?: boolean }) {
    return apiClient.post<ProjectSubmission>(`${getBasePath(options?.testMode)}/phase-2/${submissionId}`, {
      phase_2_data: data,
    });
  },
  async submitFinal(submissionId: string, data: FinalData, options?: { testMode?: boolean }) {
    return apiClient.post<ProjectSubmission>(`${getBasePath(options?.testMode)}/final/${submissionId}`, {
      final_data: data,
    });
  },
  async submitClarifications(submissionId: string, answers: string[], options?: { testMode?: boolean }) {
    return apiClient.post<any>(`${getBasePath(options?.testMode)}/${submissionId}/phase-1/clarifications`, {
      answers,
    });
  },
  async deleteProject(submissionId: string, options?: { testMode?: boolean }) {
    return apiClient.delete<any>(`${getBasePath(options?.testMode)}/${submissionId}`);
  },
  async joinTeam(data: TeamJoinData, options?: { testMode?: boolean }) {
    return apiClient.post<TeamMemberInfo>(`${getBasePath(options?.testMode)}/join`, data);
  },
  async getMyProject(options?: { testMode?: boolean }) {
    return apiClient.get<MyProjectResponse | null>(`${getBasePath(options?.testMode)}/my-project`);
  },
  async getMyProposals(options?: { testMode?: boolean }) {
    return apiClient.get<any>(`${getBasePath(options?.testMode)}/my-proposals`);
  },
  async getEvaluation(submissionId: string, phase: string, options?: { testMode?: boolean }) {
    return apiClient.get<any>(`${getBasePath(options?.testMode)}/${submissionId}/evaluations/${phase}`);
  },
};
