"""merge heads

Revision ID: b202d99b94c0
Revises: 195947616825, modules_notnull
Create Date: 2026-05-12 23:13:19.858766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b202d99b94c0'
down_revision: Union[str, Sequence[str], None] = ('195947616825', 'modules_notnull')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
