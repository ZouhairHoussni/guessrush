from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DeckMode, GamePhase


class Room(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "rooms"

    code: Mapped[str] = mapped_column(String(6), unique=True, index=True)
    host_token_hash: Mapped[str] = mapped_column(String(128))
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phase: Mapped[str] = mapped_column(String(32), default=GamePhase.LOBBY.value)
    deck_mode: Mapped[str] = mapped_column(String(32), default=DeckMode.QUICK_PLAY.value)
    turn_duration_seconds: Mapped[int] = mapped_column(Integer, default=30)
    cards_per_player: Mapped[int | None] = mapped_column(Integer, nullable=True)
    auto_balance_teams: Mapped[bool] = mapped_column(Boolean, default=True)
    current_round_number: Mapped[int] = mapped_column(Integer, default=0)
    active_team_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    active_member_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    turn_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    turn_deadline_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    teams = relationship(
        "Team",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="Team.sort_order",
    )
    members = relationship(
        "Member",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="Member.join_order",
    )
