from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin
from app.models.enums import RoundCardStatus, TurnStatus


class Turn(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "turns"
    __table_args__ = (
        UniqueConstraint("room_id", "sequence_number", name="uq_turns_room_sequence"),
    )

    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    round_number: Mapped[int] = mapped_column(Integer)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"))
    clue_giver_member_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    sequence_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default=TurnStatus.READY.value)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=0)


class RoundCard(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "round_cards"
    __table_args__ = (
        UniqueConstraint(
            "room_id",
            "round_number",
            "card_id",
            name="uq_round_cards_room_round_card",
        ),
    )

    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    round_number: Mapped[int] = mapped_column(Integer)
    card_id: Mapped[str] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"))
    queue_position: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default=RoundCardStatus.PENDING.value)
    guessed_turn_id: Mapped[str | None] = mapped_column(
        ForeignKey("turns.id", ondelete="SET NULL"), nullable=True
    )
