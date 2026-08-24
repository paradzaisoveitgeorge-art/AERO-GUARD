"""agencies add region; new agency_members whitelist table

Provisioning overhaul (client updates Batch 1): the provisioning form now
captures a region and a named whitelist (manager + up to 3 consultants)
who receive welcome emails from the Email Notification Hub.

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd5e6f7a8b9c0'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('agencies', sa.Column('region', sa.String(length=40), nullable=True))
    op.create_table(
        'agency_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=160), nullable=False),
        sa.Column('member_role', sa.String(length=20), nullable=False),
        sa.Column('welcome_sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('agency_members', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_agency_members_agency_id'), ['agency_id'], unique=False)


def downgrade():
    with op.batch_alter_table('agency_members', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_agency_members_agency_id'))
    op.drop_table('agency_members')
    op.drop_column('agencies', 'region')
