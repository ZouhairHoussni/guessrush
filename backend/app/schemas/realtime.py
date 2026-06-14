from app.schemas.common import APIModel
from app.schemas.room import RoomSnapshot


class RoomSnapshotEvent(APIModel):
    snapshot: RoomSnapshot
