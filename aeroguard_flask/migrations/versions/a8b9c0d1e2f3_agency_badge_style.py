"""agencies.badge_style — trust-badge placement toggle

Client updates Batch 5 (SB-10): the Agency Admin chooses whether the
"Verified & Secured by AERO-GUARD" badge renders prominently on the
generated itinerary or as a subtle footer mark.

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-08-25
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a8b9c0d1e2f3'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('agencies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('badge_style', sa.String(length=12), nullable=True))


def downgrade():
    with op.batch_alter_table('agencies', schema=None) as batch_op:
        batch_op.drop_column('badge_style')
