"""add_agent_logs_to_evaluation

Revision ID: 640740b3e1b7
Revises: bcdb5d478bf4
Create Date: 2026-04-27 20:35:35.021843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '640740b3e1b7'
down_revision: Union[str, Sequence[str], None] = 'bcdb5d478bf4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('evaluations', sa.Column('agent_logs', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('evaluations', 'agent_logs')
