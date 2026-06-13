import asyncio
import sys
from uuid import UUID

from app.services.evaluation_service import EvaluationService
from app.tasks.celery_app import celery_app
from app.db.session import engine as db_engine

def run_async_task(coro):
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Critical Fix for Celery + AsyncPG:
    # We must explicitly dispose of the SQLAlchemy engine pool before starting
    # the task in a new thread/loop, otherwise asyncpg tries to use the main 
    # thread's loop and crashes with "attached to a different loop".
    import app.db.session as db_session_module
    if db_session_module.engine is not None:
        loop.run_until_complete(db_session_module.engine.dispose())
        # Force re-creation of engine for this thread
        db_session_module.engine = None 
        db_session_module.AsyncSessionLocal = None

    try:
        return loop.run_until_complete(coro)
    finally:
        # Cleanup
        if db_session_module.engine is not None:
            loop.run_until_complete(db_session_module.engine.dispose())
        loop.close()

@celery_app.task(
    name="evaluations.run_phase_1_analysis",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def run_phase_1_analysis_task(evaluation_id: str) -> None:
    run_async_task(EvaluationService.run_phase_1_analysis(UUID(evaluation_id)))


@celery_app.task(
    name="evaluations.run_phase_1_architect_review",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def run_phase_1_architect_review_task(evaluation_id: str) -> None:
    run_async_task(EvaluationService.run_phase_1_architect_review(UUID(evaluation_id)))


@celery_app.task(
    name="evaluations.run_phase_2_analysis",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def run_phase_2_analysis_task(evaluation_id: str) -> None:
    run_async_task(EvaluationService.run_phase_2_analysis(UUID(evaluation_id)))


@celery_app.task(
    name="evaluations.run_final_analysis",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def run_final_analysis_task(evaluation_id: str) -> None:
    run_async_task(EvaluationService.run_final_analysis(UUID(evaluation_id)))


@celery_app.task(
    name="evaluations.generate_member_orientation",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def generate_member_orientation_task(member_id: str) -> None:
    run_async_task(EvaluationService.generate_member_orientation(UUID(member_id)))
