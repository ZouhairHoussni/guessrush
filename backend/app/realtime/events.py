from sqlalchemy.orm import Session

from app.config import get_settings
from app.realtime.server import public_room_channel, sio
from app.services.room_service import build_snapshot, get_room_by_code


async def emit_room_snapshot(db: Session, code: str) -> None:
    room = get_room_by_code(db, code)
    snapshot = build_snapshot(db, room, get_settings(), viewer="PUBLIC")
    await sio.emit(
        "room:snapshot",
        snapshot.model_dump(mode="json", by_alias=True),
        room=public_room_channel(room.code),
    )
