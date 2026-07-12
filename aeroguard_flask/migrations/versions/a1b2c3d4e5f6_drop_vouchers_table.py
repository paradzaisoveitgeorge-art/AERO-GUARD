"""drop vouchers table

Revision ID: a1b2c3d4e5f6
Revises: 888a60e94a0c
Create Date: 2026-07-12 22:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = '888a60e94a0c'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('vouchers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_vouchers_provider_id'))
    op.drop_table('vouchers')


def downgrade():
    op.create_table(
        'vouchers',
        sa.Column('id', sa.String(length=20), nullable=False),
        sa.Column('provider_id', sa.String(length=20), nullable=False),
        sa.Column('pax', sa.String(length=120), nullable=True),
        sa.Column('pnr', sa.String(length=20), nullable=True),
        sa.Column('ticket', sa.String(length=40), nullable=True),
        sa.Column('reason', sa.String(length=80), nullable=True),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=8), nullable=True),
        sa.Column('payment', sa.String(length=20), nullable=True),
        sa.Column('card', sa.String(length=40), nullable=True),
        sa.Column('policy', sa.String(length=40), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('issued', sa.String(length=40), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['provider_id'], ['providers.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('vouchers', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_vouchers_provider_id'), ['provider_id'], unique=False
        )
