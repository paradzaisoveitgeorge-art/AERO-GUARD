"""Broadcast engine table + escalation routing category

Client updates Batch 4: provider-authored broadcasts (single-source
announcements pushed to the provider dashboard, every Agency Portal and
email) and the multi-tier escalation category (GENERAL → Tier 1,
FINANCIAL → Tier 2, TECHNICAL → Tier 3).

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-08-25
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7a8b9c0d1e2'
down_revision = 'e6f7a8b9c0d1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'broadcasts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider_id', sa.String(length=20), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=True),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('tag', sa.String(length=20), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('author', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['provider_id'], ['providers.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('broadcasts', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_broadcasts_provider_id'), ['provider_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_broadcasts_created_at'), ['created_at'], unique=False)

    with op.batch_alter_table('escalations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category', sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table('escalations', schema=None) as batch_op:
        batch_op.drop_column('category')
    with op.batch_alter_table('broadcasts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_broadcasts_created_at'))
        batch_op.drop_index(batch_op.f('ix_broadcasts_provider_id'))
    op.drop_table('broadcasts')
