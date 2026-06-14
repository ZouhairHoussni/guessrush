"""initial room and lobby schema

Revision ID: 202605250001
Revises:
Create Date: 2026-05-25 20:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202605250001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rooms",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("host_token_hash", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("phase", sa.String(length=32), nullable=False),
        sa.Column("deck_mode", sa.String(length=32), nullable=False),
        sa.Column("turn_duration_seconds", sa.Integer(), nullable=False),
        sa.Column("cards_per_player", sa.Integer(), nullable=True),
        sa.Column("auto_balance_teams", sa.Boolean(), nullable=False),
        sa.Column("current_round_number", sa.Integer(), nullable=False),
        sa.Column("active_team_id", sa.String(length=36), nullable=True),
        sa.Column("active_member_id", sa.String(length=36), nullable=True),
        sa.Column("turn_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("turn_deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_rooms_code", "rooms", ["code"], unique=True)

    op.create_table(
        "teams",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("room_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("color_key", sa.String(length=32), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("next_member_cursor", sa.Integer(), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "sort_order", name="uq_teams_room_sort_order"),
    )
    op.create_index("ix_teams_room_id", "teams", ["room_id"], unique=False)

    op.create_table(
        "members",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("room_id", sa.String(length=36), nullable=False),
        sa.Column("team_id", sa.String(length=36), nullable=True),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("normalised_display_name", sa.String(length=80), nullable=False),
        sa.Column("player_token_hash", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("ready", sa.Boolean(), nullable=False),
        sa.Column("connected", sa.Boolean(), nullable=False),
        sa.Column("join_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "normalised_display_name", name="uq_members_room_name"),
    )
    op.create_index("ix_members_room_id", "members", ["room_id"], unique=False)

    op.create_table(
        "cards",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("room_id", sa.String(length=36), nullable=False),
        sa.Column("created_by_member_id", sa.String(length=36), nullable=True),
        sa.Column("text", sa.String(length=120), nullable=False),
        sa.Column("normalised_text", sa.String(length=120), nullable=False),
        sa.Column("locked", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_member_id"], ["members.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "normalised_text", name="uq_cards_room_normalised_text"),
    )

    op.create_table(
        "turns",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("room_id", sa.String(length=36), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.String(length=36), nullable=False),
        sa.Column("clue_giver_member_id", sa.String(length=36), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["clue_giver_member_id"], ["members.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "sequence_number", name="uq_turns_room_sequence"),
    )

    op.create_table(
        "round_cards",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("room_id", sa.String(length=36), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("card_id", sa.String(length=36), nullable=False),
        sa.Column("queue_position", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("guessed_turn_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["guessed_turn_id"], ["turns.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "room_id", "round_number", "card_id", name="uq_round_cards_room_round_card"
        ),
    )

    op.create_table(
        "guess_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("turn_id", sa.String(length=36), nullable=False),
        sa.Column("round_card_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["round_card_id"], ["round_cards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["turn_id"], ["turns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("guess_events")
    op.drop_table("round_cards")
    op.drop_table("turns")
    op.drop_table("cards")
    op.drop_index("ix_members_room_id", table_name="members")
    op.drop_table("members")
    op.drop_index("ix_teams_room_id", table_name="teams")
    op.drop_table("teams")
    op.drop_index("ix_rooms_code", table_name="rooms")
    op.drop_table("rooms")
