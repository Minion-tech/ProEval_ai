from app.db.Models.base import Base
from app.db.Models.users import Faculty, StudentAuth, FacultyRole, ProgrammeType, PreApprovedStudent
from app.db.Models.projects import ProjectSubmission, TeamMembership, ProjectPhase, GuideStatus, AdminStatus
from app.db.Models.evaluation import Evaluation, EvaluationCriterionScore, MemberEvaluation, VivaQuestion, EvaluationPhase, EvaluationStatus
from app.db.Models.integerity import IntegrityFlag, IntegrityFlagType, IntegritySeverity
from app.db.Models.notifications import Notification, NotificationType

# Exporting these makes them easily accessible via 'from app.db.Models import ...'
__all__ = [
    "Base",
    "Faculty",
    "StudentAuth",
    "FacultyRole",
    "ProgrammeType",
    "PreApprovedStudent",
    "ProjectSubmission",
    "TeamMembership",
    "ProjectPhase",
    "GuideStatus",
    "AdminStatus",
    "Evaluation",
    "EvaluationCriterionScore",
    "MemberEvaluation",
    "VivaQuestion",
    "EvaluationPhase",
    "EvaluationStatus",
    "IntegrityFlag",
    "IntegrityFlagType",
    "IntegritySeverity",
    "Notification",
    "NotificationType",
]
