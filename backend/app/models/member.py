from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, utc_now
from app.models.enums import MemberRole


class Member(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "members"
    __table_args__ = (
        UniqueConstraint("room_id", "normalised_display_name", name="uq_members_room_name"),
    )

    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[str | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    display_name: Mapped[str] = mapped_column(String(80))
    normalised_display_name: Mapped[str] = mapped_column(String(80))
    player_token_hash: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(32), default=MemberRole.PLAYER.value)
    ready: Mapped[bool] = mapped_column(Boolean, default=False)
    connected: Mapped[bool] = mapped_column(Boolean, default=True)
    join_order: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    room = relationship("Room", back_populates="members")
    team = relationship("Team", back_populates="members")
