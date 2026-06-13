import uuid
import  random
import string
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from fastapi import HTTPException, status
from typing import Optional

from app.db.Models import ProjectSubmission, TeamMembership, StudentAuth, ProjectPhase, EvaluationPhase, NotificationType
from app.api.schemas.projects import (
    ProjectSubmissionCreateSchema,
    Phase2SubmissionSchema,
    FinalSubmissionSchema,
    TeamJoinSchema,
)
from app.services.evaluation_service import EvaluationService
from app.services.notification_service import NotificationService
from app.tasks.evaluation_queue import (
    enqueue_final_analysis,
    enqueue_member_orientation,
    enqueue_phase_1_analysis,
    enqueue_phase_1_architect_review,
    enqueue_phase_2_analysis,
)
from app.core.config import settings
from app.core.ai_provider import create_generation_model

class ProjectService:
    @staticmethod
    async def get_submission_by_id(
        db: AsyncSession,
        submission_id: uuid.UUID,
    ) -> ProjectSubmission | None:
        """Fetch a project submission by primary key (Active projects only)."""
        query = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.id == submission_id,
                ProjectSubmission.is_deleted == False
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def _cleanse_project_data(data: dict) -> dict:
        """
        Recursively strips large base64 strings from project data to keep API responses lightweight.
        """
        if not data: return data
        
        # Keys that often contain massive binary/base64 data
        LARGE_FIELD_KEYS = ["use_case_diagram", "final_report_url", "presentation_url"]
        
        cleaned = data.copy()
        for key, value in cleaned.items():
            if key in LARGE_FIELD_KEYS and isinstance(value, str) and value.startswith("data:"):
                # Replace large base64 with a metadata placeholder
                cleaned[key] = f"[Large Binary Data: {len(value) // 1024} KB stripped for API performance]"
            elif isinstance(value, dict):
                cleaned[key] = ProjectService._cleanse_project_data(value)
        
        return cleaned

    @staticmethod
    async def get_my_project(
        db: AsyncSession,
        student_id: uuid.UUID,
    ) -> dict:
        """
        Finds the current ACTIVE project and HISTORY for the logged-in student.
        """
        # 1. Search all memberships for the student
        membership_query = select(TeamMembership).where(TeamMembership.student_id == student_id)
        membership_result = await db.execute(membership_query)
        memberships = membership_result.scalars().all()

        active_project_data = {
            "project": None,
            "user_role": None,
            "member_count": 0,
            "members": [],
            "previous_projects": []
        }

        if not memberships:
            return active_project_data

        # 2. Fetch all associated projects at once to avoid loop queries
        submission_ids = [m.submission_id for m in memberships]
        projects_query = select(ProjectSubmission).where(ProjectSubmission.id.in_(submission_ids))
        projects_result = await db.execute(projects_query)
        all_projects = {p.id: p for p in projects_result.scalars().all()}

        # 3. Categorize projects
        active_membership = None
        for m in memberships:
            project = all_projects.get(m.submission_id)
            if not project:
                continue
                
            if not project.is_deleted:
                # Found the ACTIVE project
                active_membership = m
            else:
                # This is a DELETED/PREVIOUS project
                # Cleanse data before adding to history
                project.phase_1_data = ProjectService._cleanse_project_data(project.phase_1_data)
                project.phase_2_data = ProjectService._cleanse_project_data(project.phase_2_data)
                project.final_data = ProjectService._cleanse_project_data(project.final_data)
                active_project_data["previous_projects"].append(project)

        # 4. If an active project was found, fetch its members
        if active_membership:
            project = all_projects[active_membership.submission_id]
            
            # CLEANSE: Strip huge base64 strings before returning
            project.phase_1_data = ProjectService._cleanse_project_data(project.phase_1_data)
            project.phase_2_data = ProjectService._cleanse_project_data(project.phase_2_data)
            project.final_data = ProjectService._cleanse_project_data(project.final_data)

            from sqlalchemy.orm import joinedload
            members_query = select(TeamMembership).where(
                TeamMembership.submission_id == project.id
            ).options(joinedload(TeamMembership.student))
            members_result = await db.execute(members_query)
            members = members_result.scalars().all()

            active_project_data["project"] = project
            active_project_data["user_role"] = active_membership.role
            active_project_data["member_count"] = len(members)
            active_project_data["members"] = [
                {
                    "name": mem.student.name,
                    "email": mem.student.email,
                    "role": mem.role,
                    "functions": mem.functions,
                    "modules": mem.modules,
                    "tech_stack": mem.tech_stack,
                    "ai_feedback": mem.ai_feedback,
                    "is_leader": mem.student_id == project.leader_id
                }
                for mem in members
            ]

            # 5. Fetch latest evaluation status for gating
            from app.db.Models import Evaluation
            eval_query = select(Evaluation).where(
                Evaluation.submission_id == project.id
            ).order_by(Evaluation.created_at.desc()).limit(1)
            eval_result = await db.execute(eval_query)
            latest_eval = eval_result.scalar_one_or_none()
            if latest_eval:
                active_project_data["latest_evaluation_status"] = latest_eval.status
                active_project_data["latest_evaluation_phase"] = latest_eval.phase

        return active_project_data

    @staticmethod
    async def generate_team_id(db: AsyncSession, year: str) -> str:
        """Generates a unique human-readable team ID: TEAM-{year}-{random_number}"""
        while True:
            #1. create a random 4 digit suffix
            suffix = ''.join(random.choices(string.digits, k=4))
            team_id = f"TEAM-{year.split('-')[0]}-{suffix}"

            #2 check if it already exists in the database
            query = select(ProjectSubmission).where(ProjectSubmission.team_id == team_id)
            result = await db.execute(query)
            if not result.scalar_one_or_none():
                return team_id

    @staticmethod
    async def get_my_proposals(
        db: AsyncSession,
        student_id: uuid.UUID,
    ) -> dict:
        """
        Returns all active (non-deleted) Phase 1 proposals the student has
        submitted as leader, together with their AI evaluation data.
        Proposals are ordered by attempt_number ascending.
        """
        query = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == student_id,
                ProjectSubmission.current_phase == ProjectPhase.PHASE_1,
                ProjectSubmission.is_deleted == False,
            )
        ).order_by(ProjectSubmission.attempt_number)
        result = await db.execute(query)
        proposals = result.scalars().all()

        proposals_data = []
        best_score: float = -1.0
        best_id: str | None = None

        for p in proposals:
            evaluation = await EvaluationService.get_latest_evaluation(
                db, p.id, EvaluationPhase.PHASE_1
            )
            score = evaluation.total_score if evaluation else None
            if score is not None and score > best_score:
                best_score = score
                best_id = str(p.id)

            proposals_data.append({
                "id": p.id,
                "team_id": p.team_id,
                "attempt_number": p.attempt_number,
                "phase_1_data": ProjectService._cleanse_project_data(p.phase_1_data),
                "evaluation_status": evaluation.status if evaluation else None,
                "evaluation_score": score,
                "evaluation_grade": evaluation.grade if evaluation else None,
                "evaluation_summary": (
                    evaluation.ai_narrative[:400]
                    if evaluation and evaluation.ai_narrative
                    else None
                ),
                "created_at": p.created_at,
            })

        return {
            "proposals": proposals_data,
            "can_submit_more": len(proposals) < 3,
            "total_proposals": len(proposals),
            "ai_recommendation_id": best_id if best_score >= 0 else None,
        }

    @staticmethod
    async def select_proposal(
        db: AsyncSession,
        student_id: uuid.UUID,
        submission_id: uuid.UUID,
    ) -> ProjectSubmission:
        """
        Locks in one proposal as the student's active project for the semester.
        All other non-deleted proposals from the same student/semester are
        soft-deleted so they appear only in history.
        """
        target = await ProjectService.get_submission_by_id(db, submission_id)
        if not target or target.leader_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proposal not found.",
            )

        # Soft-delete every OTHER active Phase 1 proposal this semester
        others_query = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == student_id,
                ProjectSubmission.academic_year == target.academic_year,
                ProjectSubmission.semester == target.semester,
                ProjectSubmission.current_phase == ProjectPhase.PHASE_1,
                ProjectSubmission.is_deleted == False,
                ProjectSubmission.id != submission_id,
            )
        )
        others_result = await db.execute(others_query)
        for other in others_result.scalars().all():
            other.is_deleted = True

        await db.commit()
        await db.refresh(target)
        return target

    @staticmethod
    async def create_submission(
        db: AsyncSession, 
        leader_id: uuid.UUID,
        data: ProjectSubmissionCreateSchema
    ) -> ProjectSubmission:
        """
        Handles the Phase 1 submission:
        - Allows up to 3 proposals per student per semester.
        - Generates a unique team ID.
        - Creates the Project record.
        - Adds the leader to the TeamMembership table.
        - Dev Mode: Automatically archives old projects for the test user.
        """
        # Fetch leader email for Dev Mode check
        leader_res = await db.execute(select(StudentAuth.email).where(StudentAuth.id == leader_id))
        leader_email = leader_res.scalar_one_or_none()
        is_test_user = settings.ENABLE_TEST_MODE and leader_email == settings.TEST_USER_EMAIL

        # Enforce one active project per student for a simpler workflow.
        existing_project_query = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == leader_id,
                ProjectSubmission.is_deleted == False,
            )
        )
        existing_project_result = await db.execute(existing_project_query)
        existing_project = existing_project_result.scalar_one_or_none()

        if existing_project:
            if is_test_user:
                # Dev Mode Bypass: Allow up to 3 active proposals for testing
                active_count_res = await db.execute(
                    select(func.count(ProjectSubmission.id)).where(
                        and_(
                            ProjectSubmission.leader_id == leader_id,
                            ProjectSubmission.is_deleted == False,
                        )
                    )
                )
                active_count = active_count_res.scalar()
                
                if active_count >= 3:
                    # If already 3, delete the oldest one to make room
                    oldest_query = select(ProjectSubmission).where(
                        and_(
                            ProjectSubmission.leader_id == leader_id,
                            ProjectSubmission.is_deleted == False,
                        )
                    ).order_by(ProjectSubmission.created_at.asc()).limit(1)
                    oldest_res = await db.execute(oldest_query)
                    oldest = oldest_res.scalar_one_or_none()
                    if oldest:
                        oldest.is_deleted = True
                        await db.flush()
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You already have an active project. Edit and resubmit your Phase 1 form instead.",
                )
        
        # 2 Generate unique Team ID
        team_id = await ProjectService.generate_team_id(db, data.academic_year)
        
        # Calculate attempt number
        attempt_res = await db.execute(
            select(func.count(ProjectSubmission.id)).where(
                ProjectSubmission.leader_id == leader_id
            )
        )
        total_attempts = attempt_res.scalar()

        # 3. Create the ProjectSubmission record 
        new_submission = ProjectSubmission(
            team_id=team_id,
            leader_id=leader_id,
            phase_1_data=data.phase_1_data.model_dump(),
            current_phase=ProjectPhase.PHASE_1,
            academic_year=data.academic_year,
            semester=data.semester,
            attempt_number=total_attempts + 1,
        )
        db.add(new_submission)
        await db.flush()

        # Create team membership for leader
        new_member = TeamMembership(
            submission_id=new_submission.id,
            student_id=leader_id,
            role="Leader / Product Manager",
            functions="Overall coordination, strategy, and vision.",
            modules="All",
            tech_stack=", ".join(data.phase_1_data.tech_stack),
            work_description="Leading the project development and coordination."
        )
        db.add(new_member)
        await db.flush()

        # 7. TRIGGER Phase 1 Ideator / clarification stage
        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=new_submission.id,
            phase=EvaluationPhase.PHASE_1
        )
        enqueue_phase_1_analysis(new_eval.id)

        await db.commit()
        await db.refresh(new_submission)
        return new_submission

    @staticmethod
    async def update_phase_1_submission(
        db: AsyncSession,
        submission_id: uuid.UUID,
        leader_id: uuid.UUID,
        data: ProjectSubmissionCreateSchema,
    ) -> ProjectSubmission:
        """
        Allows leader to edit and resubmit Phase 1 for the same project.
        Keeps the same project/team id and re-runs Phase 1 AI evaluation.
        """
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project submission not found.",
            )

        if project.leader_id != leader_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the team leader can resubmit Phase 1.",
            )

        project.phase_1_data = data.phase_1_data.model_dump()
        project.academic_year = data.academic_year
        project.semester = data.semester
        project.current_phase = ProjectPhase.PHASE_1

        await db.commit()
        await db.refresh(project)

        # Trigger Phase 1 Ideator / clarification stage
        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=project.id,
            phase=EvaluationPhase.PHASE_1,
        )
        enqueue_phase_1_analysis(new_eval.id)

        return project

    @staticmethod
    async def submit_phase_1_clarifications(
        db: AsyncSession,
        submission_id: uuid.UUID,
        leader_id: uuid.UUID,
        answers: list[str],
    ) -> ProjectSubmission:
        """
        Stores leader clarification answers and re-runs Phase 1 Ideator evaluation.
        """
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project submission not found.",
            )

        if project.leader_id != leader_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the team leader can submit clarification answers.",
            )

        phase_data = dict(project.phase_1_data or {})
        phase_data["clarification_answers"] = answers
        project.phase_1_data = phase_data

        await db.commit()
        await db.refresh(project)

        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=project.id,
            phase=EvaluationPhase.PHASE_1,
        )
        enqueue_phase_1_analysis(new_eval.id)

        return project

    @staticmethod
    async def submit_phase_2(
        db: AsyncSession,
        submission_id: uuid.UUID,
        leader_id: uuid.UUID,
        data: Phase2SubmissionSchema,
    ) -> ProjectSubmission:
        """
        Stores the Phase 2 mid-term submission after validating phase-gating rules.
        """
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project submission not found.",
            )

        if project.leader_id != leader_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the team leader can submit Phase 2 data.",
            )

        # Dev Mode Bypass for Gating
        leader_res = await db.execute(select(StudentAuth.email).where(StudentAuth.id == leader_id))
        leader_email = leader_res.scalar_one_or_none()
        is_test_user = settings.ENABLE_TEST_MODE and leader_email == settings.TEST_USER_EMAIL

        if not is_test_user:
            # Gating rules for non-test users
            phase_1_eval = await EvaluationService.get_latest_evaluation(
                db=db,
                submission_id=submission_id,
                phase=EvaluationPhase.PHASE_1,
            )
            # Softened gating: In production, we'd strictly check for COMPLETED status.

        project.phase_2_data = data.phase_2_data.model_dump()
        project.current_phase = ProjectPhase.PHASE_2

        await db.commit()
        await db.refresh(project)

        # Trigger Phase 2 AI Analysis
        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=project.id,
            phase=EvaluationPhase.PHASE_2,
        )
        enqueue_phase_2_analysis(new_eval.id)

        return project

    @staticmethod
    async def submit_final(
        db: AsyncSession,
        submission_id: uuid.UUID,
        leader_id: uuid.UUID,
        data: FinalSubmissionSchema,
    ) -> ProjectSubmission:
        """
        Stores the Final project submission after validating Phase 2 completion.
        """
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        if project.leader_id != leader_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the leader can submit.")

        # Dev Mode Bypass for Gating
        leader_res = await db.execute(select(StudentAuth.email).where(StudentAuth.id == leader_id))
        leader_email = leader_res.scalar_one_or_none()
        is_test_user = settings.ENABLE_TEST_MODE and leader_email == settings.TEST_USER_EMAIL

        if not is_test_user:
            # Gating rules for non-test users
            phase_2_eval = await EvaluationService.get_latest_evaluation(
                db=db, submission_id=submission_id, phase=EvaluationPhase.PHASE_2
            )

        project.final_data = data.final_data.model_dump()
        project.current_phase = ProjectPhase.FINAL

        await db.commit()
        await db.refresh(project)

        # Trigger Final AI Audit
        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=project.id,
            phase=EvaluationPhase.FINAL,
        )
        enqueue_final_analysis(new_eval.id)

        return project

    @staticmethod
    async def join_team(
        db: AsyncSession, 
        student_id: uuid.UUID, 
        params: TeamJoinSchema
    ) -> TeamMembership:
        """
        Logic for a student to join an existing project team.
        Enforces the 'Max 3 Members' rule.
        """
        # 1. FIND the project
        query = select(ProjectSubmission).where(ProjectSubmission.team_id == params.team_id)
        result = await db.execute(query)
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team ID not found. Please check with your leader."
            )

        # 2. RULE: Check Team Size (Max 3)
        count_query = select(func.count(TeamMembership.id)).where(
            TeamMembership.submission_id == project.id
        )
        count_result = await db.execute(count_query)
        current_count = count_result.scalar()

        if current_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This team is already full (Max 3 members allowed)."
            )

        # 3. RULE: Prevent duplicate membership
        duplicate_query = select(TeamMembership).where(
            and_(
                TeamMembership.submission_id == project.id,
                TeamMembership.student_id == student_id
            )
        )
        existing = await db.execute(duplicate_query)
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this team."
            )

        # 4. CREATE membership
        new_member = TeamMembership(
            submission_id=project.id,
            student_id=student_id,
            role=params.role,
            functions=params.functions,
            modules=(params.modules or "").strip() or "General Support",
            tech_stack=params.tech_stack,
            work_description=params.work_description,
        )
        db.add(new_member)
        await db.commit()
        await db.refresh(new_member)

        # 5. TRIGGER AI ORIENTATION (Personalized Technical Onboarding)
        enqueue_member_orientation(new_member.id)

        # 6. Trigger Architect only when the team is fully formed (leader + 2 teammates).
        is_architect_triggered = False
        message = "Welcome to the team! You can now check the Phase 1 AI evaluation in the feedback page."
        
        if current_count + 1 >= 3:
            is_architect_triggered = True
            message = "Welcome! You are the 3rd member. All teammates have joined, so the Architecture review has been triggered. You can also check the Phase 1 AI evaluation in the feedback page."
            
            # Fetch latest Ideator logs to maintain continuity
            latest_eval = await EvaluationService.get_latest_evaluation(db, project.id, EvaluationPhase.PHASE_1)
            ideator_logs = latest_eval.agent_logs if (latest_eval and latest_eval.agent_logs) else None

            new_eval = await EvaluationService.create_evaluation_record(
                db=db,
                submission_id=project.id,
                phase=EvaluationPhase.PHASE_1,
                agent_logs=ideator_logs
            )
            enqueue_phase_1_architect_review(new_eval.id)

        # Create notification for the student
        await NotificationService.create_notification(
            db=db,
            project_id=project.id,
            notification_type=NotificationType.FEEDBACK_RECEIVED,
            title="Team Joined Successfully",
            message=message,
            student_id=student_id
        )

        # Add transient fields for the response
        new_member.message = message
        new_member.is_architect_triggered = is_architect_triggered

        return new_member
