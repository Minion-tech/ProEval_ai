import { z } from "zod";

export const projectPhase1Schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  enrollmentNo: z.string().min(5, "Enrollment number is required"),
  programme: z.string().min(2, "Programme is required"),
  department: z.string().min(2, "Department is required"),
  batch: z.string().min(4, "Batch/Year is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  projectTitle: z.string().min(5, "Project title must be at least 5 characters"),
  projectObjective: z.string().min(50, "Project objective must be at least 50 characters"),
  domain: z.string().min(2, "Domain/Area is required"),
  methodology: z.string().min(50, "Methodology must be at least 50 characters"),
  useCaseDiagram: z.string().min(20, "Use case diagram is required"),
  techStack: z.string().min(2, "Tech stack is required"),
  semester: z.string().min(1, "Semester is required"),
});

export const projectPhase2Schema = z.object({
  github_url: z.string().url("Invalid GitHub/GitLab URL"),
  presentation_url: z.string().min(1, "Presentation upload is required"),
  progress_notes: z.string().min(50, "Progress notes must be at least 50 characters"),
  completed_milestones: z.array(z.string().min(3, "Milestone must be at least 3 characters")).min(1, "At least one completed milestone is required"),
  pending_risks: z.array(z.string().min(3, "Risk/issue must be at least 3 characters")).optional(),
});

export const joinTeamSchema = z.object({
  teamId: z.string().regex(/^TEAM-\d{4}-\d{4}$/, "Invalid Team ID format (e.g., TEAM-2025-0042)"),
});

export type ProjectPhase1Data = z.infer<typeof projectPhase1Schema>;
export type ProjectPhase2Data = z.infer<typeof projectPhase2Schema>;
export type JoinTeamData = z.infer<typeof joinTeamSchema>;
