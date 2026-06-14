export const APP_NAME = "ProEval AI";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export const PROJECT_STATUS = {
  PENDING: 'pending',
  PHASE1_COMPLETE: 'phase1_complete',
  PHASE2_ACTIVE: 'phase2_active',
  COMPLETED: 'completed',
} as const;

export const ROLES = {
  STUDENT: 'STUDENT',
  FACULTY: 'FACULTY',
  ADMIN: 'ADMIN',
} as const;
