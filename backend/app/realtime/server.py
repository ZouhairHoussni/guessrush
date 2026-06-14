from urllib.parse import parse_qs

import socketio

from app.config import get_settings
from app.db import SessionLocal
from app.services.errors import ServiceError
from app.services.room_service import authenticate_player, get_room_by_code, require_host

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


def public_room_channel(code: str) -> str:
    return f"room:{code}"


def host_room_channel(code: str) -> str:
    return f"room:{code}:host"


def player_room_channel(member_id: str) -> str:
    return f"player:{member_id}"


def _query_value(environ: dict, key: str) -> str | None:
    query = parse_qs(environ.get("QUERY_STRING", ""))
    values = query.get(key)
    return values[0] if values else None


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> bool:
    auth = auth or {}
    code = auth.get("code") or _query_value(environ, "code")
    if not code:
        return False

    settings = get_settings()
    with SessionLocal() as db:
        try:
            room = get_room_by_code(db, code)
            await sio.enter_room(sid, public_room_channel(room.code))

            host_token = auth.get("hostToken") or _query_value(environ, "hostToken")
            player_token = auth.get("playerToken") or _query_value(environ, "playerToken")

            if host_token:
                require_host(room, host_token, settings)
                await sio.enter_room(sid, host_room_channel(room.code))
            elif player_token:
                member = authenticate_player(db, room, player_token, settings)
                await sio.enter_room(sid, player_room_channel(member.id))

            await sio.emit("room:connected", {"code": room.code}, to=sid)
            return True
        except ServiceError:
            return False


@sio.event
async def disconnect(sid: str) -> None:
    return None
