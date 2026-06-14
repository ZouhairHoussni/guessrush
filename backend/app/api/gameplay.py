from fastapi import APIRouter

from app.api.deps import AppSettings, DbSession, HostToken, IdempotencyKey, PlayerToken
from app.realtime.events import emit_room_snapshot
from app.schemas.room import HostCommandResponse, RematchRequest
from app.services.errors import ServiceError
from app.services.game_engine import (
    advance_round_from_summary,
    begin_round,
    confirm_current_turn,
    rematch_room,
    score_current_card,
    skip_current_card,
    start_current_turn,
    undo_last_correct,
)
from app.services.room_service import (
    authenticate_player,
    build_snapshot,
    get_room_by_code,
    require_host,
)

router = APIRouter(prefix="/api/v1/rooms", tags=["gameplay"])


@router.post("/{code}/host/start-round", response_model=HostCommandResponse)
async def start_room_round(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    begin_round(db, room)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))


@router.post("/{code}/turns/current/start", response_model=HostCommandResponse)
async def start_room_current_turn(
    code: str,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    start_current_turn(db, room, member)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(
        snapshot=build_snapshot(db, room, settings, viewer="PLAYER", current_member_id=member.id)
    )


@router.post("/{code}/turns/current/correct", response_model=HostCommandResponse)
async def score_room_current_card(
    code: str,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
    idempotency_key: IdempotencyKey = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    score_current_card(db, room, member, client_action_id=idempotency_key)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(
        snapshot=build_snapshot(db, room, settings, viewer="PLAYER", current_member_id=member.id)
    )


@router.post("/{code}/turns/current/skip", response_model=HostCommandResponse)
async def skip_room_current_card(
    code: str,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
    idempotency_key: IdempotencyKey = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    skip_current_card(db, room, member, client_action_id=idempotency_key)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(
        snapshot=build_snapshot(db, room, settings, viewer="PLAYER", current_member_id=member.id)
    )


@router.post("/{code}/turns/current/undo-last-correct", response_model=HostCommandResponse)
async def undo_room_last_correct(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
    player_token: PlayerToken = None,
    idempotency_key: IdempotencyKey = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    actor_member_id: str | None = None
    if host_token:
        require_host(room, host_token, settings)
        undo_last_correct(
            db,
            room,
            host_authorized=True,
            client_action_id=idempotency_key,
        )
        viewer = "HOST"
    elif player_token:
        member = authenticate_player(db, room, player_token, settings)
        actor_member_id = member.id
        undo_last_correct(
            db,
            room,
            actor_member=member,
            client_action_id=idempotency_key,
        )
        viewer = "PLAYER"
    else:
        raise ServiceError(
            "PLAYER_OR_HOST_TOKEN_REQUIRED",
            "Host or active player permission is required.",
            status_code=403,
        )

    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(
        snapshot=build_snapshot(
            db,
            room,
            settings,
            viewer=viewer,  # type: ignore[arg-type]
            current_member_id=actor_member_id,
        )
    )


@router.post("/{code}/turns/current/confirm", response_model=HostCommandResponse)
async def confirm_room_current_turn(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
    player_token: PlayerToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    actor_member_id: str | None = None
    if host_token:
        require_host(room, host_token, settings)
        confirm_current_turn(db, room, host_authorized=True)
        viewer = "HOST"
    elif player_token:
        member = authenticate_player(db, room, player_token, settings)
        actor_member_id = member.id
        confirm_current_turn(db, room, actor_member=member)
        viewer = "PLAYER"
    else:
        raise ServiceError(
            "PLAYER_OR_HOST_TOKEN_REQUIRED",
            "Host or active player permission is required.",
            status_code=403,
        )

    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(
        snapshot=build_snapshot(
            db,
            room,
            settings,
            viewer=viewer,  # type: ignore[arg-type]
            current_member_id=actor_member_id,
        )
    )


@router.post("/{code}/host/advance-round", response_model=HostCommandResponse)
async def advance_room_round(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    advance_round_from_summary(db, room)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))


@router.post("/{code}/host/rematch", response_model=HostCommandResponse)
async def rematch_finished_room(
    code: str,
    payload: RematchRequest,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    rematch_room(
        db,
        room,
        same_cards=payload.same_cards,
        same_teams=payload.same_teams,
    )
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))
