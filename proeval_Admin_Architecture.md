# ResearchIQ — Admin Architecture Guide

*Agentic AI System for University Project & Research Evaluation*

Stack: Python · FastAPI · PostgreSQL · Redis · SQLAlchemy · Celery · Anthropic Claude API  
Pattern: Role-Based Access Control | Version: 2.0 | April 2025

---

## Table of Contents

1. [Admin Role Overview](#1-admin-role-overview)
2. [Folder Structure — Admin Modules](#2-folder-structure--admin-modules)
3. [Database Schema — Admin-Relevant Models](#3-database-schema--admin-relevant-models)
4. [Admin API Routes](#4-admin-api-routes)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Admin Dashboard Features](#6-admin-dashboard-features)
7. [Rubric & Settings Management](#7-rubric--settings-management)
8. [Integrity Flag Management](#8-integrity-flag-management)
9. [Reporting & Analytics](#9-reporting--analytics)
10. [Audit & Agent Trace Access](#10-audit--agent-trace-access)
11. [Job Queue Visibility](#11-job-queue-visibility)
12. [Error Handling — Admin Scope](#12-error-handling--admin-scope)
13. [Environment & Admin-Specific Config](#13-environment--admin-specific-config)
14. [Business Rules & Admin Constraints](#14-business-rules--admin-constraints)

---

## 1. Admin Role Overview

The Admin role is the highest-privilege level in ResearchIQ. Admins have institution-wide visibility and control over all students, faculty, projects, evaluations, rubric configurations, integrity flags, and system settings.

Unlike Faculty (who are scoped to their own assigned projects) and Students (who see only their own submissions), an Admin operates across the entire platform without scope restriction.

**What makes Admin distinct:**

- Full CRUD access to rubric configurations (global and domain-specific)
- Can view, reassign, and resolve all integrity flags across all evaluations
- Institution-wide read access to all projects, submissions, and evaluations — including projects not assigned to them as a guide
- Can override system thresholds (pass marks, team size limits, grade cutoffs)
- Can manage faculty accounts and student accounts
- Access to cohort-level reports and batch exports
- Can inspect full agent traces for any evaluation for audit purposes
- Can manually re-trigger evaluations for any submission

**High-Level Admin Position in System Architecture**

```
Client (Next.js Frontend)
│
├── Admin Panel ──► Full Platform Dashboard
│     ├── User Management (Faculty + Students)
│     ├── Evaluation Oversight (All Projects)
│     ├── Rubric Configuration
│     ├── Integrity Flag Resolution
│     ├── System Settings
│     └── Analytics & Export
│
▼
REST API Layer (FastAPI)
│
└── /api/v1/admin/ — Admin-scoped routes (ADMIN role JWT required)
      │
      ├── /admin/users        — Manage faculty + student accounts
      ├── /admin/projects     — View/manage all projects institution-wide
      ├── /admin/evaluations  — View/re-trigger all evaluations
      ├── /admin/integrity    — View and resolve all integrity flags
      ├── /admin/rubrics      — Create and modify rubric configs
      ├── /admin/settings     — System-wide threshold configuration
      └── /admin/reports      — Cohort analytics and batch exports
```

---

## 2. Folder Structure — Admin Modules

```
researchiq-backend/
│
├── app/
│   │
│   ├── api/
│   │   ├── routers/
│   │   │   ├── admin/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── users.py           # Manage faculty and student accounts
│   │   │   │   ├── projects.py        # Institution-wide project management
│   │   │   │   ├── evaluations.py     # All evaluations + manual re-trigger
│   │   │   │   ├── integrity.py       # Integrity flag resolution
│   │   │   │   ├── rubrics.py         # Rubric CRUD
│   │   │   │   ├── settings.py        # System threshold configuration
│   │   │   │   └── reports.py         # Analytics, cohort stats, exports
│   │   │
│   │   ├── dependencies/
│   │   │   ├── auth.py                # get_current_user, require_role("ADMIN")
│   │   │   └── db.py
│   │   │
│   │   └── schemas/
│   │       ├── admin/
│   │       │   ├── users.py           # FacultyCreate, StudentUpdate, UserListResponse
│   │       │   ├── rubrics.py         # RubricConfigCreate, RubricConfigUpdate
│   │       │   ├── settings.py        # SystemSettingsUpdate
│   │       │   ├── integrity.py       # IntegrityFlagResolve
│   │       │   └── reports.py         # CohortReport, BatchExportRequest
│   │
│   ├── services/
│   │   ├── admin/
│   │   │   ├── user_service.py        # Faculty/student account management
│   │   │   ├── project_service.py     # Institution-wide project access
│   │   │   ├── evaluation_service.py  # Manual evaluation triggers + overrides
│   │   │   ├── integrity_service.py   # Flag resolution workflow
│   │   │   ├── rubric_service.py      # Rubric CRUD + domain override logic
│   │   │   ├── settings_service.py    # System settings read/write
│   │   │   └── report_service.py      # Cohort stats, aggregations, exports
│   │
│   ├── tasks/
│   │   ├── evaluation_task.py         # Reused — admin can trigger for any submission
│   │   └── exports_task.py            # PDF batch export (admin-triggered)
│   │
│   └── db/
│       └── models.py                  # SystemSettings model lives here
```

---

## 3. Database Schema — Admin-Relevant Models

### Core Models Admin Manages

**Faculty** *(admin can create, update, deactivate)*
```
Faculty
  id, name, email, password_hash
  role (FACULTY | ADMIN | REVIEWER | COMMITTEE)
  department, is_active
  created_at, updated_at
```

**StudentAuth** *(admin can view, update, deactivate)*
```
StudentAuth
  id, name, email, enrollment_no, password_hash
  programme, department, batch
  is_active, created_at
```

**RubricConfig** *(admin has full CRUD)*
```
RubricConfig
  id, name, is_default
  domain (null = global | AI_ML | IOT | WEB | EMBEDDED | ...)
  criteria_weights (JSONB)
  pass_threshold, distinction_threshold
  created_by -> Faculty (admin who created it)
  created_at, updated_at
```

**IntegrityFlag** *(admin can view all + resolve any)*
```
IntegrityFlag
  id, evaluation_id -> Evaluation
  flag_type (SIMILARITY | STYLE_SHIFT | CODE_JUMP | AI_GENERATED | CONTRIBUTION_MISMATCH)
  severity (LOW | MEDIUM | HIGH)
  description, evidence
  resolved_at, resolved_by -> Faculty (admin who resolved it)
```

**SystemSettings** *(admin-only model)*
```
SystemSettings
  id
  max_team_members (int, default 3)
  pass_threshold (float, default 40.0)
  distinction_threshold (float, default 75.0)
  growth_bonus_max (float, default 10.0)
  ai_rate_limit_per_minute (int)
  current_academic_year (str)
  current_semester (str)
  updated_by -> Faculty
  updated_at
```

### Admin-Read Models (full institution-wide access)

| Model | Admin Access |
|---|---|
| `ProjectSubmission` | All, unfiltered — no guide_id scoping |
| `TeamMembership` | All members across all teams |
| `Evaluation` | All evaluations, all phases |
| `EvaluationCriterionScore` | All criterion scores |
| `MemberEvaluation` | All member-level evaluations |
| `AgentTrace` | Full trace for any evaluation (audit) |
| `VivaQuestion` | All viva questions |
| `GuideRequest` | All guide requests (for oversight) |
| `Notification` | All notifications (read-only) |

---

## 4. Admin API Routes

All admin routes are prefixed with `/api/v1/admin` and require an `ADMIN`-scoped JWT.

### User Management

```
GET    /api/v1/admin/users/faculty             List all faculty accounts
POST   /api/v1/admin/users/faculty             Create new faculty account
GET    /api/v1/admin/users/faculty/{id}        Faculty detail
PATCH  /api/v1/admin/users/faculty/{id}        Update faculty (role, department, active)
DELETE /api/v1/admin/users/faculty/{id}        Deactivate faculty account

GET    /api/v1/admin/users/students            List all student accounts (paginated)
GET    /api/v1/admin/users/students/{id}       Student detail + submission history
PATCH  /api/v1/admin/users/students/{id}       Update student account
DELETE /api/v1/admin/users/students/{id}       Deactivate student account
```

### Project Oversight

```
GET    /api/v1/admin/projects                  All projects, all guides (filtered/paginated)
GET    /api/v1/admin/projects/{id}             Full project detail + team + guide info
PATCH  /api/v1/admin/projects/{id}/guide       Reassign guide for a project
GET    /api/v1/admin/projects/{id}/members     All team members + contributions
```

### Evaluation Oversight

```
GET    /api/v1/admin/evaluations               All evaluations institution-wide
GET    /api/v1/admin/evaluations/{id}          Full evaluation result
GET    /api/v1/admin/evaluations/{id}/trace    Full agent trace (audit)
GET    /api/v1/admin/evaluations/{id}/members  All member evaluations
POST   /api/v1/admin/evaluations/{id}/trigger  Manually trigger evaluation for any submission
POST   /api/v1/admin/evaluations/{id}/regenerate  Re-run evaluation (creates new record)
```

### Integrity Flag Management

```
GET    /api/v1/admin/integrity                 All integrity flags (filterable by severity/type)
GET    /api/v1/admin/integrity/{id}            Flag detail + evidence + evaluation context
PATCH  /api/v1/admin/integrity/{id}/resolve    Resolve flag { resolution_note, resolved_by }
GET    /api/v1/admin/integrity/unresolved      All HIGH/MEDIUM unresolved flags
```

### Rubric Configuration

```
GET    /api/v1/admin/rubrics                   All rubric configs (global + domain-specific)
POST   /api/v1/admin/rubrics                   Create new rubric config
GET    /api/v1/admin/rubrics/{id}              Rubric detail + weights
PATCH  /api/v1/admin/rubrics/{id}              Update weights, thresholds, domain
DELETE /api/v1/admin/rubrics/{id}              Archive rubric (cannot delete if evaluations use it)
PATCH  /api/v1/admin/rubrics/{id}/set-default  Set as global default rubric
```

### System Settings

```
GET    /api/v1/admin/settings                  Current system settings
PATCH  /api/v1/admin/settings                  Update thresholds, limits, academic year
POST   /api/v1/admin/settings/reset            Reset to default constants
```

### Reports & Analytics

```
GET    /api/v1/admin/reports/cohort            Institution-wide cohort stats
GET    /api/v1/admin/reports/batch/{semester}  All evaluations for a semester
GET    /api/v1/admin/reports/student/{id}      Full evaluation history for a student
GET    /api/v1/admin/reports/faculty/{id}      All projects/evaluations for a faculty
GET    /api/v1/admin/reports/integrity-summary Integrity flag summary across cohort
POST   /api/v1/admin/reports/export            Trigger PDF batch export { semester, format }
GET    /api/v1/admin/reports/export/{task_id}  Poll export task status
```

---

## 5. Authentication & Authorization

### Admin JWT

Admins authenticate via the standard faculty login endpoint:

```
POST /api/v1/auth/login
```

The JWT payload includes `role: "ADMIN"`. Admin-scoped routes are guarded by:

```python
# app/api/dependencies/auth.py
async def require_admin(current_user: Faculty = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="ADMIN role required")
    return current_user
```

### Dependency Chain for Admin Routes

```
Request
  → get_current_user (Depends)     # Verifies JWT, fetches Faculty model
  → require_admin (Depends)        # Checks role == ADMIN; 403 if not
  → validate body/params           # Pydantic model auto-validates
  → rate_limit (Depends)           # Admin has elevated rate limits vs standard faculty
  → route handler
```

### Role Comparison

| Capability | STUDENT | FACULTY | REVIEWER | COMMITTEE | **ADMIN** |
|---|---|---|---|---|---|
| View own submission | ✅ | — | — | — | ✅ |
| Evaluate assigned projects | — | ✅ | ✅ | — | ✅ |
| View all projects | — | — | — | ✅ | ✅ |
| Manage rubric configs | — | — | — | — | ✅ |
| Resolve integrity flags | — | — | — | — | ✅ |
| Manage faculty accounts | — | — | — | — | ✅ |
| Update system settings | — | — | — | — | ✅ |
| Access full agent traces | — | — | — | — | ✅ |
| Trigger any evaluation | — | — | — | — | ✅ |
| Export batch reports | — | — | — | — | ✅ |

---

## 6. Admin Dashboard Features

The Admin Panel (frontend) surfaces the following views, each backed by the routes above:

### Institution Overview Dashboard
- Total students, faculty, active projects
- Current semester evaluation completion rate
- Count of unresolved HIGH severity integrity flags
- Recent evaluation activity feed

### User Management
- Faculty list: name, department, role, # projects assigned, active status
- Student list: name, programme, batch, # submissions, active status
- Create new faculty account with role assignment
- Deactivate accounts (soft delete — sets `is_active = False`)

### All Projects View
- Unfiltered list of all `ProjectSubmission` records
- Filter by: department, semester, academic year, guide, evaluation status, phase
- Columns: team_id, title, leader, guide, phase badge, evaluation badge
- Row click → full project detail (team, contributions, submission links)
- Guide reassignment button (PATCH `/admin/projects/{id}/guide`)

### Evaluation Oversight
- Full evaluation list across all guides and semesters
- Filter by: status (PENDING / IN_PROGRESS / COMPLETED / FAILED), phase, grade
- Click → evaluation result with per-member breakdown
- "View Agent Trace" button → full orchestrator + sub-agent log
- "Re-trigger Evaluation" for FAILED or disputed evaluations

### Integrity Flag Console
- All flags grouped by severity (HIGH → MEDIUM → LOW)
- Filter by type: SIMILARITY, CONTRIBUTION_MISMATCH, AI_GENERATED, etc.
- Flag detail: evidence, evaluation context, affected member
- Resolve action: mark resolved + add resolution note

### Rubric Configuration
- List of all rubric configs (global default highlighted)
- Per-domain rubrics listed by domain tag
- Rubric editor: adjust criterion weights (must sum to 100), pass/distinction thresholds
- Set default rubric for a domain or globally

### System Settings Panel
- Max team members (default 3)
- Pass threshold, distinction threshold
- Growth bonus max
- Current academic year + semester
- AI rate limits

---

## 7. Rubric & Settings Management

### RubricConfig Service (`app/services/admin/rubric_service.py`)

```python
create_rubric(data: RubricConfigCreate) -> RubricConfig
    # Validates weights sum to 100 before insert
    # domain=None → global; domain="AI_ML" → overrides global for that domain

update_rubric(id: int, data: RubricConfigUpdate) -> RubricConfig
    # Cannot update a rubric that is currently used by an IN_PROGRESS evaluation
    # Returns RUBRIC_IN_USE error if evaluation is actively running

set_default_rubric(id: int) -> RubricConfig
    # Clears is_default on all other global rubrics, sets this one

archive_rubric(id: int) -> None
    # Soft-deletes; raises RUBRIC_HAS_EVALUATIONS if evaluations reference it
```

### SystemSettings Service (`app/services/admin/settings_service.py`)

```python
get_settings() -> SystemSettings
update_settings(data: SystemSettingsUpdate) -> SystemSettings
    # max_team_members change does NOT retroactively affect existing teams
    # pass_threshold change takes effect for evaluations run after update
reset_to_defaults() -> SystemSettings
```

### Domain Override Logic

When an evaluation is triggered, `EvaluationService` selects the rubric as follows:

```
1. If rubric_config_id provided in request → use that specific rubric
2. Else if a domain-specific RubricConfig exists for the project's domain → use that
3. Else use the global default RubricConfig (is_default = True, domain = null)
```

---

## 8. Integrity Flag Management

### Flag Types

| Flag Type | Description | Typical Severity |
|---|---|---|
| `SIMILARITY` | Report text matches another student's submission | HIGH |
| `AI_GENERATED` | Report shows high probability of AI authorship | MEDIUM |
| `STYLE_SHIFT` | Writing style inconsistent across report sections | MEDIUM |
| `CODE_JUMP` | Code sophistication inconsistent with project history | HIGH |
| `CONTRIBUTION_MISMATCH` | Stated modules not found in codebase | HIGH |

### Integrity Service (`app/services/admin/integrity_service.py`)

```python
list_flags(filters: IntegrityFlagFilters) -> list[IntegrityFlag]
    # Filter by severity, type, evaluation_id, resolved/unresolved

get_flag_detail(id: int) -> IntegrityFlagDetail
    # Returns flag + linked evaluation summary + member context

resolve_flag(id: int, resolution: IntegrityFlagResolve) -> IntegrityFlag
    # Sets resolved_at = now(), resolved_by = current admin
    # Adds resolution_note to flag record
```

### Resolution Workflow

```
1. Admin reviews flag detail — reads evidence (file names, similarity %, etc.)
2. Admin reviews linked evaluation and AgentTrace for context
3. Admin marks flag as resolved with a resolution note
4. Optional: Admin triggers re-evaluation if disputed score needs correction
5. Faculty guide is notified of flag resolution
```

---

## 9. Reporting & Analytics

### Cohort Report (`GET /api/v1/admin/reports/cohort`)

Returns institution-wide aggregated statistics:

```json
{
  "total_submissions": int,
  "evaluated": int,
  "pending": int,
  "failed": int,
  "grade_distribution": { "A+": int, "A": int, "B+": int, ... },
  "average_score": float,
  "domain_breakdown": [ { "domain": str, "count": int, "avg_score": float } ],
  "integrity_flags": { "HIGH": int, "MEDIUM": int, "LOW": int, "resolved": int },
  "semester": str,
  "academic_year": str
}
```

### Batch Export (`POST /api/v1/admin/reports/export`)

- Queues a Celery task on the `exports` queue
- Generates a PDF report for a given semester with all project evaluations, member scores, grade distribution, and flagged projects
- Polled via `GET /api/v1/admin/reports/export/{task_id}`
- File served from object storage or temporary signed URL on completion

### Report Service (`app/services/admin/report_service.py`)

```python
get_cohort_stats(semester: str, academic_year: str) -> CohortReport
get_batch_evaluations(semester: str) -> list[EvaluationSummary]
get_student_history(student_id: int) -> StudentHistoryReport
get_faculty_overview(faculty_id: int) -> FacultyReport
get_integrity_summary() -> IntegritySummary
trigger_export(request: BatchExportRequest) -> str  # returns task_id
```

---

## 10. Audit & Agent Trace Access

Every evaluation persists a complete `AgentTrace` record. Admins are the only role with unrestricted access to all traces.

### AgentTrace Structure

```json
{
  "id": int,
  "evaluation_id": int,
  "orchestrator_input": { ... },      // Full EvaluationContext passed to orchestrator
  "sub_agent_outputs": {              // Output from each project-level agent
    "report_analysis": { ... },
    "code_review": { ... },
    "presentation": { ... },
    "plagiarism": { ... },
    "growth_tracking": { ... }
  },
  "member_agent_outputs": [           // One entry per TeamMembership
    { "membership_id": int, "output": { ... } },
    ...
  ],
  "tool_call_log": [                  // Ordered log of all tool calls + results
    { "agent": str, "tool": str, "input": {...}, "output": {...}, "duration_ms": int },
    ...
  ],
  "total_tokens_used": int,
  "duration_ms": int,
  "created_at": datetime
}
```

### Use Case: Score Dispute Resolution

```
1. Faculty or student disputes a score
2. Admin retrieves GET /api/v1/admin/evaluations/{id}/trace
3. Admin inspects sub_agent_outputs to see which agent assigned which score
4. Admin reviews tool_call_log to verify what evidence was consulted
5. Admin resolves any integrity flags if relevant
6. Admin can trigger POST /api/v1/admin/evaluations/{id}/regenerate to re-run evaluation
```

---

## 11. Job Queue Visibility

Admins have read access to queue status via Flower (Celery monitoring dashboard). No direct API endpoint wraps Flower — admins access it via the internal ops URL.

### Queue Summary

| Queue | Description | Admin Action |
|---|---|---|
| `evaluation` | Full AI evaluation pipeline | Can trigger for any submission |
| `member_evaluation` | Individual member re-evaluation | Can trigger per-member if needed |
| `integrity` | Batch plagiarism scan | Can trigger across an entire cohort |
| `exports` | PDF batch report generation | Triggered via admin reports API |
| `notifications` | Email + in-app notifications | Read-only visibility |
| `guide_request` | Guide accept/reject notifications | Read-only visibility |

### Admin-Triggered Task: Manual Evaluation

```python
# POST /api/v1/admin/evaluations/{id}/trigger
# Bypasses the "only assigned guide can trigger" guard
# Creates new Evaluation record (PENDING), queues Celery task
# Prior evaluations are preserved for audit

async def admin_trigger_evaluation(submission_id: int, admin: Faculty):
    evaluation = await evaluation_service.create_evaluation(submission_id)
    task = evaluation_task.delay(evaluation.id)
    return { "task_id": task.id, "evaluation_id": evaluation.id, "status": "queued" }
```

---

## 12. Error Handling — Admin Scope

| Error Code | Scenario | HTTP Status |
|---|---|---|
| `RUBRIC_IN_USE` | Attempt to update rubric during active evaluation | 409 |
| `RUBRIC_HAS_EVALUATIONS` | Attempt to archive rubric referenced by past evaluations | 409 |
| `FLAG_ALREADY_RESOLVED` | Attempt to resolve an already-resolved integrity flag | 409 |
| `ACCOUNT_HAS_ACTIVE_PROJECTS` | Attempt to deactivate faculty with active submissions | 409 |
| `EVALUATION_IN_PROGRESS` | Attempt to re-trigger while evaluation is running | 409 |
| `SETTINGS_VALIDATION_ERROR` | Invalid threshold values (e.g., pass > distinction) | 422 |

All admin errors return the standard error envelope:

```json
{
  "error_code": "RUBRIC_IN_USE",
  "detail": "Cannot update rubric while an evaluation is IN_PROGRESS.",
  "evaluation_id": 42
}
```

---

## 13. Environment & Admin-Specific Config

Admin-relevant environment variables in `.env`:

```env
# Admin account bootstrap
ADMIN_EMAIL=admin@university.ac.in
ADMIN_PASSWORD=changeme_on_first_login   # Seeded via db/seed.py

# Export storage (for PDF batch exports)
EXPORT_STORAGE_BUCKET=researchiq-exports
EXPORT_SIGNED_URL_EXPIRY_SECONDS=3600

# Flower (Celery monitoring) — internal ops URL
FLOWER_URL=http://localhost:5555
FLOWER_BASIC_AUTH=admin:flowerpassword

# Admin rate limits (higher than standard faculty)
ADMIN_API_RATE_LIMIT_PER_MINUTE=300
ADMIN_AI_RATE_LIMIT_PER_MINUTE=30
```

### Seeding the First Admin

```python
# app/db/seed.py
async def seed_admin():
    admin = Faculty(
        name="System Administrator",
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        role="ADMIN",
        department="Administration"
    )
    session.add(admin)
    await session.commit()
```

Run once during first deployment:
```bash
python -m app.db.seed
```

---

## 14. Business Rules & Admin Constraints

### Rules Admin Can Override

| Rule | Normal Enforcement | Admin Override |
|---|---|---|
| Only assigned guide can trigger evaluation | Service-layer + route guard | Admin can trigger via `/admin/evaluations/{id}/trigger` |
| Rubric config cannot be changed during evaluation | `RUBRIC_IN_USE` check | Admin cannot bypass — must wait for evaluation to complete |
| Max 3 team members | DB constraint + service check | Max is configurable via `SystemSettings.max_team_members` (DB constraint requires migration) |
| One project per semester per student | DB UNIQUE constraint | Cannot be overridden — DB-level enforcement only |

### Rules Admin Cannot Override

- **DB-level UNIQUE constraints** (one project per semester per student, unique team_id) — these require a manual migration, not a settings toggle.
- **JWT expiry** — token lifetimes are set at deploy time via `.env`, not runtime settings.
- **Agent temperature and model** — fixed in `app/core/config.py`; changes require redeploy.

### Admin Account Security

- Admin password must be changed on first login (enforced by `must_change_password` flag on `Faculty` model, set to `True` on seed)
- Admin sessions expire on the same schedule as faculty (15 min access token, 7-day refresh)
- All admin-triggered actions (rubric changes, flag resolutions, settings updates) are logged with `updated_by -> Faculty` reference for full audit trail

---

*ResearchIQ Admin Architecture Guide — v2.0 | For internal development use*
