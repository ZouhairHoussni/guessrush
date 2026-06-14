from __future__ import annotations

import random
from collections import Counter
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session

from app.models.base import utc_now
from app.models.card import Card
from app.models.enums import DeckMode, GamePhase, GuessAction, RoundCardStatus, TurnStatus
from app.models.event import GuessEvent
from app.models.member import Member
from app.models.room import Room
from app.models.team import Team
from app.models.turn import RoundCard, Turn
from app.schemas.gameplay import (
    BestTurnSnapshot,
    ClosestRoundSnapshot,
    PlayerStatSnapshot,
    ResultsSnapshot,
    RoundSummarySnapshot,
    TeamResultSnapshot,
    TeamRoundScoreSnapshot,
    TurnSnapshot,
)
from app.services.deck_service import ensure_quick_play_cards
from app.services.errors import ServiceError

MAX_ROUND_NUMBER = 3
MAX_CLIENT_ACTION_ID_LENGTH = 80
ROUND_RULES = {
    1: ("Describe freely", "Say anything except the name on the card."),
    2: ("One word only", "Choose one clue word. No extra sounds or gestures."),
    3: ("Mime only", "No words. Act it out."),
}


def _skip_limit_for_round(round_number: int) -> int | None:
    return None if round_number == 1 else 1


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _now(value: datetime | None = None) -> datetime:
    return _as_utc(value or utc_now())


def _team_rosters(room: Room) -> list[tuple[Team, list[Member]]]:
    rosters: list[tuple[Team, list[Member]]] = []
    for team in sorted(room.teams, key=lambda item: item.sort_order):
        members = sorted(
            [member for member in room.members if member.team_id == team.id],
            key=lambda item: item.join_order,
        )
        if members:
            rosters.append((team, members))
    return rosters


def validate_playable_rosters(room: Room) -> None:
    empty_teams = [
        team.name
        for team in sorted(room.teams, key=lambda item: item.sort_order)
        if not any(member.team_id == team.id for member in room.members)
    ]
    if empty_teams:
        raise ServiceError(
            "TEAM_WITHOUT_PLAYERS",
            "Every team needs at least one player before play begins.",
            status_code=409,
            details={"teams": empty_teams},
        )


def _next_sequence_number(db: Session, room: Room) -> int:
    current_max = db.scalar(select(func.max(Turn.sequence_number)).where(Turn.room_id == room.id))
    return int(current_max or 0) + 1


def _select_next_clue_giver(db: Session, room: Room) -> tuple[int, Team, Member]:
    rosters = _team_rosters(room)
    if len(rosters) < 2:
        raise ServiceError(
            "NOT_ENOUGH_PLAYABLE_TEAMS",
            "At least two teams with players are required to begin a turn.",
            status_code=409,
        )

    sequence_number = _next_sequence_number(db, room)
    team, members = rosters[(sequence_number - 1) % len(rosters)]
    member = members[team.next_member_cursor % len(members)]
    return sequence_number, team, member


def _current_turn(db: Session, room: Room) -> Turn | None:
    return db.scalar(
        select(Turn)
        .where(Turn.room_id == room.id)
        .order_by(desc(Turn.sequence_number))
        .limit(1)
    )


def get_current_turn(db: Session, room: Room) -> Turn:
    turn = _current_turn(db, room)
    if not turn:
        raise ServiceError("TURN_NOT_FOUND", "There is no current turn.", status_code=409)
    return turn


def _pending_round_card_row(db: Session, room: Room) -> tuple[RoundCard, Card] | None:
    row = db.execute(
        select(RoundCard, Card)
        .join(Card, RoundCard.card_id == Card.id)
        .where(
            RoundCard.room_id == room.id,
            RoundCard.round_number == room.current_round_number,
            RoundCard.status == RoundCardStatus.PENDING.value,
        )
        .order_by(RoundCard.queue_position, RoundCard.id)
        .limit(1)
    ).first()
    if not row:
        return None
    return row[0], row[1]


def _pending_card_count(db: Session, room: Room) -> int:
    return int(
        db.scalar(
            select(func.count(RoundCard.id)).where(
                RoundCard.room_id == room.id,
                RoundCard.round_number == room.current_round_number,
                RoundCard.status == RoundCardStatus.PENDING.value,
            )
        )
        or 0
    )


def _max_pending_queue_position(db: Session, room: Room) -> int:
    return int(
        db.scalar(
            select(func.max(RoundCard.queue_position)).where(
                RoundCard.room_id == room.id,
                RoundCard.round_number == room.current_round_number,
                RoundCard.status == RoundCardStatus.PENDING.value,
            )
        )
        or 0
    )


def _min_pending_queue_position(db: Session, room: Room) -> int:
    return int(
        db.scalar(
            select(func.min(RoundCard.queue_position)).where(
                RoundCard.room_id == room.id,
                RoundCard.round_number == room.current_round_number,
                RoundCard.status == RoundCardStatus.PENDING.value,
            )
        )
        or 1
    )


def _normalise_client_action_id(client_action_id: str | None) -> str | None:
    if client_action_id is None:
        return None
    cleaned = client_action_id.strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_CLIENT_ACTION_ID_LENGTH:
        raise ServiceError(
            "IDEMPOTENCY_KEY_TOO_LONG",
            "The idempotency key is too long.",
            status_code=422,
        )
    return cleaned


def _existing_guess_event(
    db: Session,
    turn: Turn,
    *,
    action: GuessAction,
    client_action_id: str | None,
) -> GuessEvent | None:
    if not client_action_id:
        return None
    event = db.scalar(
        select(GuessEvent).where(
            GuessEvent.turn_id == turn.id,
            GuessEvent.client_action_id == client_action_id,
        )
    )
    if event and event.action != action.value:
        raise ServiceError(
            "IDEMPOTENCY_KEY_REUSED",
            "That action key was already used for another turn action.",
            status_code=409,
        )
    return event


def _valid_correct_events_for_turn(db: Session, turn: Turn) -> list[GuessEvent]:
    events = list(
        db.scalars(
            select(GuessEvent)
            .where(GuessEvent.turn_id == turn.id)
            .order_by(GuessEvent.occurred_at, GuessEvent.id)
        )
    )
    valid_by_round_card: dict[str, GuessEvent] = {}
    for event in events:
        if event.action == GuessAction.CORRECT.value:
            valid_by_round_card[event.round_card_id] = event
        elif event.action == GuessAction.UNDO_CORRECT.value:
            valid_by_round_card.pop(event.round_card_id, None)
    return list(valid_by_round_card.values())


def _skip_count_for_turn(db: Session, turn: Turn) -> int:
    return int(
        db.scalar(
            select(func.count(GuessEvent.id)).where(
                GuessEvent.turn_id == turn.id,
                GuessEvent.action == GuessAction.SKIP.value,
            )
        )
        or 0
    )


def _last_undoable_correct_event(db: Session, turn: Turn) -> GuessEvent | None:
    valid_events = _valid_correct_events_for_turn(db, turn)
    if not valid_events:
        return None
    return max(valid_events, key=lambda event: (event.occurred_at, event.id))


def _confirmed_turns(db: Session, room: Room, *, round_number: int | None = None) -> list[Turn]:
    query = select(Turn).where(
        Turn.room_id == room.id,
        Turn.status == TurnStatus.CONFIRMED.value,
    )
    if round_number is not None:
        query = query.where(Turn.round_number == round_number)
    return list(db.scalars(query.order_by(Turn.sequence_number)))


def _round_score_counts(db: Session, room: Room, round_number: int) -> Counter[str]:
    scores: Counter[str] = Counter()
    for turn in _confirmed_turns(db, room, round_number=round_number):
        scores[turn.team_id] += len(_valid_correct_events_for_turn(db, turn))
    return scores


def _ensure_round_cards(db: Session, room: Room) -> None:
    existing_count = int(
        db.scalar(
            select(func.count(RoundCard.id)).where(
                RoundCard.room_id == room.id,
                RoundCard.round_number == room.current_round_number,
            )
        )
        or 0
    )
    if existing_count:
        return

    card_ids = list(
        db.scalars(
            select(Card.id).where(Card.room_id == room.id, Card.locked.is_(True)).order_by(Card.id)
        )
    )
    if not card_ids:
        raise ServiceError(
            "ROUND_DECK_EMPTY",
            "No locked cards are available for this round.",
            status_code=409,
        )

    random.shuffle(card_ids)
    for position, card_id in enumerate(card_ids, start=1):
        db.add(
            RoundCard(
                room_id=room.id,
                round_number=room.current_round_number,
                card_id=card_id,
                queue_position=position,
                status=RoundCardStatus.PENDING.value,
            )
        )
    db.flush()


def _create_next_ready_turn(db: Session, room: Room) -> Turn:
    sequence_number, team, member = _select_next_clue_giver(db, room)
    turn = Turn(
        room_id=room.id,
        round_number=room.current_round_number,
        team_id=team.id,
        clue_giver_member_id=member.id,
        sequence_number=sequence_number,
        status=TurnStatus.READY.value,
        points=0,
    )
    db.add(turn)
    room.phase = GamePhase.TURN_READY.value
    room.active_team_id = team.id
    room.active_member_id = member.id
    room.turn_started_at = None
    room.turn_deadline_at = None
    db.flush()
    return turn


def begin_round(db: Session, room: Room) -> Turn:
    if room.phase != GamePhase.ROUND_INTRO.value:
        raise ServiceError(
            "ROUND_NOT_READY",
            "The host can begin a round only from the round intro.",
            status_code=409,
        )
    if room.current_round_number < 1 or room.current_round_number > MAX_ROUND_NUMBER:
        raise ServiceError(
            "ROUND_NUMBER_INVALID",
            "This room is not pointing at a playable round.",
            status_code=409,
        )

    validate_playable_rosters(room)
    _ensure_round_cards(db, room)
    if _pending_card_count(db, room) == 0:
        raise ServiceError("ROUND_DECK_EMPTY", "No cards remain for this round.", status_code=409)
    return _create_next_ready_turn(db, room)


def _require_active_player(room: Room, member: Member) -> None:
    if room.active_member_id != member.id:
        raise ServiceError(
            "ACTIVE_PLAYER_REQUIRED",
            "Only the active clue-giver can do that.",
            status_code=403,
        )


def start_current_turn(
    db: Session,
    room: Room,
    member: Member,
    *,
    now: datetime | None = None,
) -> Turn:
    if room.phase != GamePhase.TURN_READY.value:
        raise ServiceError(
            "TURN_NOT_READY",
            "The current turn is not waiting to be started.",
            status_code=409,
        )
    _require_active_player(room, member)
    turn = get_current_turn(db, room)
    if turn.status != TurnStatus.READY.value:
        raise ServiceError(
            "TURN_NOT_READY",
            "The current turn is not waiting to be started.",
            status_code=409,
        )
    if _pending_card_count(db, room) == 0:
        raise ServiceError("ROUND_DECK_EMPTY", "No cards remain for this round.", status_code=409)

    started_at = _now(now)
    deadline_at = started_at + timedelta(seconds=room.turn_duration_seconds)
    turn.status = TurnStatus.LIVE.value
    turn.started_at = started_at
    turn.deadline_at = deadline_at
    room.phase = GamePhase.TURN_LIVE.value
    room.turn_started_at = started_at
    room.turn_deadline_at = deadline_at
    db.flush()
    return turn


def _move_current_turn_to_recap(
    room: Room,
    turn: Turn,
    *,
    now: datetime,
    expired: bool,
) -> None:
    turn.status = TurnStatus.EXPIRED.value if expired else TurnStatus.RECAP.value
    turn.ended_at = now
    room.phase = GamePhase.TURN_RECAP.value
    room.turn_started_at = turn.started_at
    room.turn_deadline_at = turn.deadline_at


def finalize_expired_turn(
    db: Session,
    room: Room,
    *,
    now: datetime | None = None,
) -> bool:
    if room.phase != GamePhase.TURN_LIVE.value:
        return False
    turn = _current_turn(db, room)
    if not turn or turn.status != TurnStatus.LIVE.value or not turn.deadline_at:
        return False

    checked_at = _now(now)
    if checked_at < _as_utc(turn.deadline_at):
        return False

    _move_current_turn_to_recap(room, turn, now=checked_at, expired=True)
    db.flush()
    return True


def score_current_card(
    db: Session,
    room: Room,
    member: Member,
    *,
    now: datetime | None = None,
    client_action_id: str | None = None,
) -> Turn:
    turn = get_current_turn(db, room)
    _require_active_player(room, member)
    action_id = _normalise_client_action_id(client_action_id)
    if _existing_guess_event(db, turn, action=GuessAction.CORRECT, client_action_id=action_id):
        return turn

    if room.phase == GamePhase.TURN_READY.value:
        raise ServiceError(
            "TURN_NOT_STARTED",
            "Start your turn before scoring a card.",
            status_code=409,
        )
    if room.phase != GamePhase.TURN_LIVE.value:
        raise ServiceError(
            "TURN_NOT_LIVE",
            "Cards can only be scored during a live turn.",
            status_code=409,
        )

    checked_at = _now(now)
    if finalize_expired_turn(db, room, now=checked_at):
        raise ServiceError(
            "TURN_EXPIRED",
            "Time is up. This card cannot be scored.",
            status_code=409,
        )
    if turn.status != TurnStatus.LIVE.value:
        raise ServiceError(
            "TURN_NOT_LIVE",
            "Cards can only be scored during a live turn.",
            status_code=409,
        )

    current = _pending_round_card_row(db, room)
    if not current:
        _move_current_turn_to_recap(room, turn, now=checked_at, expired=False)
        db.flush()
        raise ServiceError("ROUND_DECK_EMPTY", "No cards remain for this round.", status_code=409)

    round_card, _card = current
    round_card.status = RoundCardStatus.GUESSED.value
    round_card.guessed_turn_id = turn.id
    turn.points += 1

    team = db.get(Team, turn.team_id)
    if team:
        team.total_score += 1

    db.add(
        GuessEvent(
            turn_id=turn.id,
            round_card_id=round_card.id,
            action=GuessAction.CORRECT.value,
            client_action_id=action_id,
            occurred_at=checked_at,
        )
    )
    db.flush()

    if _pending_card_count(db, room) == 0:
        _move_current_turn_to_recap(room, turn, now=checked_at, expired=False)
        db.flush()
    return turn


def skip_current_card(
    db: Session,
    room: Room,
    member: Member,
    *,
    now: datetime | None = None,
    client_action_id: str | None = None,
) -> Turn:
    turn = get_current_turn(db, room)
    _require_active_player(room, member)
    action_id = _normalise_client_action_id(client_action_id)
    if _existing_guess_event(db, turn, action=GuessAction.SKIP, client_action_id=action_id):
        return turn

    if room.phase == GamePhase.TURN_READY.value:
        raise ServiceError(
            "TURN_NOT_STARTED",
            "Start your turn before skipping a card.",
            status_code=409,
        )
    if room.phase != GamePhase.TURN_LIVE.value:
        raise ServiceError(
            "TURN_NOT_LIVE",
            "Cards can only be skipped during a live turn.",
            status_code=409,
        )

    checked_at = _now(now)
    if finalize_expired_turn(db, room, now=checked_at):
        raise ServiceError(
            "TURN_EXPIRED",
            "Time is up. This card cannot be skipped.",
            status_code=409,
        )
    if turn.status != TurnStatus.LIVE.value:
        raise ServiceError(
            "TURN_NOT_LIVE",
            "Cards can only be skipped during a live turn.",
            status_code=409,
        )

    skip_limit = _skip_limit_for_round(turn.round_number)
    if skip_limit is not None and _skip_count_for_turn(db, turn) >= skip_limit:
        raise ServiceError(
            "SKIP_LIMIT_REACHED",
            "Only one skip is allowed in rounds 2 and 3.",
            status_code=409,
        )

    current = _pending_round_card_row(db, room)
    if not current:
        _move_current_turn_to_recap(room, turn, now=checked_at, expired=False)
        db.flush()
        raise ServiceError("ROUND_DECK_EMPTY", "No cards remain for this round.", status_code=409)

    round_card, _card = current
    round_card.queue_position = _max_pending_queue_position(db, room) + 1
    db.add(
        GuessEvent(
            turn_id=turn.id,
            round_card_id=round_card.id,
            action=GuessAction.SKIP.value,
            client_action_id=action_id,
            occurred_at=checked_at,
        )
    )
    db.flush()
    return turn


def undo_last_correct(
    db: Session,
    room: Room,
    *,
    actor_member: Member | None = None,
    host_authorized: bool = False,
    now: datetime | None = None,
    client_action_id: str | None = None,
) -> Turn:
    if room.phase != GamePhase.TURN_RECAP.value:
        raise ServiceError(
            "TURN_RECAP_REQUIRED",
            "Undo is available only during a completed turn recap.",
            status_code=409,
        )
    turn = get_current_turn(db, room)
    if turn.status not in {TurnStatus.RECAP.value, TurnStatus.EXPIRED.value}:
        raise ServiceError(
            "TURN_RECAP_REQUIRED",
            "Undo is available only during a completed turn recap.",
            status_code=409,
        )
    if not host_authorized:
        if not actor_member:
            raise ServiceError(
                "PLAYER_TOKEN_REQUIRED",
                "Player permission is required.",
                status_code=403,
            )
        _require_active_player(room, actor_member)

    action_id = _normalise_client_action_id(client_action_id)
    if _existing_guess_event(db, turn, action=GuessAction.UNDO_CORRECT, client_action_id=action_id):
        return turn

    event = _last_undoable_correct_event(db, turn)
    if not event:
        raise ServiceError(
            "NO_CORRECT_GUESS_TO_UNDO",
            "There are no scored cards left to undo for this turn.",
            status_code=409,
        )

    round_card = db.get(RoundCard, event.round_card_id)
    if not round_card or round_card.guessed_turn_id != turn.id:
        raise ServiceError(
            "UNDO_TARGET_INVALID",
            "The last scored card is no longer undoable.",
            status_code=409,
        )

    round_card.status = RoundCardStatus.PENDING.value
    round_card.guessed_turn_id = None
    round_card.queue_position = _min_pending_queue_position(db, room) - 1
    turn.points = max(0, turn.points - 1)

    team = db.get(Team, turn.team_id)
    if team:
        team.total_score = max(0, team.total_score - 1)

    db.add(
        GuessEvent(
            turn_id=turn.id,
            round_card_id=round_card.id,
            action=GuessAction.UNDO_CORRECT.value,
            client_action_id=action_id,
            occurred_at=_now(now),
        )
    )
    db.flush()
    return turn


def confirm_current_turn(
    db: Session,
    room: Room,
    *,
    actor_member: Member | None = None,
    host_authorized: bool = False,
    now: datetime | None = None,
) -> Turn:
    if room.phase != GamePhase.TURN_RECAP.value:
        raise ServiceError(
            "TURN_RECAP_REQUIRED",
            "A completed turn must be confirmed before continuing.",
            status_code=409,
        )
    if not host_authorized:
        if not actor_member:
            raise ServiceError(
                "PLAYER_TOKEN_REQUIRED",
                "Player permission is required.",
                status_code=403,
            )
        _require_active_player(room, actor_member)

    turn = get_current_turn(db, room)
    if turn.status not in {TurnStatus.RECAP.value, TurnStatus.EXPIRED.value}:
        raise ServiceError(
            "TURN_RECAP_REQUIRED",
            "A completed turn must be confirmed before continuing.",
            status_code=409,
        )

    team = db.get(Team, turn.team_id)
    if team:
        roster_size = len([member for member in room.members if member.team_id == team.id])
        if roster_size > 0:
            team.next_member_cursor = (team.next_member_cursor + 1) % roster_size

    turn.status = TurnStatus.CONFIRMED.value
    turn.confirmed_at = _now(now)
    room.turn_started_at = None
    room.turn_deadline_at = None

    if _pending_card_count(db, room) > 0:
        _create_next_ready_turn(db, room)
    else:
        room.phase = GamePhase.ROUND_SUMMARY.value
        room.active_team_id = None
        room.active_member_id = None
    db.flush()
    return turn


def advance_round_from_summary(
    db: Session,
    room: Room,
    *,
    now: datetime | None = None,
) -> None:
    if room.phase != GamePhase.ROUND_SUMMARY.value:
        raise ServiceError(
            "ROUND_SUMMARY_REQUIRED",
            "The host can advance only after the round summary.",
            status_code=409,
        )

    room.active_team_id = None
    room.active_member_id = None
    room.turn_started_at = None
    room.turn_deadline_at = None
    if room.current_round_number >= MAX_ROUND_NUMBER:
        room.phase = GamePhase.FINISHED.value
        room.finished_at = _now(now)
    else:
        room.current_round_number += 1
        room.phase = GamePhase.ROUND_INTRO.value
    db.flush()


def build_gameplay_snapshot(
    db: Session,
    room: Room,
    *,
    viewer: str = "PUBLIC",
    current_member_id: str | None = None,
) -> tuple[TurnSnapshot | None, str | None]:
    if room.phase not in {
        GamePhase.TURN_READY.value,
        GamePhase.TURN_LIVE.value,
        GamePhase.TURN_RECAP.value,
    }:
        return None, None

    turn = _current_turn(db, room)
    if not turn:
        return None, None

    team = db.get(Team, turn.team_id)
    member = db.get(Member, turn.clue_giver_member_id)
    if not team or not member:
        return None, None

    current_card_text: str | None = None
    if (
        room.phase == GamePhase.TURN_LIVE.value
        and turn.status == TurnStatus.LIVE.value
        and current_member_id == turn.clue_giver_member_id
    ):
        current = _pending_round_card_row(db, room)
        current_card_text = current[1].text if current else None

    skips_used = _skip_count_for_turn(db, turn)
    skips_allowed = _skip_limit_for_round(turn.round_number)

    snapshot = TurnSnapshot(
        id=turn.id,
        round_number=turn.round_number,
        sequence_number=turn.sequence_number,
        status=TurnStatus(turn.status),
        active_team_id=team.id,
        active_team_name=team.name,
        active_member_id=member.id,
        active_member_name=member.display_name,
        started_at=_as_utc(turn.started_at) if turn.started_at else None,
        deadline_at=_as_utc(turn.deadline_at) if turn.deadline_at else None,
        server_time=utc_now(),
        points=turn.points,
        cards_remaining=_pending_card_count(db, room),
        skips_used=skips_used,
        skips_allowed=skips_allowed,
        can_skip=skips_allowed is None or skips_used < skips_allowed,
        guessed_cards=[],
    )
    return snapshot, current_card_text


def build_round_summary_snapshot(db: Session, room: Room) -> RoundSummarySnapshot | None:
    if room.phase not in {GamePhase.ROUND_SUMMARY.value, GamePhase.FINISHED.value}:
        return None
    round_number = max(1, room.current_round_number)
    round_scores = _round_score_counts(db, room, round_number)
    next_round_number = round_number + 1 if round_number < MAX_ROUND_NUMBER else None
    next_rule = ROUND_RULES.get(next_round_number or 0)
    teams = [
        TeamRoundScoreSnapshot(
            team_id=team.id,
            team_name=team.name,
            color_key=team.color_key,
            round_score=round_scores[team.id],
            total_score=team.total_score,
        )
        for team in sorted(room.teams, key=lambda item: item.sort_order)
    ]
    return RoundSummarySnapshot(
        round_number=round_number,
        teams=teams,
        next_round_number=next_round_number,
        next_rule_label=next_rule[0] if next_rule else None,
        next_rule_detail=next_rule[1] if next_rule else None,
    )


def build_results_snapshot(db: Session, room: Room) -> ResultsSnapshot | None:
    if room.phase != GamePhase.FINISHED.value:
        return None

    teams = sorted(room.teams, key=lambda item: item.sort_order)
    result_teams = [
        TeamResultSnapshot(
            team_id=team.id,
            team_name=team.name,
            color_key=team.color_key,
            total_score=team.total_score,
        )
        for team in teams
    ]
    high_score = max((team.total_score for team in teams), default=0)
    winner_team_ids = [team.id for team in teams if team.total_score == high_score]

    members_by_id = {member.id: member for member in room.members}
    teams_by_id = {team.id: team for team in teams}
    clue_giver_counts: Counter[str] = Counter()
    best_turn: Turn | None = None
    best_turn_points = -1
    round_spreads: dict[int, int] = {}

    for round_number in range(1, MAX_ROUND_NUMBER + 1):
        score_counts: Counter[str] = Counter()
        for turn in _confirmed_turns(db, room, round_number=round_number):
            valid_count = len(_valid_correct_events_for_turn(db, turn))
            clue_giver_counts[turn.clue_giver_member_id] += valid_count
            score_counts[turn.team_id] += valid_count
            if turn.points > best_turn_points:
                best_turn = turn
                best_turn_points = turn.points
        if score_counts:
            values = [score_counts[team.id] for team in teams]
            round_spreads[round_number] = max(values) - min(values)

    most_cards_guessed: PlayerStatSnapshot | None = None
    if clue_giver_counts:
        member_id, value = max(
            clue_giver_counts.items(),
            key=lambda item: (
                item[1],
                members_by_id.get(item[0]).join_order if item[0] in members_by_id else 0,
            ),
        )
        member = members_by_id.get(member_id)
        if member:
            most_cards_guessed = PlayerStatSnapshot(
                member_id=member.id,
                member_name=member.display_name,
                value=value,
            )

    best_turn_snapshot: BestTurnSnapshot | None = None
    if best_turn:
        member = members_by_id.get(best_turn.clue_giver_member_id)
        team = teams_by_id.get(best_turn.team_id)
        if member and team:
            best_turn_snapshot = BestTurnSnapshot(
                member_id=member.id,
                member_name=member.display_name,
                team_id=team.id,
                team_name=team.name,
                round_number=best_turn.round_number,
                points=best_turn.points,
            )

    closest_round: ClosestRoundSnapshot | None = None
    if round_spreads:
        round_number, spread = min(round_spreads.items(), key=lambda item: (item[1], item[0]))
        closest_round = ClosestRoundSnapshot(round_number=round_number, spread=spread)

    return ResultsSnapshot(
        teams=result_teams,
        winner_team_ids=winner_team_ids,
        is_tie=len(winner_team_ids) > 1,
        most_cards_guessed=most_cards_guessed,
        best_turn=best_turn_snapshot,
        closest_round=closest_round,
    )


def _reset_team_scores_and_cursors(room: Room) -> None:
    for team in room.teams:
        team.total_score = 0
        team.next_member_cursor = 0


def _shuffle_member_assignments(room: Room) -> None:
    teams = list(sorted(room.teams, key=lambda item: item.sort_order))
    members = list(sorted(room.members, key=lambda item: item.join_order))
    random.shuffle(members)
    for index, member in enumerate(members):
        member.team_id = teams[index % len(teams)].id


def rematch_room(
    db: Session,
    room: Room,
    *,
    same_cards: bool = True,
    same_teams: bool = True,
) -> None:
    if room.phase != GamePhase.FINISHED.value:
        raise ServiceError(
            "ROOM_NOT_FINISHED",
            "A rematch can be started only after final results.",
            status_code=409,
        )

    turn_ids = select(Turn.id).where(Turn.room_id == room.id)
    db.execute(delete(GuessEvent).where(GuessEvent.turn_id.in_(turn_ids)))
    db.execute(delete(RoundCard).where(RoundCard.room_id == room.id))
    db.execute(delete(Turn).where(Turn.room_id == room.id))

    _reset_team_scores_and_cursors(room)
    if not same_teams:
        _shuffle_member_assignments(room)

    room.active_team_id = None
    room.active_member_id = None
    room.turn_started_at = None
    room.turn_deadline_at = None
    room.finished_at = None

    if not same_cards and room.deck_mode == DeckMode.PERSONAL_CARDS.value:
        db.execute(delete(Card).where(Card.room_id == room.id))
        for member in room.members:
            member.ready = False
        room.current_round_number = 0
        room.phase = GamePhase.CARD_SUBMISSION.value
        db.flush()
        return

    if not same_cards and room.deck_mode == DeckMode.QUICK_PLAY.value:
        db.execute(delete(Card).where(Card.room_id == room.id))
        db.flush()
        ensure_quick_play_cards(db, room)

    for card in db.scalars(select(Card).where(Card.room_id == room.id)):
        card.locked = True
    room.current_round_number = 1
    room.phase = GamePhase.ROUND_INTRO.value
    db.flush()
