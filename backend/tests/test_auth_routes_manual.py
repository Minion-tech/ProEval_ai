import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from fastapi import HTTPException

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.api.deps import get_current_faculty, get_current_student, get_current_user
from app.db.Models import Faculty, FacultyRole, GuideStatus, ProgrammeType, StudentAuth
from app.db.session import get_db
from app.main import app
from app.services.project_service import ProjectService


async def override_get_db():
    """Dummy DB dependency so route tests do not require PostgreSQL."""
    yield object()


def build_student() -> StudentAuth:
    return StudentAuth(
        id=uuid.uuid4(),
        name="Test Student",
        email="student@university.edu",
        enrollment_no="BT2026001",
        password_hash="hashed-password",
        programme=ProgrammeType.BTECH,
        department="Computer Science",
        batch="2024-2028",
        is_verified=True,
    )


def build_faculty() -> Faculty:
    return Faculty(
        id=uuid.uuid4(),
        name="Dr. Guide",
        email="guide@university.edu",
        password_hash="hashed-password",
        role=FacultyRole.FACULTY,
        department="Computer Science",
    )


def build_project_response(student: StudentAuth, faculty: Faculty) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        team_id="TEAM-2025-1234",
        leader_id=student.id,
        guide_id=faculty.id,
        current_phase="PHASE_1",
        guide_status="PENDING",
        academic_year="2025-26",
        semester=6,
        created_at=datetime.now(timezone.utc),
    )


@contextmanager
def dependency_scope(overrides):
    """
    Temporarily register FastAPI dependency overrides for one test block.
    """
    original_overrides = app.dependency_overrides.copy()
    try:
        app.dependency_overrides.update(overrides)
        yield
    finally:
        app.dependency_overrides = original_overrides


def test_auth_me_for_student(client: TestClient, student: StudentAuth) -> None:
    with dependency_scope(
        {
            get_db: override_get_db,
            get_current_user: lambda: student,
        }
    ):
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["email"] == student.email
    assert payload["role"] == "STUDENT"
    assert payload["enrollment_no"] == student.enrollment_no


def test_student_cannot_approve_project(client: TestClient, student: StudentAuth) -> None:
    with dependency_scope(
        {
            get_db: override_get_db,
            get_current_faculty: lambda: (_ for _ in ()).throw(
                HTTPException(status_code=403, detail="Faculty access required.")
            ),
        }
    ):
        response = client.patch(
            f"/api/v1/projects/{uuid.uuid4()}/approve",
            params={"status": GuideStatus.ACCEPTED.value},
        )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Faculty access required."


def test_faculty_cannot_create_project(client: TestClient, faculty: Faculty) -> None:
    with dependency_scope(
        {
            get_db: override_get_db,
            get_current_student: lambda: (_ for _ in ()).throw(
                HTTPException(status_code=403, detail="Student access required.")
            ),
        }
    ):
        response = client.post(
            "/api/v1/projects/",
            json={
                "guide_id": str(faculty.id),
                "academic_year": "2025-26",
                "semester": 6,
                "phase_1_data": {
                    "title": "AI Smart Traffic Management System",
                    "abstract": "This project uses camera feeds and machine learning to predict campus congestion and optimize traffic flow across university gates and parking zones.",
                    "domain": "Artificial Intelligence",
                    "objectives": ["Reduce congestion", "Predict peak load"],
                    "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
                },
            },
        )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Student access required."


def test_student_can_create_project(
    client: TestClient,
    student: StudentAuth,
    faculty: Faculty,
) -> None:
    project_response = build_project_response(student, faculty)

    with dependency_scope(
        {
            get_db: override_get_db,
            get_current_student: lambda: student,
        }
    ):
        with patch.object(
            ProjectService,
            "create_submission",
            new=AsyncMock(return_value=project_response),
        ) as mocked_create:
            response = client.post(
                "/api/v1/projects/",
                json={
                    "guide_id": str(faculty.id),
                    "academic_year": "2025-26",
                    "semester": 6,
                    "phase_1_data": {
                        "title": "AI Smart Traffic Management System",
                        "abstract": "This project uses camera feeds and machine learning to predict campus congestion and optimize traffic flow across university gates and parking zones.",
                        "domain": "Artificial Intelligence",
                        "objectives": ["Reduce congestion", "Predict peak load"],
                        "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
                    },
                },
            )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["leader_id"] == str(student.id)
    assert payload["guide_id"] == str(faculty.id)
    assert payload["team_id"] == "TEAM-2025-1234"
    mocked_create.assert_awaited_once()


def main() -> None:
    student = build_student()
    faculty = build_faculty()

    with TestClient(app) as client:
        print("Running manual auth route checks...")

        test_auth_me_for_student(client, student)
        print("PASS: GET /api/v1/auth/me returns the authenticated student profile")

        test_student_cannot_approve_project(client, student)
        print("PASS: Student is blocked from faculty-only approval route")

        test_faculty_cannot_create_project(client, faculty)
        print("PASS: Faculty is blocked from student-only project submission route")

        test_student_can_create_project(client, student, faculty)
        print("PASS: Student can create a project when authenticated")

        print("All manual auth route tests passed.")


if __name__ == "__main__":
    main()
