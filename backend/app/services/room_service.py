from __future__ import annotations

import random
import re
import secrets
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.config import Settings
from app.models.card import Card
from app.models.enums import DeckMode, GamePhase, MemberRole
from app.models.member import Member
from app.models.room import Room
from app.models.team import Team
from app.schemas.room import (
    CreateRoomRequest,
    HostTeamsPatchRequest,
    MemberSnapshot,
    RoomInfo,
    RoomSnapshot,
    SnapshotRoom,
    StartStatusSnapshot,
    TeamSnapshot,
)
from app.services.auth_service import generate_token, hash_token, verify_token
from app.services.deck_service import (
    deck_status,
    ensure_quick_play_cards,
    lock_personal_cards,
    member_card_counts,
    player_has_required_cards,
    refresh_personal_submission_phase,
)
from app.services.errors import ServiceError
from app.services.game_engine import (
    build_gameplay_snapshot,
    build_results_snapshot,
    build_round_summary_snapshot,
)

ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

DEFAULT_TEAMS = [
    ("Blue Comets", "blue"),
    ("Yellow Sparks", "yellow"),
    ("Coral Rockets", "coral"),
    ("Green Gliders", "green"),
]


def normalise_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def normalise_name(name: str) -> str:
    return " ".join(name.strip().split()).casefold()


def display_name(name: str) -> str:
    return " ".join(name.strip().split())


def generate_room_code(db: Session) -> str:
    for _ in range(40):
        code = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(6))
        exists = db.scalar(select(Room.id).where(Room.code == code))
        if not exists:
            return code
    raise ServiceError("ROOM_CODE_UNAVAILABLE", "Could not allocate a room code.", status_code=500)


def room_query(code: str):
    return (
        select(Room)
        .where(Room.code == normalise_code(code))
        .options(
            selectinload(Room.teams).selectinload(Team.members),
            selectinload(Room.members).selectinload(Member.team),
        )
    )


def get_room_by_code(db: Session, code: str) -> Room:
    room = db.scalar(room_query(code))
    if not room:
        raise ServiceError("ROOM_NOT_FOUND", "Room not found.", status_code=404)
    return room


def build_room_info(room: Room, settings: Settings) -> RoomInfo:
    return RoomInfo(
        code=room.code,
        phase=GamePhase(room.phase),
        deck_mode=DeckMode(room.deck_mode),
        team_count=len(room.teams),
        turn_duration_seconds=room.turn_duration_seconds,
        cards_per_player=room.cards_per_player,
        auto_balance_teams=room.auto_balance_teams,
        join_url=settings.join_url_for_code(room.code),
    )


def create_room(db: Session, payload: CreateRoomRequest, settings: Settings) -> tuple[Room, str]:
    if payload.deck_mode == DeckMode.PERSONAL_CARDS and payload.cards_per_player is None:
        payload.cards_per_player = 3
    if payload.deck_mode == DeckMode.QUICK_PLAY:
        payload.cards_per_player = None

    raw_token = generate_token()
    room = Room(
        code=generate_room_code(db),
        host_token_hash=hash_token(raw_token, settings),
        phase=(
            GamePhase.LOBBY.value
            if payload.deck_mode == DeckMode.QUICK_PLAY
            else GamePhase.CARD_SUBMISSION.value
        ),
        deck_mode=payload.deck_mode.value,
        turn_duration_seconds=payload.turn_duration_seconds,
        cards_per_player=payload.cards_per_player,
        auto_balance_teams=payload.auto_balance_teams,
        current_round_number=0,
    )
    db.add(room)
    db.flush()

    team_inputs = payload.teams or []
    for index in range(payload.team_count):
        if index < len(team_inputs):
            name = team_inputs[index].name
            color_key = team_inputs[index].color_key
        else:
            name, color_key = DEFAULT_TEAMS[index]
        db.add(
            Team(
                room_id=room.id,
                name=name,
                color_key=color_key,
                sort_order=index,
                next_member_cursor=0,
                total_score=0,
            )
        )
    db.flush()
    return get_room_by_code(db, room.code), raw_token


def require_host(room: Room, host_token: str | None, settings: Settings) -> None:
    if not host_token or not verify_token(host_token, room.host_token_hash, settings):
        raise ServiceError("HOST_TOKEN_REQUIRED", "Host permission is required.", status_code=403)


def authenticate_player(
    db: Session,
    room: Room,
    player_token: str | None,
    settings: Settings,
) -> Member:
    if not player_token:
        raise ServiceError(
            "PLAYER_TOKEN_REQUIRED",
            "Player permission is required.",
            status_code=403,
        )
    token_hash = hash_token(player_token, settings)
    member = db.scalar(
        select(Member).where(Member.room_id == room.id, Member.player_token_hash == token_hash)
    )
    if not member:
        raise ServiceError("PLAYER_TOKEN_INVALID", "Player permission is invalid.", status_code=403)
    return member


def choose_auto_team(room: Room) -> Team:
    counts = Counter(member.team_id for member in room.members)
    return min(room.teams, key=lambda team: (counts[team.id], team.sort_order))


def next_join_order(db: Session, room: Room) -> int:
    value = db.scalar(select(func.max(Member.join_order)).where(Member.room_id == room.id))
    return int(value or 0) + 1


def join_room(
    db: Session,
    room: Room,
    raw_display_name: str,
    settings: Settings,
) -> tuple[Member, str]:
    joinable_phases = {
        GamePhase.LOBBY.value,
        GamePhase.CARD_SUBMISSION.value,
        GamePhase.READY_CHECK.value,
    }
    if room.phase not in joinable_phases:
        raise ServiceError(
            "ROOM_NOT_JOINABLE",
            "This room is no longer accepting players.",
            status_code=409,
        )

    cleaned_name = display_name(raw_display_name)
    normalised = normalise_name(cleaned_name)
    if not cleaned_name:
        raise ServiceError("DISPLAY_NAME_REQUIRED", "Enter a display name.", status_code=422)
    if db.scalar(
        select(Member.id).where(
            Member.room_id == room.id,
            Member.normalised_display_name == normalised,
        )
    ):
        raise ServiceError(
            "DUPLICATE_PLAYER_NAME",
            "Someone in this room is already using that name.",
            status_code=409,
        )

    team = choose_auto_team(room)
    raw_token = generate_token()
    member = Member(
        room_id=room.id,
        team_id=team.id,
        display_name=cleaned_name,
        normalised_display_name=normalised,
        player_token_hash=hash_token(raw_token, settings),
        role=MemberRole.PLAYER.value,
        ready=False,
        connected=True,
        join_order=next_join_order(db, room),
    )
    db.add(member)
    db.flush()
    if room.deck_mode == DeckMode.QUICK_PLAY.value:
        room.phase = GamePhase.READY_CHECK.value
    elif room.phase == GamePhase.READY_CHECK.value:
        room.phase = GamePhase.CARD_SUBMISSION.value
    return member, raw_token


def shuffle_teams(room: Room) -> None:
    editable_phases = {
        GamePhase.LOBBY.value,
        GamePhase.CARD_SUBMISSION.value,
        GamePhase.READY_CHECK.value,
    }
    if room.phase not in editable_phases:
        raise ServiceError(
            "ROOM_LOCKED",
            "Teams cannot be shuffled after play begins.",
            status_code=409,
        )

    members = list(sorted(room.members, key=lambda member: member.join_order))
    random.shuffle(members)
    teams = list(sorted(room.teams, key=lambda team: team.sort_order))
    for index, member in enumerate(members):
        member.team_id = teams[index % len(teams)].id


def update_host_teams(room: Room, payload: HostTeamsPatchRequest) -> None:
    editable_phases = {
        GamePhase.LOBBY.value,
        GamePhase.CARD_SUBMISSION.value,
        GamePhase.READY_CHECK.value,
    }
    if room.phase not in editable_phases:
        raise ServiceError(
            "ROOM_LOCKED",
            "Teams cannot be edited after play begins.",
            status_code=409,
        )

    teams_by_id = {team.id: team for team in room.teams}
    members_by_id = {member.id: member for member in room.members}

    for team_update in payload.teams:
        team = teams_by_id.get(team_update.id)
        if not team:
            raise ServiceError("TEAM_NOT_FOUND", "Team not found in this room.", status_code=404)
        if team_update.name is not None:
            team.name = team_update.name.strip()
        if team_update.color_key is not None:
            team.color_key = team_update.color_key.strip()

    for assignment in payload.assignments:
        member = members_by_id.get(assignment.member_id)
        team = teams_by_id.get(assignment.team_id)
        if not member or not team:
            raise ServiceError(
                "TEAM_ASSIGNMENT_INVALID",
                "Player and team must both belong to this room.",
                status_code=422,
            )
        member.team_id = team.id


def leave_room(db: Session, room: Room, member: Member) -> None:
    if room.phase not in {
        GamePhase.LOBBY.value,
        GamePhase.CARD_SUBMISSION.value,
        GamePhase.READY_CHECK.value,
    }:
        raise ServiceError(
            "ROOM_LOCKED",
            "Players can leave only before gameplay begins.",
            status_code=409,
        )

    remaining_count = int(
        db.scalar(
            select(func.count(Member.id)).where(
                Member.room_id == room.id,
                Member.id != member.id,
            )
        )
        or 0
    )
    for card in db.scalars(
        select(Card).where(Card.room_id == room.id, Card.created_by_member_id == member.id)
    ):
        db.delete(card)
    db.delete(member)
    db.flush()
    db.expire(room, ["members"])
    if room.deck_mode == DeckMode.PERSONAL_CARDS.value:
        refresh_personal_submission_phase(db, room)
    elif remaining_count == 0:
        room.phase = GamePhase.LOBBY.value


def cancel_room(room: Room) -> None:
    if room.phase == GamePhase.CANCELLED.value:
        return
    if room.phase == GamePhase.FINISHED.value:
        raise ServiceError(
            "ROOM_ALREADY_FINISHED",
            "Finished rooms cannot be cancelled.",
            status_code=409,
        )
    room.phase = GamePhase.CANCELLED.value
    room.active_team_id = None
    room.active_member_id = None
    room.turn_started_at = None
    room.turn_deadline_at = None


def toggle_ready(db: Session, room: Room, member: Member, ready: bool) -> None:
    if room.phase not in {
        GamePhase.LOBBY.value,
        GamePhase.CARD_SUBMISSION.value,
        GamePhase.READY_CHECK.value,
    }:
        raise ServiceError(
            "ROOM_LOCKED",
            "Ready state is locked after the game starts.",
            status_code=409,
        )

    if ready and not player_has_required_cards(db, room, member):
        raise ServiceError(
            "CARDS_REQUIRED_BEFORE_READY",
            "Submit your cards before marking yourself ready.",
            status_code=409,
        )

    member.ready = ready
    if room.deck_mode == DeckMode.QUICK_PLAY.value:
        room.phase = GamePhase.READY_CHECK.value
    else:
        refresh_personal_submission_phase(db, room)


def start_blockers(db: Session, room: Room) -> list[str]:
    blockers: list[str] = []
    status = deck_status(db, room)
    if len(room.members) < 2:
        blockers.append("Waiting for at least 2 players.")

    if room.members:
        empty_teams = [
            team.name
            for team in sorted(room.teams, key=lambda item: item.sort_order)
            if not any(member.team_id == team.id for member in room.members)
        ]
        if empty_teams:
            blockers.append("Every team needs at least 1 player before play.")

    unready = [member.display_name for member in room.members if not member.ready]
    if unready:
        if len(unready) == 1:
            blockers.append(f"Waiting for {unready[0]} to be ready.")
        else:
            blockers.append(f"Waiting for {len(unready)} players to be ready.")

    if room.deck_mode == DeckMode.PERSONAL_CARDS.value and not status.deck_ready:
        missing = status.total_player_count - status.submitted_player_count
        if missing == 1:
            blockers.append("Waiting for 1 player to submit their cards.")
        else:
            blockers.append(f"Waiting for {missing} players to submit their cards.")

    if room.phase not in {
        GamePhase.LOBBY.value,
        GamePhase.CARD_SUBMISSION.value,
        GamePhase.READY_CHECK.value,
    }:
        blockers.append("This game has already moved out of setup.")
    return blockers


def build_start_status(db: Session, room: Room) -> StartStatusSnapshot:
    blockers = start_blockers(db, room)
    return StartStatusSnapshot(can_start=len(blockers) == 0, blockers=blockers)


def start_game(db: Session, room: Room) -> None:
    blockers = start_blockers(db, room)
    if blockers:
        raise ServiceError(
            "START_CONDITIONS_UNMET",
            blockers[0],
            status_code=409,
            details={"blockers": blockers},
        )

    if room.deck_mode == DeckMode.QUICK_PLAY.value:
        ensure_quick_play_cards(db, room)
    else:
        lock_personal_cards(db, room)

    room.phase = GamePhase.ROUND_INTRO.value
    room.current_round_number = 1


def build_snapshot(
    db: Session,
    room: Room,
    settings: Settings,
    *,
    viewer: str = "PUBLIC",
    current_member_id: str | None = None,
) -> RoomSnapshot:
    turn_snapshot, current_card_text = build_gameplay_snapshot(
        db,
        room,
        viewer=viewer,
        current_member_id=current_member_id if viewer == "PLAYER" else None,
    )
    card_counts = member_card_counts(db, room)
    required = room.cards_per_player or 0
    member_snapshots: list[MemberSnapshot] = [
        MemberSnapshot(
            id=member.id,
            display_name=member.display_name,
            team_id=member.team_id,
            ready=member.ready,
            connected=member.connected,
            join_order=member.join_order,
            is_me=member.id == current_member_id,
            cards_submitted=(
                room.deck_mode == DeckMode.QUICK_PLAY.value
                or card_counts.get(member.id, 0) >= required
            ),
            submitted_card_count=card_counts.get(member.id, 0),
        )
        for member in sorted(room.members, key=lambda item: item.join_order)
    ]
    by_team: dict[str, list[MemberSnapshot]] = {team.id: [] for team in room.teams}
    for member in member_snapshots:
        if member.team_id in by_team:
            by_team[member.team_id].append(member)

    team_snapshots = [
        TeamSnapshot(
            id=team.id,
            name=team.name,
            color_key=team.color_key,
            sort_order=team.sort_order,
            total_score=team.total_score,
            members=by_team.get(team.id, []),
        )
        for team in sorted(room.teams, key=lambda item: item.sort_order)
    ]

    return RoomSnapshot(
        viewer=viewer,  # type: ignore[arg-type]
        room=SnapshotRoom(
            code=room.code,
            phase=GamePhase(room.phase),
            deck_mode=DeckMode(room.deck_mode),
            turn_duration_seconds=room.turn_duration_seconds,
            cards_per_player=room.cards_per_player,
            auto_balance_teams=room.auto_balance_teams,
            current_round_number=room.current_round_number,
        ),
        teams=team_snapshots,
        members=member_snapshots,
        join_url=settings.join_url_for_code(room.code),
        current_member_id=current_member_id,
        deck_status=deck_status(db, room),
        start_status=build_start_status(db, room),
        turn=turn_snapshot,
        current_card_text=current_card_text,
        round_summary=build_round_summary_snapshot(db, room),
        results=build_results_snapshot(db, room),
    )
