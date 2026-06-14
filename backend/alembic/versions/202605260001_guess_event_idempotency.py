"""add guess event idempotency key

Revision ID: 202605260001
Revises: 202605250001
Create Date: 2026-05-26 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202605260001"
down_revision: str | None = "202605250001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("guess_events") as batch:
        batch.add_column(sa.Column("client_action_id", sa.String(length=80), nullable=True))
        batch.create_unique_constraint(
            "uq_guess_events_turn_action_id",
            ["turn_id", "client_action_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("guess_events") as batch:
        batch.drop_constraint("uq_guess_events_turn_action_id", type_="unique")
        batch.drop_column("client_action_id")
