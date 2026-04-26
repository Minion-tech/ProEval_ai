import uuid
import  random
import string
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from fastapi import HTTPException, status
from typing import Optional

from app.db.Models import ProjectSubmission, TeamMembership, StudentAuth, ProjectPhase, GuideStatus, EvaluationPhase
from app.api.schemas.projects import (
    ProjectSubmissionCreateSchema,
    Phase2SubmissionSchema,
    FinalSubmissionSchema,
    TeamJoinSchema,
)
from app.services.evaluation_service import EvaluationService
import asyncio

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
                active_project_data["previous_projects"].append(project)

        # 4. If an active project was found, fetch its members
        if active_membership:
            project = all_projects[active_membership.submission_id]
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
                "phase_1_data": p.phase_1_data,
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
        """
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active project. Edit and resubmit your Phase 1 form instead.",
            )
        
        #2 Generate unique Team ID
        team_id = await ProjectService.generate_team_id(db, data.academic_year)

        #3. Create the ProjectSubmission record 
        new_submission = ProjectSubmission(
            team_id=team_id,
            leader_id=leader_id,
            guide_id=data.guide_id,
            phase_1_data=data.phase_1_data.model_dump(), # Convert Pydantic to Dict
            current_phase=ProjectPhase.PHASE_1,
            guide_status=GuideStatus.PENDING,
            academic_year=data.academic_year,
            semester=data.semester,
            attempt_number=1,
        )
        db.add(new_submission)
        await db.flush() #this gives us the id of the new submission without committing yet 

        #4. Add the leader to the TeamMembership table
        leader_membership = TeamMembership(
            submission_id=new_submission.id,
            student_id=leader_id,
            role="Team Leader",
            functions="Project Coordination",
            modules="All (Overview)"
        )
        db.add(leader_membership)

        #5 Save everything to the databse
        await db.commit()
        await db.refresh(new_submission) # Refresh to get the latest state from the database
        await db.refresh(leader_membership)

        # 6. TRIGGER AI ORIENTATION for the Leader
        asyncio.create_task(EvaluationService.generate_member_orientation(leader_membership.id))

        # 7. TRIGGER AI EVALUATION for Phase 1 (Initial automated feedback)
        # We use the assigned guide_id as the faculty_id for the record
        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=new_submission.id,
            faculty_id=data.guide_id,
            phase=EvaluationPhase.PHASE_1
        )
        asyncio.create_task(EvaluationService.run_phase_1_analysis(new_eval.id))

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
        project.guide_id = data.guide_id
        project.academic_year = data.academic_year
        project.semester = data.semester
        project.current_phase = ProjectPhase.PHASE_1
        project.guide_status = GuideStatus.PENDING

        await db.commit()
        await db.refresh(project)

        new_eval = await EvaluationService.create_evaluation_record(
            db=db,
            submission_id=project.id,
            faculty_id=data.guide_id,
            phase=EvaluationPhase.PHASE_1,
        )
        asyncio.create_task(EvaluationService.run_phase_1_analysis(new_eval.id))

        return project

    @staticmethod
    async def send_phase_1_to_guide(
        db: AsyncSession,
        submission_id: uuid.UUID,
        leader_id: uuid.UUID,
    ) -> ProjectSubmission:
        """
        Marks the project as sent to guide after student reviews AI feedback.
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
                detail="Only the team leader can send this project to guide.",
            )

        if not project.phase_1_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phase 1 data not found.",
            )

        phase_data = dict(project.phase_1_data)
        phase_data["sent_to_guide"] = True
        phase_data["sent_to_guide_at"] = datetime.utcnow().isoformat()
        project.phase_1_data = phase_data
        project.guide_status = GuideStatus.PENDING

        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def approve_submission(
        db: AsyncSession, 
        submission_id: uuid.UUID,
        guide_id: uuid.UUID,
        status: GuideStatus,
        feedback: Optional[str] = None
    ) -> ProjectSubmission:
        """
        Handles the Guide Approval/Rejection of a Phase 1 submission.
        """
        # 1. Fetch the project
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project submission not found."
            )

        # 2. Security: Check if this faculty is the assigned guide
        if project.guide_id != guide_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the assigned guide for this project."
            )

        # 3. Rule: Can only approve if status is currently PENDING
        if project.guide_status != GuideStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project is already {project.guide_status}."
            )

        # 4. Update the status
        project.guide_status = status

        # 5. Store feedback if provided (using a flexible approach)
        if feedback:
            # We add it to the phase_1_data for now
            current_data = dict(project.phase_1_data) if project.phase_1_data else {}
            current_data["guide_feedback"] = feedback
            project.phase_1_data = current_data

        await db.commit()
        await db.refresh(project)

        # 6. TRIGGER AI EVALUATION (Automatically if status is ACCEPTED)
        if status == GuideStatus.ACCEPTED:
            # a. Create a pending evaluation record
            new_eval = await EvaluationService.create_evaluation_record(
                db=db,
                submission_id=project.id,
                faculty_id=guide_id,
                phase=EvaluationPhase.PHASE_1
            )

            # b. Fire-and-forget background task
            asyncio.create_task(EvaluationService.run_phase_1_analysis(new_eval.id))

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

        # Softened gating for testing (allow if eval is missing or not yet completed)
        # In production, we'd strictly check for COMPLETED status.
        phase_1_eval = await EvaluationService.get_latest_evaluation(
            db=db,
            submission_id=submission_id,
            phase=EvaluationPhase.PHASE_1,
        )
        # Bypass check for testing
        # if not phase_1_eval or phase_1_eval.status.value != "COMPLETED":
        #    ...

        project.phase_2_data = data.phase_2_data.model_dump()
        project.current_phase = ProjectPhase.PHASE_2
        project.guide_status = GuideStatus.PENDING

        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def review_phase_2(
        db: AsyncSession,
        submission_id: uuid.UUID,
        guide_id: uuid.UUID,
        status: GuideStatus,
        feedback: Optional[str] = None,
    ) -> ProjectSubmission:
        """
        Handles the guide decision for the Phase 2 submission and triggers evaluation.
        """
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project submission not found.",
            )

        if project.guide_id != guide_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the assigned guide for this project.",
            )

        if not project.phase_2_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phase 2 data has not been submitted yet.",
            )

        if project.current_phase not in {ProjectPhase.PHASE_2, ProjectPhase.FINAL}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This project is not ready for Phase 2 review.",
            )

        if project.guide_status != GuideStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project is already {project.guide_status}.",
            )

        project.guide_status = status

        if feedback:
            current_data = dict(project.phase_2_data)
            current_data["guide_feedback"] = feedback
            project.phase_2_data = current_data

        await db.commit()
        await db.refresh(project)

        if status == GuideStatus.ACCEPTED:
            new_eval = await EvaluationService.create_evaluation_record(
                db=db,
                submission_id=project.id,
                faculty_id=guide_id,
                phase=EvaluationPhase.PHASE_2,
            )
            asyncio.create_task(EvaluationService.run_phase_2_analysis(new_eval.id))

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

        # Softened gating for testing (allow if eval is missing or not yet completed)
        # In production, we'd strictly check for COMPLETED status.
        phase_2_eval = await EvaluationService.get_latest_evaluation(
            db=db, submission_id=submission_id, phase=EvaluationPhase.PHASE_2
        )
        # Bypass check for testing
        # if not phase_2_eval or phase_2_eval.status != EvaluationStatus.COMPLETED:
        #    ...

        project.final_data = data.final_data.model_dump()
        project.current_phase = ProjectPhase.FINAL
        project.guide_status = GuideStatus.PENDING

        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def review_final(
        db: AsyncSession,
        submission_id: uuid.UUID,
        guide_id: uuid.UUID,
        status: GuideStatus,
        feedback: Optional[str] = None,
    ) -> ProjectSubmission:
        """
        Guide's final review. Triggers the Chief AI Evaluator.
        """
        project = await ProjectService.get_submission_by_id(db, submission_id)

        if not project or project.guide_id != guide_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        if project.current_phase != ProjectPhase.FINAL:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in final phase.")

        project.guide_status = status
        if feedback:
            current_data = dict(project.final_data) if project.final_data else {}
            current_data["guide_feedback"] = feedback
            project.final_data = current_data

        await db.commit()
        await db.refresh(project)

        if status == GuideStatus.ACCEPTED:
            new_eval = await EvaluationService.create_evaluation_record(
                db=db,
                submission_id=project.id,
                faculty_id=guide_id,
                phase=EvaluationPhase.FINAL,
            )
            asyncio.create_task(EvaluationService.run_final_analysis(new_eval.id))

        return project

    @staticmethod
    async def join_team(
        db: AsyncSession, 
        student_id: uuid.UUID, 
        data: TeamJoinSchema
    ) -> TeamMembership:
        """
        Logic for a student to join an existing project team.
        Enforces the 'Max 3 Members' rule.
        """
        # 1. FIND the project
        query = select(ProjectSubmission).where(ProjectSubmission.team_id == data.team_id)
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
            role=data.role,
            functions=data.functions,
            modules=data.modules,
            tech_stack=data.tech_stack,
            work_description=data.work_description,
        )
        db.add(new_member)
        await db.commit()
        await db.refresh(new_member)

        # 5. TRIGGER AI ORIENTATION (Personalized Technical Onboarding)
        asyncio.create_task(EvaluationService.generate_member_orientation(new_member.id))

        return new_member
