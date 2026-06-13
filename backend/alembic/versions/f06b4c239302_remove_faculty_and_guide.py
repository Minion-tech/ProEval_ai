"""remove_faculty_and_guide

Revision ID: f06b4c239302
Revises: b202d99b94c0
Create Date: 2026-05-12 23:14:12.468456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f06b4c239302'
down_revision: Union[str, Sequence[str], None] = 'b202d99b94c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Handle Enum Type Conflicts
    op.execute("DROP TABLE IF EXISTS notification CASCADE")
    op.execute("DROP TYPE IF EXISTS notificationtype CASCADE")
    op.execute("DROP TYPE IF EXISTS guidestatus CASCADE")
    
    # 2. Rename faculty table to admins (if it exists)
    # Check if table exists before renaming
    conn = op.get_bind()
    res = conn.execute(sa.text("SELECT count(*) FROM information_schema.tables WHERE table_name = 'faculty'"))
    if res.scalar() > 0:
        op.rename_table('faculty', 'admins')
        op.execute("DROP INDEX IF EXISTS ix_faculty_email")
        op.create_index(op.f('ix_admins_email'), 'admins', ['email'], unique=True)
        
        # Clean up admins table
        op.execute("ALTER TABLE admins DROP COLUMN IF EXISTS specialization")
        
        # Handle Role Enum change
        op.execute("ALTER TABLE admins ALTER COLUMN role TYPE VARCHAR(255)")
        op.execute("DROP TYPE IF EXISTS facultyrole CASCADE")
        
        adminrole = sa.Enum('ADMIN', name='adminrole')
        adminrole.create(op.get_bind(), checkfirst=True)
        
        op.execute("UPDATE admins SET role = 'ADMIN'")
        op.execute("ALTER TABLE admins ALTER COLUMN role TYPE adminrole USING role::adminrole")
    else:
        # Create admins table if it doesn't exist
        op.create_table('admins',
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('role', sa.Enum('ADMIN', name='adminrole'), nullable=False),
            sa.Column('department', sa.String(length=255), nullable=True),
            sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('id')
        )
        op.create_index(op.f('ix_admins_email'), 'admins', ['email'], unique=True)

    # 3. Create new notifications table
    op.create_table('notifications',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('admin_id', sa.UUID(), nullable=True),
        sa.Column('student_id', sa.UUID(), nullable=True),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('notification_type', sa.Enum('INVITATION_RECEIVED', 'FEEDBACK_RECEIVED', 'PROJECT_APPROVED', 'PROJECT_REJECTED', name='notificationtype'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('project_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['project_submissions.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['studentauth.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id')
    )
    op.create_index(op.f('ix_notifications_admin_id'), 'notifications', ['admin_id'], unique=False)
    op.create_index(op.f('ix_notifications_project_id'), 'notifications', ['project_id'], unique=False)
    op.create_index(op.f('ix_notifications_student_id'), 'notifications', ['student_id'], unique=False)

    # 4. Cleanup project_submissions
    op.execute("ALTER TABLE project_submissions DROP CONSTRAINT IF EXISTS project_submissions_guide_id_fkey")
    op.execute("ALTER TABLE project_submissions DROP COLUMN IF EXISTS guide_status")
    op.execute("ALTER TABLE project_submissions DROP COLUMN IF EXISTS guide_id")

    # 5. Cleanup evaluations
    op.execute("ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_faculty_id_fkey")
    op.execute("ALTER TABLE evaluations DROP COLUMN IF EXISTS faculty_id")

    # 6. Update integrity_flags FK
    op.execute("ALTER TABLE integrity_flags DROP CONSTRAINT IF EXISTS integrity_flags_resolved_by_id_fkey")
    op.create_foreign_key('integrity_flags_resolved_by_id_fkey', 'integrity_flags', 'admins', ['resolved_by_id'], ['id'])


def downgrade() -> None:
    pass
