"""add awaiting_clarification to evaluationstatus

Revision ID: 195947616825
Revises: 640740b3e1b7
Create Date: 2026-05-06 18:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '195947616825'
down_revision: Union[str, Sequence[str], None] = '640740b3e1b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use op.execute to add the value to the enum type
    # Postgres doesn't allow adding values to enums inside a transaction block in some cases,
    # but for simple additions it's usually okay if handled correctly.
    # However, for safety in Alembic with Postgres:
    op.execute("COMMIT")
    op.execute("ALTER TYPE evaluationstatus ADD VALUE 'AWAITING_CLARIFICATION'")


def downgrade() -> None:
    # Postgres doesn't easily support removing enum values
    pass
