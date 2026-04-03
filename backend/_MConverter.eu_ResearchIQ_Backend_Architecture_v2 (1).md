**ResearchIQ --- Backend Architecture Guide**

*Agentic AI System for Iterative University Student Project Evaluation*

Stack: Python · FastAPI · PostgreSQL · Redis · SQLAlchemy · Celery · Anthropic Claude API  
Pattern: Multi-Agent Orchestration with Tool Use | Version: 2.2 | April 2026

**1. System Overview**

ResearchIQ provides a **Continuous Feedback Loop** for university projects. Instead of a single final evaluation, the system evaluates students at every critical milestone:
- **Phase 1 (Proposal)**: Validates the topic, scope, and technical feasibility.
- **Phase 2 (Mid-term)**: Evaluates progress, code architecture, and documentation.
- **Final (Submission)**: Comprehensive scoring, individual contribution audit, and grade assignment.

**Phase-Gated Evaluation Flow**
1. **Leader Submission**: Phase data (1, 2, or Final) is filled.
2. **Guide Approval**: The faculty guide reviews and approves the submission.
3. **AI Consultation**: Once approved, the guide triggers an AI evaluation specific to that phase.
4. **Iterative Improvement**: Students receive AI feedback and can refine their work before moving to the next phase.

**High-Level Architecture**

> Client (Next.js Frontend)
> │
> ├── Faculty Dashboard ──► Approve Phase ──► Trigger AI Evaluation
> └── Student Portal ──► Submit Phase ──► View Phase Feedback ──► Refine Work
> │
> ▼
> Orchestrator Agent (Phase-Aware)
> │
> ├── [Phase 1] Topic & Scope Analyst
> ├── [Phase 2] Progress & Architecture Reviewer
> └── [Final] Full Synthesis & Contribution Verifier

**3. Database Schema (Iterative Focus)**

**Project Models**

> ProjectSubmission
> id, team_id, leader_id, guide_id, guide_status
> current_phase (PHASE_1 | PHASE_2 | FINAL | COMPLETED)
> phase_1_data (Title, Abstract, Objectives, Stack)
> phase_2_data (GitHub URL, Architecture Diagram, Progress Notes)
> final_data (Final Report, Presentation, Demo Video)
> created_at, updated_at

**Evaluation Models**

> Evaluation
> id, submission_id -> ProjectSubmission
> phase (PHASE_1 | PHASE_2 | FINAL)
> status (PENDING | IN_PROGRESS | COMPLETED | FAILED)
> total_score (mostly for Final, or mini-scores for phases)
> ai_narrative (Detailed feedback/suggestions for the specific phase)
> grade (Final phase only)
> faculty_id -> Faculty (who triggered it)
> created_at, completed_at

**10. Data Flow — Phase 1 Evaluation Example**

1. **Submission**: Student Leader saves Phase 1 details (Domain: AI, Abstract: "Smart Parking System").
2. **Guide Request**: Guide receives notification, reviews the topic, and clicks **"Accept & Evaluate Phase 1"**.
3. **AI Evaluation**: Orchestrator invokes **Report Analysis Agent** with a "Proposal Feasibility" prompt.
4. **Output**: AI identifies that "Hardware requirements are missing" and "The scope is too broad for 3 months."
5. **Action**: Student views feedback in the portal, updates their abstract, and is now ready for Phase 2.

**17. Business Rules & Constraints**

- **Phase Sequence**: Students cannot skip phases. Phase 1 evaluation must be completed before Phase 2 is unlocked.
- **Iterative Updates**: Students can "re-submit" a phase for evaluation if the guide allows it (to fix issues found by AI).
- **Guide Authority**: Only the guide can trigger the AI evaluation, preventing students from spamming the API.

*ResearchIQ Backend Architecture Guide — v2.2 | Iterative Evaluation Focus*
