"""merge multiple heads

Revision ID: c9ff35ee616f
Revises: d3f8b2a1c7e4, f06b4c239302
Create Date: 2026-06-03 16:26:34.382833

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9ff35ee616f'
down_revision: Union[str, Sequence[str], None] = ('d3f8b2a1c7e4', 'f06b4c239302')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
