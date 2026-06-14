from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin, utc_now


class Card(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "cards"
    __table_args__ = (
        UniqueConstraint("room_id", "normalised_text", name="uq_cards_room_normalised_text"),
    )

    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    created_by_member_id: Mapped[str | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    text: Mapped[str] = mapped_column(String(120))
    normalised_text: Mapped[str] = mapped_column(String(120))
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
