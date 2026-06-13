"""team membership role to text

Revision ID: d3f8b2a1c7e4
Revises: b202d99b94c0
Create Date: 2026-05-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d3f8b2a1c7e4"
down_revision = "b202d99b94c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "team_memberships",
        "role",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "team_memberships",
        "role",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
