import uuid
import  random
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status

from app.db.Models import ProjectSubmission, TeamMembership, StudentAuth, ProjectPhase, GuideStatus
from app.api.schemas.projects import ProjectSubmissionCreateSchema

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
        # the leader is alwayes the first member of the team
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