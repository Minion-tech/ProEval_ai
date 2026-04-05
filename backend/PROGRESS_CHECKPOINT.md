# ProEval Backend - Progress Checkpoint
**Date:** Friday, 3 April 2026
**Current Branch:** `student-authentication`

## 1. Project Architecture
- **Focus**: Pivoted from general research to **Student Project Evaluation**.
- **Lifecycle**: Implemented an **Iterative Phase-by-Phase** evaluation model (Phase 1, Phase 2, Final).
- **Fairness**: Integrated **Individual Member Contribution Tracking** and AI-verified alignment.

## 2. Database & Infrastructure
- **Database**: PostgreSQL (named `proeval`) is live on `127.0.0.1:5432`.
- **ORM**: SQLAlchemy 2.0 with **Async Session** management.
- **Migrations**: Alembic is initialized and the `head` revision has been applied (all tables created).
- **Config**: `.env` is configured with URL-encoded credentials for special characters.                

## 3. Core Models Implemented
- **Users**: `Faculty` (Admin/Guides) and `StudentAuth` (with `is_verified` status).
- **Projects**: `ProjectSubmission` (JSONB phase data) and `TeamMembership`.
- **AI Engine**: `Evaluation` (Phase-aware), `MemberEvaluation` (Individual), and `VivaQuestion`.
- **Integrity**: `IntegrityFlag` for plagiarism and AI-use detection.

## 4. Authentication & Security
- **Schemas**: Pydantic v2 models for `Register`, `Login`, and `OTPVerify`.
- **Security**: Password hashing via `bcrypt` and token generation via `PyJWT`.
- **Verification**: Built an **OTP-based Registration Flow** (Mocked in console for dev).
- **Service**: `AuthService` handles registration, temporary OTP storage, and user creation.

## 5. API Layer
- **Main App**: `app/main.py` is finalized with CORS and Router registration.
- **Routers**:
    - `auth.py`: Registration, Verification, Login.
    - `projects.py`: Phase 1 Submission logic.
- **Docs**: Interactive Swagger UI is available at `http://localhost:8000/docs`.

## 6. Next Steps (For Tomorrow)
1. **Manual Verification**: Run `tests/test_auth_manual.py` to confirm the full registration flow in the DB.
2. **Guide Dashboard**: Implement the `FACULTY` login and the "Guide Approval" logic for Phase 1.
3. **Email Service**: Replace the Mock OTP print with a real **Gmail SMTP** service.
4. **Project Logic**: Build the service to allow students to join teams via `team_id`.

---
**Status:** All systems green. Server is ready for the first student signup!
