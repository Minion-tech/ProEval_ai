import asyncio
from importlib import import_module
import logging
from uuid import UUID

from app.core.config import settings
from app.services.evaluation_service import EvaluationService

logger = logging.getLogger(__name__)


def enqueue_phase_1_analysis(evaluation_id: UUID) -> None:
    _enqueue(
        "app.tasks.evaluation_tasks",
        "run_phase_1_analysis_task",
        evaluation_id,
        lambda: EvaluationService.run_phase_1_analysis(evaluation_id),
    )


def enqueue_phase_1_architect_review(evaluation_id: UUID) -> None:
    _enqueue(
        "app.tasks.evaluation_tasks",
        "run_phase_1_architect_review_task",
        evaluation_id,
        lambda: EvaluationService.run_phase_1_architect_review(evaluation_id),
    )


def enqueue_phase_2_analysis(evaluation_id: UUID) -> None:
    _enqueue(
        "app.tasks.evaluation_tasks",
        "run_phase_2_analysis_task",
        evaluation_id,
        lambda: EvaluationService.run_phase_2_analysis(evaluation_id),
    )


def enqueue_final_analysis(evaluation_id: UUID) -> None:
    _enqueue(
        "app.tasks.evaluation_tasks",
        "run_final_analysis_task",
        evaluation_id,
        lambda: EvaluationService.run_final_analysis(evaluation_id),
    )


def enqueue_member_orientation(member_id: UUID) -> None:
    _enqueue(
        "app.tasks.evaluation_tasks",
        "generate_member_orientation_task",
        member_id,
        lambda: EvaluationService.generate_member_orientation(member_id),
    )


def _enqueue(
    task_module: str,
    task_name: str,
    item_id: UUID,
    fallback_coro_factory,
) -> None:
    if settings.EVALUATION_QUEUE_ENABLED:
        try:
            task = getattr(import_module(task_module), task_name)
            task.delay(str(item_id))
            return
        except Exception as exc:
            logger.warning(
                "Celery queue unavailable; falling back to in-process task for %s: %s",
                item_id,
                exc,
            )

    asyncio.create_task(fallback_coro_factory())
