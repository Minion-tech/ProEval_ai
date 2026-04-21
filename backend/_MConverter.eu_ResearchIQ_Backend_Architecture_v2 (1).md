**ResearchIQ --- Backend Architecture Guide**

*Agentic AI System for Iterative University Student Project Evaluation*

Stack: Python · FastAPI · PostgreSQL · Redis · SQLAlchemy · Celery · Anthropic Claude API  
Pattern: Multi-Agent Orchestration with Tool Use | Version: 3.0 | April 2026

**1. System Overview**

ResearchIQ provides a **Continuous Feedback Loop** for university projects. Instead of a single final evaluation, the system evaluates students at every critical milestone:
- **Phase 1 (Initiation)**: Student-led project setup with mandatory AI-driven risk, suitability, and timeline analysis.
- **Phase 2 (Mid-term)**: Evaluates progress, code architecture, and documentation.
- **Final (Submission)**: Comprehensive scoring, individual contribution audit, and grade assignment.

**Phase-Gated Evaluation Flow (Revised)**
1. **Leader Submission**: Phase 1 data (Title, Objective, Methodology, Use Case) is submitted with a preferred guide.
2. **Instant AI Analysis**: System immediately evaluates project risk, suitability, and generates a predicted timeline.
3. **Admin Oversight**: Admin reviews the AI report and project details to either approve or replace the assigned guide.
4. **Member Onboarding**: Team members join with specific roles and tech stacks, receiving individual AI gap analysis.
5. **Phase 1 Handover**: A final summary report is submitted to the assigned Guide to unlock Phase 2.

**High-Level Architecture**

> Client (Next.js Frontend)
> │
> ├── Admin Dashboard ──► Approve Phase 1 ──► Assign/Replace Guide ──► Review AI Risk Reports
> ├── Faculty Dashboard ──► Mentor Project ──► Evaluate Phase 2 & Final
> └── Student Portal ──► Submit Phase 1-Final ──► View AI Alerts (Risk/Timeline/Skill Gaps)
> │
> ▼
> Orchestrator Agent (Phase-Aware)
> │
> ├── [Phase 1] Risk, Suitability & Timeline Predictor
> ├── [Phase 2] Progress & Architecture Reviewer
> └── [Final] Full Synthesis & Contribution Verifier

**3. Database Schema (Iterative Focus)**

**Project Models**

> ProjectSubmission
> id, team_id, leader_id, guide_id, guide_status
> admin_status (PENDING | APPROVED | REJECTED | GUIDE_REPLACED)
> admin_feedback (Text)
> current_phase (PHASE_1 | PHASE_2 | FINAL | COMPLETED)
> phase_1_data (Title, Objective, Methodology, UseCaseURL, AI_Analysis_Report)
> phase_2_data (GitHub URL, Architecture Diagram, Progress Notes)
> final_data (Final Report, Presentation, Demo Video)
> created_at, updated_at

> TeamMembership
> id, submission_id, student_id
> role, functions, work_description, tech_stack
> ai_feedback (JSON: Skill Gaps, Workload Balance)
> created_at, updated_at

**Evaluation Models**

> Evaluation
> id, submission_id -> ProjectSubmission
> phase (PHASE_1 | PHASE_2 | FINAL)
> status (PENDING | IN_PROGRESS | COMPLETED | FAILED)
> total_score (mostly for Final, or mini-scores for phases)
> ai_narrative (Detailed feedback/suggestions for the specific phase)
> grade (Final phase only)
> faculty_id -> Faculty (assigned guide)
> created_at, completed_at

**10. Data Flow — Phase 1 Evaluation (New Flow)**

1. **Submission**: Student Leader submits Phase 1 details (Title, Objective, Methodology, Use Case Diagram).
2. **AI Risk Check**: System immediately runs AI to generate a Risk/Suitability report and a predicted completion timeline.
3. **Admin Review**: Admin checks the AI report. They can **Approve** the project or **Replace Guide** with a more suitable faculty member.
4. **Member Sync**: Members join, providing their tech stack; AI alerts them of any skill gaps (e.g., "Project uses Go, but you only know Python").
5. **Handover**: Once all members join and Admin approves, the "Phase 1 Summary Report" is sent to the Guide.

**17. Business Rules & Constraints**

- **Admin Gatekeeper**: Admin has the final authority on Phase 1 approval and Guide assignment.
- **Guide Role**: Guides act as mentors and evaluators for Phase 2 onwards; they do not have rejection rights during the Phase 1 assignment.
- **AI-First Feedback**: Students receive immediate AI insights (Risk/Timeline) to refine their project *before* Admin review.
- **Phase Sequence**: Students cannot skip phases. Phase 1 must be fully cleared by Admin and Guide notified before Phase 2 unlocks.

*ResearchIQ Backend Architecture Guide — v3.0 | Admin & AI-Driven Phase 1*
