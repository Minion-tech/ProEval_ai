# ResearchIQ — Admin Architecture Guide (Phase 1 Focused)

*Agentic AI System for University Project & Research Evaluation*

Stack: Python · FastAPI · PostgreSQL · Redis · SQLAlchemy · Celery · Anthropic Claude API  
Pattern: AI-First Gatekeeping | Version: 3.0 | April 2026

---

## 1. The "Low-Workload" Admin Workflow

In Version 3.0, the Admin acts as the final gatekeeper for Phase 1. To minimize manual labor, the system employs a **Tiered Filtering Strategy** where the AI handles the bulk of the "suitability" checking.

### Tier 1: Automated AI Pre-Screening (The Student Loop)
- **Immediate Analysis**: When a student leader submits a Phase 1 proposal (Title, Objective, Methodology, Use Case), the AI immediately runs a suitability check.
- **Self-Correction**: If the AI detects a "Red" status (e.g., "Objectives are too vague," "Methodology is missing technical steps"), the submission is **blocked** from reaching the Admin. 
- **Feedback**: The student receives an "AI Alert" with specific reasons why the project was not suitable, forcing them to refine it before the Admin ever sees it.

### Tier 2: Admin "Ready for Review" Queue
- **"Clean" Inbox**: The Admin dashboard only shows projects that have passed the AI filter (Status: `Green` or `Yellow`).
- **High-Signal Review**: Instead of reading every word, the Admin reviews the **AI Summary Report** which highlights:
    - **Risk Level**: (Low/Moderate/High)
    - **Timeline Feasibility**: (Realistic/Tight/Unrealistic)
    - **Skill Gaps**: Warnings if team members' tech stacks don't match the project methodology.

---

## 2. Updated Admin Action Suite (Phase 1)

The Admin has three primary decisions for any Phase 1 submission:

1.  **Approve & Handover**: Confirms the project and the student's chosen Guide. The project moves to Phase 2.
2.  **Replace Guide**: If the Admin identifies a better faculty match (e.g., the project is AI-based and the chosen guide is a Web specialist), they assign a new Guide. **Note: Faculty cannot reject this assignment; they are simply notified.**
3.  **Request Admin Revision**: If the AI missed a subtle institutional policy violation, the Admin can manually send the project back to the student for changes.

---

## 3. Database Schema Updates (Admin Decision Support)

### ProjectSubmission Model (Enhanced)
```python
class AdminStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    GUIDE_REPLACED = "GUIDE_REPLACED"

ProjectSubmission
  ...
  admin_status: AdminStatus
  admin_feedback: Optional[str]
  phase_1_data: {
    "project_title": str,
    "project_objective": str,
    "project_methodology": str,
    "use_case_diagram_url": str,
    "ai_analysis": {
        "suitability_score": float,
        "risk_narrative": str,
        "predicted_timeline_weeks": int,
        "tier_status": "GREEN" | "YELLOW" | "RED"
    }
  }
```

### TeamMembership Model (Enhanced)
```python
TeamMembership
  ...
  work_description: str
  tech_stack: str  # Student's skills for this project
  ai_feedback: {
    "skill_gap_alerts": List[str],  # e.g., "Project uses Go; Member knows Python"
    "workload_balance_score": float
  }
```

---

## 4. Admin Dashboard UI: Decision Support Features

To make decisions "in seconds," the Admin Panel includes:

### A. The "AI Co-Pilot" Summary Modal
When clicking a pending project, the Admin sees a single-page summary:
- **Project Verdict**: `✅ AI Suitable (Score: 88%)`
- **Timeline Prediction**: `4 Months (Matches Semester)`
- **Guide Fit**: `Matching: 92% with Proposed Guide (Dr. Rao)`
- **Guide Load**: `Dr. Rao current load: 2/5 projects`
- **Skill Alerts**: `⚠️ Member B needs React training (Project uses React)`

### B. Guide Load Balancer
- During guide assignment/replacement, the Admin sees a list of all faculty with their **current project count** (e.g., `Prof. Meera (4/5) - High Load`).
- **Expertise Tags**: Guides are tagged with their expertise (e.g., `Blockchain`, `Mobile`, `ML`) to help the Admin match them with project methodologies.

---

## 5. Phase 1 Handover Logic

Once the Admin clicks **Approve**:
1.  **Status Update**: `admin_status` becomes `APPROVED`.
2.  **Notification**: The assigned Guide receives a "New Project Assigned" notification.
3.  **Summary Generation**: A "Phase 1 Summary Report" (combining student data + AI analysis + Admin notes) is automatically generated and attached to the project.
4.  **Phase Unlock**: Phase 2 (Mid-term) is automatically unlocked for the student team.

---

## 6. Business Rules (Phase 1)

- **AI Gatekeeper**: Students cannot submit to Admin if the AI Tier 1 analysis is `RED`.
- **Admin Authority**: The Admin is the *only* person who can approve Phase 1. The Guide's role in Phase 1 is strictly advisory/mentorship once assigned.
- **No Guide Rejection**: To ensure all teams have a mentor, Faculty cannot reject a project assigned or confirmed by the Admin.
- **One-Click Handover**: The transition from Phase 1 to Phase 2 must be a single Admin action.

---

*ResearchIQ Admin Architecture Guide — v3.0 | Admin as High-Level Gatekeeper*
