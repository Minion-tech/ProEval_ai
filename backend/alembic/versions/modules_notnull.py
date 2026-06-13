"""make modules column nullable in team_memberships"""

from alembic import op
from git import Union
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "modules_notnull"
down_revision = "640740b3e1b7"
branch_labels = None
depends_on = None

def upgrade():
    # Alter the column to allow NULL values
    op.alter_column(
        "team_memberships",
        "modules",
        existing_type=sa.String(),
        nullable=True
    )

def downgrade():
    # Revert back to NOT NULL if needed
    op.alter_column(
        "team_memberships",
        "modules",
        existing_type=sa.String(),
        nullable=False
    )
