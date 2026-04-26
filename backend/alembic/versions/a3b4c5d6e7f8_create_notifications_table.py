"""create notifications table

Revision ID: a3b4c5d6e7f8
Revises: 277edc2dad66
Create Date: 2026-04-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, Sequence[str], None] = '277edc2dad66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create notifications table
    op.create_table(
        'notification',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('faculty_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('notification_type', sa.Enum('PROJECT_SENT', 'INVITATION_RECEIVED', 'FEEDBACK_RECEIVED', 'PROJECT_APPROVED', 'PROJECT_REJECTED', name='notificationtype'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('project_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['project_submissions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_notification_faculty_id'), 'notification', ['faculty_id'], unique=False)
    op.create_index(op.f('ix_notification_project_id'), 'notification', ['project_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index(op.f('ix_notification_project_id'), table_name='notification')
    op.drop_index(op.f('ix_notification_faculty_id'), table_name='notification')
    
    # Drop table
    op.drop_table('notification')
