from sqlalchemy.orm import joinedload
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.Models.users import Faculty, FacultyRole, PreApprovedStudent, StudentAuth
from app.db.Models.projects import ProjectSubmission, AdminStatus, ProjectPhase, TeamMembership
from app.api.schemas.admin import (
    FacultyCreateSchema, 
    AdminReplaceGuideSchema, 
    AdminProjectActionSchema, 
    BulkStudentUploadSchema,
    GuideProfileResponseSchema
)
from app.core.security import get_password_hash
from fastapi import HTTPException, status
from typing import List
from uuid import UUID

class AdminService:
    @staticmethod
    async def create_faculty(db: AsyncSession, faculty_data: FacultyCreateSchema) -> Faculty:
        """Create a new Faculty account. Only for Admins to use."""
        
        # 1. Check if email already exists
        result = await db.execute(select(Faculty).where(Faculty.email == faculty_data.email))
        existing_faculty = result.scalar_one_or_none()
        
        if existing_faculty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A faculty member with this email already exists."
            )
        
        # 2. Hash the password for security
        hashed_password = get_password_hash(faculty_data.password)
        
        # 3. Create the new Faculty record (always as FACULTY role)
        new_faculty = Faculty(
            name=faculty_data.name,
            email=faculty_data.email,
            password_hash=hashed_password,
            department=faculty_data.department,
            specialization=faculty_data.specialization,
            role=FacultyRole.FACULTY
        )
        
        # 4. Save to the database
        db.add(new_faculty)
        await db.commit()
        await db.refresh(new_faculty)
        
        return new_faculty

    @staticmethod
    async def get_all_faculty(db: AsyncSession) -> List[Faculty]:
        """Get a list of all faculty members (excluding admins)."""
        result = await db.execute(
            select(Faculty).where(Faculty.role == FacultyRole.FACULTY)
        )
        return list(result.scalars().all())

    @staticmethod
    async def reassign_guide(db: AsyncSession, project_id: UUID, payload: AdminReplaceGuideSchema) -> ProjectSubmission:
        """Forcibly reassign a new guide to a project."""
        # 1. Find the project
        project = await db.get(ProjectSubmission, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
        # 2. Find the new guide
        guide = await db.get(Faculty, payload.new_guide_id)
        if not guide or guide.role != FacultyRole.FACULTY:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New guide not found or invalid role")
        
        # 3. Update the project
        project.guide_id = payload.new_guide_id
        
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def update_project_status(db: AsyncSession, project_id: UUID, payload: AdminProjectActionSchema) -> ProjectSubmission:
        """Admin's decision on a project (Approve, Reject, or Revision)."""
        project = await db.get(ProjectSubmission, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
        # Map AdminDecision (Schema) to AdminStatus (Model)
        project.admin_status = payload.action.value
        project.admin_feedback = payload.feedback
        
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def get_all_projects(db: AsyncSession) -> List[ProjectSubmission]:
        """Get a list of all active project submissions for the institution."""
        result = await db.execute(
            select(ProjectSubmission).where(ProjectSubmission.is_deleted == False)
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: UUID) -> dict:
        """
        Soft-delete a project submission.
        This unlinks it from the active status so students can submit again,
        but keeps the record for history.
        """
        project = await db.get(ProjectSubmission, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
        # 1. Mark as deleted
        project.is_deleted = True
        project.deleted_by_admin = True
        
        # 2. We don't necessarily need to delete TeamMembership if we filter them out in get_my_project,
        # but to be safe and "reset" the student dashboard, we can either delete them or 
        # ensure get_my_project ignores memberships of deleted projects.
        # Let's keep memberships but ensure they don't count as "active".
        
        await db.commit()
        return {"message": "Project successfully deleted by admin. Student dashboard reset."}

    @staticmethod
    async def upload_students(db: AsyncSession, data: BulkStudentUploadSchema):
        """Bulk upload university enrollment records for registration validation."""
        count = 0
        for s_data in data.students:
            # Check if student is already in the whitelist
            query = select(PreApprovedStudent).where(PreApprovedStudent.enrollment_no == s_data.enrollment_no)
            existing = await db.execute(query)
            if existing.scalar_one_or_none():
                continue
            
            new_entry = PreApprovedStudent(
                name=s_data.name,
                enrollment_no=s_data.enrollment_no,
                email=s_data.email,
                programme=s_data.programme,
                department=s_data.department,
                batch=s_data.batch
            )
            db.add(new_entry)
            count += 1
        
        await db.commit()
        return {"message": f"Successfully added {count} new student enrollment records."}

    @staticmethod
    async def get_all_preapproved_students(db: AsyncSession) -> List[PreApprovedStudent]:
        """Get all university enrollment records used for registration validation."""
        result = await db.execute(select(PreApprovedStudent))
        return list(result.scalars().all())

    @staticmethod
    async def get_registered_students(db: AsyncSession) -> List[StudentAuth]:
        """Get student accounts that have completed registration."""
        result = await db.execute(select(StudentAuth))
        return list(result.scalars().all())

    @staticmethod
    async def get_guide_load(db: AsyncSession) -> List[dict]:
        """Calculates current project count for every faculty member (Decision Support)."""
        # 1. Fetch all faculty members (who are not admins)
        faculty_query = select(Faculty).where(Faculty.role == FacultyRole.FACULTY)
        faculty_result = await db.execute(faculty_query)
        faculty_members = faculty_result.scalars().all()

        load_data = []
        for f in faculty_members:
            # 2. Count active projects for this specific faculty member
            # An active project is one where they are the guide
            project_count_query = select(func.count(ProjectSubmission.id)).where(
                ProjectSubmission.guide_id == f.id
            )
            count_result = await db.execute(project_count_query)
            count = count_result.scalar()

            # 3. Bundle it up into a nice report
            load_data.append({
                "faculty_id": str(f.id),
                "name": f.name,
                "email": f.email,
                "specialization": f.specialization,
                "current_load": count,
                "max_load": 5 
            })
        
        return load_data

    @staticmethod
    async def get_overview(db: AsyncSession) -> dict:
        """Calculates high-level stats for the Admin Dashboard."""
        # 1. Count registered students
        student_count = await db.execute(select(func.count(StudentAuth.id)))
        # 2. Count faculty members
        faculty_count = await db.execute(select(func.count(Faculty.id)).where(Faculty.role == FacultyRole.FACULTY))
        # 3. Count total project submissions
        project_count = await db.execute(select(func.count(ProjectSubmission.id)))
        
        return {
            "total_students": student_count.scalar() or 0,
            "total_faculty": faculty_count.scalar() or 0,
            "active_projects": project_count.scalar() or 0,
            "unresolved_flags": 0 
        }

    @staticmethod
    async def get_guide_profile(db: AsyncSession, guide_id: UUID) -> dict:
        """Fetch a full report on a guide and their assigned student teams."""
        # 1. Fetch the guide
        guide = await db.get(Faculty, guide_id)
        if not guide:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

        # 2. Fetch all projects for this guide with their members and student details
        query = select(ProjectSubmission).where(
            ProjectSubmission.guide_id == guide_id
        ).options(
            joinedload(ProjectSubmission.members).joinedload(TeamMembership.student)
        )
        result = await db.execute(query)
        projects = result.unique().scalars().all()

        # 3. Format the project data for the frontend
        formatted_projects = []
        for p in projects:
            leader_name = "Unknown"
            teammates = []
            
            for m in p.members:
                if m.student_id == p.leader_id:
                    leader_name = m.student.name
                else:
                    teammates.append(m.student.name)

            formatted_projects.append({
                "semester": p.semester,
                "academic_year": p.academic_year,
                "team_id": p.team_id,
                "student_leader": leader_name,
                "teammates": teammates,
                "topic_name": p.phase_1_data.get("title", "Untitled") if p.phase_1_data else "Untitled",
                "current_phase": p.current_phase.value,
                "phase_1_submitted": p.phase_1_data is not None,
                "phase_2_submitted": p.phase_2_data is not None,
                "final_submitted": p.final_data is not None
            })

        return {
            "id": guide.id,
            "name": guide.name,
            "email": guide.email,
            "department": guide.department,
            "specialization": guide.specialization,
            "is_active": True,
            "projects": formatted_projects
        }
