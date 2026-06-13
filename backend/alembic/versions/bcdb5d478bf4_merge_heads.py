"""merge_heads

Revision ID: bcdb5d478bf4
Revises: a3b4c5d6e7f8, f1a2b3c4d5e6
Create Date: 2026-04-27 20:34:40.131141

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bcdb5d478bf4'
down_revision: Union[str, Sequence[str], None] = ('a3b4c5d6e7f8', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
