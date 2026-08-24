"""Agency Portal tier: agency-scoped users + ticket_issues table

Client updates Batch 3: users gain agency_id (AGENCY_ADMIN / AGENCY_USER
portal logins) and portal_perms (sub-user permission matrix); new
ticket_issues table feeds issuance metrics, Excel exports, ADM exposure
and ROI reporting.

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e6f7a8b9c0d1'
down_revision = 'd5e6f7a8b9c0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('agency_id', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('portal_perms', sa.Text(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_agency_id'), ['agency_id'], unique=False)
        batch_op.create_foreign_key('fk_users_agency_id', 'agencies', ['agency_id'], ['id'])

    op.create_table(
        'ticket_issues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider_id', sa.String(length=20), nullable=False),
        sa.Column('agency_id', sa.String(length=20), nullable=False),
        sa.Column('airline', sa.String(length=4), nullable=False),
        sa.Column('route', sa.String(length=40), nullable=False),
        sa.Column('pnr', sa.String(length=20), nullable=False),
        sa.Column('ticket_no', sa.String(length=20), nullable=False),
        sa.Column('pax_name', sa.String(length=120), nullable=False),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=8), nullable=True),
        sa.Column('agent', sa.String(length=120), nullable=True),
        sa.Column('issued_at', sa.DateTime(), nullable=True),
        sa.Column('overridden', sa.Boolean(), nullable=True),
        sa.Column('override_reason', sa.String(length=80), nullable=True),
        sa.Column('adm_amount', sa.Float(), nullable=True),
        sa.Column('saved_amount', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ),
        sa.ForeignKeyConstraint(['provider_id'], ['providers.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('ticket_issues', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ticket_issues_agency_id'), ['agency_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_ticket_issues_provider_id'), ['provider_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_ticket_issues_issued_at'), ['issued_at'], unique=False)


def downgrade():
    with op.batch_alter_table('ticket_issues', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ticket_issues_issued_at'))
        batch_op.drop_index(batch_op.f('ix_ticket_issues_provider_id'))
        batch_op.drop_index(batch_op.f('ix_ticket_issues_agency_id'))
    op.drop_table('ticket_issues')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_agency_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_users_agency_id'))
        batch_op.drop_column('portal_perms')
        batch_op.drop_column('agency_id')
