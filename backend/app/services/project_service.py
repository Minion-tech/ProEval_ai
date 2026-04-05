import uuid
import  random
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from fastapi import HTTPException, status
from typing import Optional

from app.db.Models import ProjectSubmission, TeamMembership, StudentAuth, ProjectPhase, GuideStatus, EvaluationPhase
from app.api.schemas.projects import ProjectSubmissionCreateSchema, TeamJoinSchema
from app.services.evaluation_service import EvaluationService
import asyncio

class ProjectService:
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
    async def create_submission(
        db: AsyncSession, 
        leader_id: uuid.UUID,
        data: ProjectSubmissionCreateSchema
    ) -> ProjectSubmission:
        """
        Handles the Phase 1 submission:
        - checks for existing-projects this semester.
        - generates a unique team ID.
        - creates the Project record
        - Adds the leader to the TeamMembership table.
        """
        #1.Rule: one project perr student per semester
        query = select(ProjectSubmission).where(
            and_(
                ProjectSubmission.leader_id == leader_id,
                ProjectSubmission.academic_year == data.academic_year,
                ProjectSubmission.semester == data.semester
            )
        )
        existing_project = await db.execute(query)
        if existing_project.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted a project for this semester."
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
            semester=data.semester
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
        return new_submission

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
        query = select(ProjectSubmission).where(ProjectSubmission.id == submission_id)
        result = await db.execute(query)
        project = result.scalar_one_or_none()

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
            modules=data.modules
        )
        db.add(new_member)
        await db.commit()
        await db.refresh(new_member)
        return new_member
