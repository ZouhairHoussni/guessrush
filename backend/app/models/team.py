from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class Team(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("room_id", "sort_order", name="uq_teams_room_sort_order"),)

    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    color_key: Mapped[str] = mapped_column(String(32))
    sort_order: Mapped[int] = mapped_column(Integer)
    next_member_cursor: Mapped[int] = mapped_column(Integer, default=0)
    total_score: Mapped[int] = mapped_column(Integer, default=0)

    room = relationship("Room", back_populates="teams")
    members = relationship("Member", back_populates="team", order_by="Member.join_order")
