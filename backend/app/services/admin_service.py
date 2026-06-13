from sqlalchemy.orm import joinedload
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.Models.users import AdminUser, AdminRole, PreApprovedStudent, StudentAuth
from app.db.Models.projects import ProjectSubmission, AdminStatus, ProjectPhase, TeamMembership
from app.db.Models.evaluation import Evaluation, EvaluationPhase, MemberEvaluation, VivaQuestion
from app.api.schemas.admin import (
    AdminCreateSchema, 
    AdminProjectActionSchema, 
    BulkStudentUploadSchema
)
from app.core.security import get_password_hash
from fastapi import HTTPException, status
from typing import List
from uuid import UUID

class AdminService:
    @staticmethod
    async def create_admin(db: AsyncSession, admin_data: AdminCreateSchema) -> AdminUser:
        """Create a new Admin account."""
        
        # 1. Check if email already exists
        result = await db.execute(select(AdminUser).where(AdminUser.email == admin_data.email))
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An admin with this email already exists."
            )
        
        # 2. Hash the password for security
        hashed_password = get_password_hash(admin_data.password)
        
        # 3. Create the new Admin record
        new_admin = AdminUser(
            name=admin_data.name,
            email=admin_data.email,
            password_hash=hashed_password,
            department=admin_data.department,
            role=AdminRole.ADMIN
        )
        
        # 4. Save to the database
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        
        return new_admin

    @staticmethod
    async def get_all_admins(db: AsyncSession) -> List[AdminUser]:
        """Get a list of all administrators."""
        result = await db.execute(select(AdminUser))
        return list(result.scalars().all())

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
    def _evaluation_payload(evaluation: Evaluation, project: ProjectSubmission | None = None) -> dict:
        submission = project or evaluation.submission
        phase_1_data = submission.phase_1_data if submission else {}
        leader_name = submission.leader.name if submission and submission.leader else "Unknown"

        return {
            "id": evaluation.id,
            "submission_id": evaluation.submission_id,
            "project_id": evaluation.submission_id,
            "project_title": (phase_1_data or {}).get("title", "Untitled"),
            "team_id": submission.team_id if submission else None,
            "team_leader_name": leader_name,
            "semester": submission.semester if submission else None,
            "academic_year": submission.academic_year if submission else None,
            "phase": evaluation.phase,
            "status": evaluation.status,
            "total_score": evaluation.total_score,
            "grade": evaluation.grade,
            "ai_narrative": evaluation.ai_narrative,
            "agent_logs": evaluation.agent_logs,
            "roadmap_json": getattr(evaluation, "roadmap_json", None),
            "created_at": evaluation.created_at,
            "updated_at": evaluation.updated_at,
        }

    @staticmethod
    async def get_all_evaluations(db: AsyncSession) -> list[dict]:
        """Get institution-wide evaluation records with project context."""
        from app.db.Models import EvaluationStatus
        result = await db.execute(
            select(Evaluation)
            .join(ProjectSubmission, Evaluation.submission_id == ProjectSubmission.id)
            .options(
                joinedload(Evaluation.submission).joinedload(ProjectSubmission.leader)
            )
            .where(
                ProjectSubmission.is_deleted == False,
                Evaluation.status == EvaluationStatus.COMPLETED
            )
            .order_by(Evaluation.created_at.desc())
        )
        return [AdminService._evaluation_payload(evaluation) for evaluation in result.scalars().all()]

    @staticmethod
    async def get_project_evaluations(db: AsyncSession, project_id: UUID) -> list[dict]:
        """Get all evaluation records for one project submission."""
        project_result = await db.execute(
            select(ProjectSubmission)
            .options(joinedload(ProjectSubmission.leader))
            .where(ProjectSubmission.id == project_id, ProjectSubmission.is_deleted == False)
        )
        project = project_result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        result = await db.execute(
            select(Evaluation)
            .where(Evaluation.submission_id == project_id)
            .order_by(Evaluation.created_at.desc())
        )
        return [AdminService._evaluation_payload(evaluation, project) for evaluation in result.scalars().all()]

    @staticmethod
    async def get_evaluation_detail(db: AsyncSession, submission_id: UUID, phase: EvaluationPhase) -> dict:
        """Get the latest complete evaluation for a submission and phase."""
        project_result = await db.execute(
            select(ProjectSubmission)
            .options(joinedload(ProjectSubmission.leader))
            .where(ProjectSubmission.id == submission_id, ProjectSubmission.is_deleted == False)
        )
        project = project_result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        result = await db.execute(
            select(Evaluation)
            .where(Evaluation.submission_id == submission_id, Evaluation.phase == phase)
            .order_by(Evaluation.created_at.desc())
        )
        evaluation = result.scalars().first()
        if not evaluation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

        return AdminService._evaluation_payload(evaluation, project)

    @staticmethod
    async def delete_evaluation(db: AsyncSession, evaluation_id: UUID) -> dict:
        """Delete an evaluation record."""
        evaluation = await db.get(Evaluation, evaluation_id)
        if not evaluation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
        
        # Delete the evaluation
        await db.delete(evaluation)
        await db.commit()
        return {"message": "Evaluation successfully deleted."}

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
    async def delete_preapproved_student(db: AsyncSession, student_id: UUID) -> dict:
        """Delete a pre-approved student record."""
        student = await db.get(PreApprovedStudent, student_id)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pre-approved student not found")
        
        await db.delete(student)
        await db.commit()
        return {"message": "Pre-approved student record removed."}

    @staticmethod
    async def get_overview(db: AsyncSession) -> dict:
        """Calculates high-level stats for the Admin Dashboard."""
        # 1. Count registered students
        student_count_res = await db.execute(select(func.count(StudentAuth.id)))
        # 2. Count admin users
        admin_count_res = await db.execute(select(func.count(AdminUser.id)))
        # 3. Count only active project submissions
        project_count_res = await db.execute(
            select(func.count(ProjectSubmission.id)).where(ProjectSubmission.is_deleted == False)
        )
        
        return {
            "total_students": student_count_res.scalar() or 0,
            "total_admins": admin_count_res.scalar() or 0,
            "active_projects": project_count_res.scalar() or 0,
            "unresolved_flags": 0 
        }

    @staticmethod
    async def delete_student(db: AsyncSession, student_id: UUID) -> dict:
        """Delete a student and remove all related data: team memberships, member evaluations,
        viva questions, evaluations for projects they lead, and their project submissions.
        This is a hard delete intended for admin use only.
        """
        student = await db.get(StudentAuth, student_id)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        # 1. Remove member evaluations linked to this student's memberships
        mem_query = select(TeamMembership).where(TeamMembership.student_id == student_id)
        mem_res = await db.execute(mem_query)
        memberships = mem_res.scalars().all()

        for membership in memberships:
            # delete MemberEvaluation instances tied to this membership (and their viva questions via cascade)
            me_query = select(MemberEvaluation).where(MemberEvaluation.membership_id == membership.id)
            me_res = await db.execute(me_query)
            member_evals = me_res.scalars().all()
            for me in member_evals:
                # VivaQuestion relationship is configured with cascade on MemberEvaluation, but remove explicitly
                vq_query = select(VivaQuestion).where(VivaQuestion.member_evaluation_id == me.id)
                vq_res = await db.execute(vq_query)
                for vq in vq_res.scalars().all():
                    await db.delete(vq)
                await db.delete(me)

            # delete the membership itself
            await db.delete(membership)

        # 2. Remove projects where the student is the leader (and their evaluations)
        proj_query = select(ProjectSubmission).where(ProjectSubmission.leader_id == student_id)
        proj_res = await db.execute(proj_query)
        projects = proj_res.scalars().all()

        for project in projects:
            # delete evaluations for the project (these cascade to their child rows)
            eval_query = select(Evaluation).where(Evaluation.submission_id == project.id)
            eval_res = await db.execute(eval_query)
            for ev in eval_res.scalars().all():
                await db.delete(ev)

            # delete the project (this will remove members via cascade)
            await db.delete(project)

        # 3. Finally delete the student account
        await db.delete(student)
        await db.commit()

        return {"message": "Student and all related data removed."}
