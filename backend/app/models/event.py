from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin, utc_now
from app.models.enums import GuessAction


class GuessEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "guess_events"
    __table_args__ = (
        UniqueConstraint("turn_id", "client_action_id", name="uq_guess_events_turn_action_id"),
    )

    turn_id: Mapped[str] = mapped_column(ForeignKey("turns.id", ondelete="CASCADE"))
    round_card_id: Mapped[str] = mapped_column(ForeignKey("round_cards.id", ondelete="CASCADE"))
    action: Mapped[str] = mapped_column(String(32), default=GuessAction.CORRECT.value)
    client_action_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
