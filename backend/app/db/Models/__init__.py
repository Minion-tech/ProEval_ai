from app.db.Models.base import Base
from app.db.Models.users import AdminUser, StudentAuth, AdminRole, ProgrammeType, PreApprovedStudent
from app.db.Models.projects import ProjectSubmission, TeamMembership, ProjectPhase, AdminStatus
from app.db.Models.evaluation import Evaluation, EvaluationCriterionScore, MemberEvaluation, VivaQuestion, EvaluationPhase, EvaluationStatus
from app.db.Models.integerity import IntegrityFlag, IntegrityFlagType, IntegritySeverity
from app.db.Models.notifications import Notification, NotificationType

# Exporting these makes them easily accessible via 'from app.db.Models import ...'
__all__ = [
    "Base",
    "AdminUser",
    "StudentAuth",
    "AdminRole",
    "ProgrammeType",
    "PreApprovedStudent",
    "ProjectSubmission",
    "TeamMembership",
    "ProjectPhase",
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
