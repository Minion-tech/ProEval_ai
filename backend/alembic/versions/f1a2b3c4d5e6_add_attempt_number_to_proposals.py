"""add attempt_number to project_submissions for multi-proposal support

Revision ID: f1a2b3c4d5e6
Revises: 277edc2dad66
Create Date: 2026-04-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '277edc2dad66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'project_submissions',
        sa.Column(
            'attempt_number',
            sa.Integer(),
            server_default=sa.text('1'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('project_submissions', 'attempt_number')
