from fastapi import APIRouter, Response, status

from app.api.deps import AppSettings, DbSession, HostToken, PlayerToken
from app.realtime.events import emit_room_snapshot
from app.schemas.room import (
    CardStatusResponse,
    CreateRoomRequest,
    CreateRoomResponse,
    HostCommandResponse,
    HostShuffleResponse,
    HostTeamsPatchRequest,
    JoinMemberRequest,
    MemberJoinedResponse,
    ReadyToggleRequest,
    RoomInfo,
    RoomSnapshot,
    SubmitCardsRequest,
)
from app.services.deck_service import own_cards, submit_personal_cards
from app.services.game_engine import finalize_expired_turn
from app.services.room_service import (
    authenticate_player,
    build_room_info,
    build_snapshot,
    cancel_room,
    get_room_by_code,
    join_room,
    leave_room,
    require_host,
    shuffle_teams,
    start_game,
    toggle_ready,
    update_host_teams,
)
from app.services.room_service import (
    create_room as create_room_service,
)

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])


@router.post("", response_model=CreateRoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: CreateRoomRequest,
    db: DbSession,
    settings: AppSettings,
) -> CreateRoomResponse:
    room, host_token = create_room_service(db, payload, settings)
    db.commit()
    room = get_room_by_code(db, room.code)
    return CreateRoomResponse(
        code=room.code,
        join_url=settings.join_url_for_code(room.code),
        host_token=host_token,
        room=build_room_info(room, settings),
    )


@router.get("/{code}", response_model=RoomInfo)
def get_room(code: str, db: DbSession, settings: AppSettings) -> RoomInfo:
    room = get_room_by_code(db, code)
    return build_room_info(room, settings)


@router.get("/{code}/snapshot", response_model=RoomSnapshot)
def get_room_snapshot(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
    player_token: PlayerToken = None,
) -> RoomSnapshot:
    room = get_room_by_code(db, code)
    if finalize_expired_turn(db, room):
        db.commit()
        room = get_room_by_code(db, code)
    if host_token:
        require_host(room, host_token, settings)
        return build_snapshot(db, room, settings, viewer="HOST")
    if player_token:
        member = authenticate_player(db, room, player_token, settings)
        room = get_room_by_code(db, code)
        return build_snapshot(db, room, settings, viewer="PLAYER", current_member_id=member.id)
    return build_snapshot(db, room, settings, viewer="PUBLIC")


@router.post(
    "/{code}/members",
    response_model=MemberJoinedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def join_member(
    code: str,
    payload: JoinMemberRequest,
    db: DbSession,
    settings: AppSettings,
) -> MemberJoinedResponse:
    room = get_room_by_code(db, code)
    member, player_token = join_room(db, room, payload.display_name, settings)
    db.commit()
    room = get_room_by_code(db, code)
    snapshot = build_snapshot(db, room, settings, viewer="PLAYER", current_member_id=member.id)
    await emit_room_snapshot(db, code)
    return MemberJoinedResponse(
        player_token=player_token,
        member_id=member.id,
        snapshot=snapshot,
    )


@router.post("/{code}/host/shuffle-teams", response_model=HostShuffleResponse)
async def shuffle_room_teams(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostShuffleResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    shuffle_teams(room)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostShuffleResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))


@router.patch("/{code}/host/teams", response_model=HostCommandResponse)
async def patch_room_teams(
    code: str,
    payload: HostTeamsPatchRequest,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    update_host_teams(room, payload)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))


@router.post("/{code}/members/me/ready", response_model=HostCommandResponse)
async def toggle_my_ready(
    code: str,
    payload: ReadyToggleRequest,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    toggle_ready(db, room, member, payload.ready)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(
        snapshot=build_snapshot(db, room, settings, viewer="PLAYER", current_member_id=member.id)
    )


@router.delete("/{code}/members/me", response_model=HostCommandResponse)
async def leave_my_room(
    code: str,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    leave_room(db, room, member)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="PUBLIC"))


@router.put("/{code}/members/me/cards", response_model=CardStatusResponse)
async def submit_my_cards(
    code: str,
    payload: SubmitCardsRequest,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
) -> CardStatusResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    submit_personal_cards(db, room, member, payload.cards)
    db.commit()
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    await emit_room_snapshot(db, code)
    cards = own_cards(db, room, member)
    required = room.cards_per_player or 0
    return CardStatusResponse(
        submitted=len(cards) >= required,
        required_count=required,
        submitted_count=len(cards),
        cards=cards,
    )


@router.get("/{code}/members/me/cards/status", response_model=CardStatusResponse)
def get_my_card_status(
    code: str,
    db: DbSession,
    settings: AppSettings,
    player_token: PlayerToken = None,
) -> CardStatusResponse:
    room = get_room_by_code(db, code)
    member = authenticate_player(db, room, player_token, settings)
    cards = own_cards(db, room, member)
    required = room.cards_per_player or 0
    return CardStatusResponse(
        submitted=len(cards) >= required,
        required_count=required,
        submitted_count=len(cards),
        cards=cards,
    )


@router.post("/{code}/host/start-game", response_model=HostCommandResponse)
async def start_room_game(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    start_game(db, room)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))


@router.post("/{code}/host/cancel", response_model=HostCommandResponse)
async def cancel_room_by_host(
    code: str,
    db: DbSession,
    settings: AppSettings,
    host_token: HostToken = None,
) -> HostCommandResponse:
    room = get_room_by_code(db, code)
    require_host(room, host_token, settings)
    cancel_room(room)
    db.commit()
    room = get_room_by_code(db, code)
    await emit_room_snapshot(db, code)
    return HostCommandResponse(snapshot=build_snapshot(db, room, settings, viewer="HOST"))


@router.options("/{path:path}", include_in_schema=False)
def options_anywhere() -> Response:
    return Response(status_code=204)
