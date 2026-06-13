from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "proeval",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.evaluation_tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=900,
    task_soft_time_limit=840,
)
