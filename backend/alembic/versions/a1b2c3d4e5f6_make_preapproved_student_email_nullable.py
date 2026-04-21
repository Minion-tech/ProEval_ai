"""make_preapproved_student_email_nullable

Revision ID: a1b2c3d4e5f6
Revises: e64a7c4732b3
Create Date: 2026-04-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "e64a7c4732b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Allow university enrollment records to omit email."""
    op.alter_column(
        "pre_approved_students",
        "email",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    """Restore email as a required upload field."""
    op.alter_column(
        "pre_approved_students",
        "email",
        existing_type=sa.String(length=255),
        nullable=False,
    )
