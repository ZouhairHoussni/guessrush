from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.enums import GamePhase, RoundCardStatus
from app.models.event import GuessEvent
from app.models.member import Member
from app.models.turn import RoundCard, Turn
from app.services.deck_service import normalise_card_text
from app.services.errors import ServiceError
from app.services.game_engine import (
    advance_round_from_summary,
    begin_round,
    build_gameplay_snapshot,
    build_results_snapshot,
    confirm_current_turn,
    finalize_expired_turn,
    rematch_room,
    score_current_card,
    skip_current_card,
    start_current_turn,
    undo_last_correct,
)
from app.services.room_service import get_room_by_code


def create_room(client: TestClient, *, team_count: int = 2, personal: bool = False) -> dict:
    response = client.post(
        "/api/v1/rooms",
        json={
            "deckMode": "PERSONAL_CARDS" if personal else "QUICK_PLAY",
            "teamCount": team_count,
            "turnDurationSeconds": 30,
            "cardsPerPlayer": 2 if personal else None,
            "autoBalanceTeams": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def join_player(client: TestClient, code: str, name: str) -> dict:
    response = client.post(f"/api/v1/rooms/{code}/members", json={"displayName": name})
    assert response.status_code == 201, response.text
    return response.json()


def ready_player(client: TestClient, code: str, player_token: str) -> None:
    response = client.post(
        f"/api/v1/rooms/{code}/members/me/ready",
        json={"ready": True},
        headers={"X-Player-Token": player_token},
    )
    assert response.status_code == 200, response.text


def submit_cards(client: TestClient, code: str, player_token: str, cards: list[str]) -> None:
    response = client.put(
        f"/api/v1/rooms/{code}/members/me/cards",
        json={"cards": cards},
        headers={"X-Player-Token": player_token},
    )
    assert response.status_code == 200, response.text


def start_game(client: TestClient, code: str, host_token: str) -> None:
    response = client.post(
        f"/api/v1/rooms/{code}/host/start-game",
        headers={"X-Host-Token": host_token},
    )
    assert response.status_code == 200, response.text


def prepare_quick_game(client: TestClient, names: list[str], *, team_count: int = 2) -> dict:
    created = create_room(client, team_count=team_count)
    for name in names:
        joined = join_player(client, created["code"], name)
        ready_player(client, created["code"], joined["playerToken"])
        created.setdefault("players", []).append(joined)
    start_game(client, created["code"], created["hostToken"])
    return created


def prepare_minimal_locked_game(
    client: TestClient,
    db_session: Session,
    card_texts: list[str],
) -> dict:
    created = create_room(client)
    for name in ["Alice", "Bilal"]:
        joined = join_player(client, created["code"], name)
        ready_player(client, created["code"], joined["playerToken"])
        created.setdefault("players", []).append(joined)

    room = get_room_by_code(db_session, created["code"])
    for text in card_texts:
        db_session.add(
            Card(
                room_id=room.id,
                created_by_member_id=None,
                text=text,
                normalised_text=normalise_card_text(text),
                locked=True,
            )
        )
    db_session.flush()
    room.phase = GamePhase.ROUND_INTRO.value
    room.current_round_number = 1
    return created


def active_member(db: Session, code: str) -> Member:
    room = get_room_by_code(db, code)
    assert room.active_member_id
    member = db.get(Member, room.active_member_id)
    assert member
    return member


def first_pending_round_card(db: Session, code: str) -> RoundCard:
    room = get_room_by_code(db, code)
    card = (
        db.query(RoundCard)
        .filter_by(
            room_id=room.id,
            round_number=room.current_round_number,
            status=RoundCardStatus.PENDING.value,
        )
        .order_by(RoundCard.queue_position, RoundCard.id)
        .first()
    )
    assert card
    return card


def expire_and_confirm_current_turn(db: Session, code: str, started_at: datetime) -> None:
    room = get_room_by_code(db, code)
    member = active_member(db, code)
    start_current_turn(db, room, member, now=started_at)
    assert finalize_expired_turn(db, room, now=started_at + timedelta(seconds=31)) is True
    confirm_current_turn(db, room, actor_member=member, now=started_at + timedelta(seconds=32))


def test_four_player_rotation_includes_every_teammate(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["A1", "B1", "A2", "B2"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)

    sequence: list[str] = []
    base_time = datetime(2026, 5, 26, 12, 0, tzinfo=UTC)
    for index in range(6):
        sequence.append(active_member(db_session, game["code"]).display_name)
        expire_and_confirm_current_turn(
            db_session,
            game["code"],
            base_time + timedelta(minutes=index),
        )

    assert sequence == ["A1", "B1", "A2", "B2", "A1", "B1"]


def test_three_team_uneven_rotation_is_fair(client: TestClient, db_session: Session) -> None:
    game = prepare_quick_game(client, ["A1", "B1", "C1", "A2"], team_count=3)
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)

    sequence: list[str] = []
    base_time = datetime(2026, 5, 26, 13, 0, tzinfo=UTC)
    for index in range(7):
        sequence.append(active_member(db_session, game["code"]).display_name)
        expire_and_confirm_current_turn(
            db_session,
            game["code"],
            base_time + timedelta(minutes=index),
        )

    assert sequence == ["A1", "B1", "C1", "A2", "B1", "C1", "A1"]


def test_round_boundary_keeps_team_member_cursor(client: TestClient, db_session: Session) -> None:
    created = create_room(client, personal=True)
    players = [
        ("A1", ["A1 Card One", "A1 Card Two"]),
        ("B1", ["B1 Card One", "B1 Card Two"]),
        ("A2", ["A2 Card One", "A2 Card Two"]),
        ("B2", ["B2 Card One", "B2 Card Two"]),
    ]
    for name, cards in players:
        joined = join_player(client, created["code"], name)
        submit_cards(client, created["code"], joined["playerToken"], cards)
        ready_player(client, created["code"], joined["playerToken"])

    start_game(client, created["code"], created["hostToken"])
    room = get_room_by_code(db_session, created["code"])
    begin_round(db_session, room)

    started_at = datetime(2026, 5, 26, 14, 0, tzinfo=UTC)
    assert active_member(db_session, created["code"]).display_name == "A1"
    expire_and_confirm_current_turn(db_session, created["code"], started_at)
    assert active_member(db_session, created["code"]).display_name == "B1"

    room = get_room_by_code(db_session, created["code"])
    member = active_member(db_session, created["code"])
    start_current_turn(db_session, room, member, now=started_at + timedelta(minutes=1))
    for _ in range(8):
        score_current_card(db_session, room, member, now=started_at + timedelta(minutes=1))

    assert room.phase == GamePhase.TURN_RECAP.value
    confirm_current_turn(
        db_session,
        room,
        actor_member=member,
        now=started_at + timedelta(minutes=2),
    )
    assert room.phase == GamePhase.ROUND_SUMMARY.value

    advance_round_from_summary(db_session, room)
    assert room.phase == GamePhase.ROUND_INTRO.value
    assert room.current_round_number == 2
    begin_round(db_session, room)

    assert active_member(db_session, created["code"]).display_name == "A2"


def test_score_before_start_non_active_and_after_deadline_are_rejected(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal", "Amine", "Badr"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    bilal = db_session.get(Member, game["players"][1]["memberId"])
    assert bilal

    with pytest.raises(ServiceError) as before_start:
        score_current_card(db_session, room, alice)
    assert before_start.value.code == "TURN_NOT_STARTED"

    started_at = datetime(2026, 5, 26, 15, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)

    with pytest.raises(ServiceError) as non_active:
        score_current_card(db_session, room, bilal, now=started_at + timedelta(seconds=1))
    assert non_active.value.code == "ACTIVE_PLAYER_REQUIRED"

    with pytest.raises(ServiceError) as expired:
        score_current_card(db_session, room, alice, now=started_at + timedelta(seconds=31))
    assert expired.value.code == "TURN_EXPIRED"
    assert room.phase == GamePhase.TURN_RECAP.value


def test_expiry_finalisation_is_idempotent(client: TestClient, db_session: Session) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 16, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)

    assert finalize_expired_turn(db_session, room, now=started_at + timedelta(seconds=31)) is True
    first_ended_at = room.turn_deadline_at
    assert finalize_expired_turn(db_session, room, now=started_at + timedelta(seconds=35)) is False
    assert room.phase == GamePhase.TURN_RECAP.value
    assert room.turn_deadline_at == first_ended_at


def test_active_player_snapshot_gets_card_and_others_do_not(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal", "Amine", "Badr"])
    code = game["code"]

    started_round = client.post(
        f"/api/v1/rooms/{code}/host/start-round",
        headers={"X-Host-Token": game["hostToken"]},
    )
    assert started_round.status_code == 200, started_round.text
    assert started_round.json()["snapshot"]["room"]["phase"] == "TURN_READY"

    active = active_member(db_session, code)
    active_player = next(player for player in game["players"] if player["memberId"] == active.id)
    spectator_player = next(player for player in game["players"] if player["memberId"] != active.id)

    started_turn = client.post(
        f"/api/v1/rooms/{code}/turns/current/start",
        headers={"X-Player-Token": active_player["playerToken"]},
    )
    assert started_turn.status_code == 200, started_turn.text
    active_snapshot = started_turn.json()["snapshot"]
    card_text = active_snapshot["currentCardText"]
    assert card_text

    public_snapshot = client.get(f"/api/v1/rooms/{code}/snapshot").json()
    host_snapshot = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Host-Token": game["hostToken"]},
    ).json()
    spectator_snapshot = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Player-Token": spectator_player["playerToken"]},
    ).json()

    assert card_text not in json.dumps(public_snapshot)
    assert card_text not in json.dumps(host_snapshot)
    assert card_text not in json.dumps(spectator_snapshot)
    assert spectator_snapshot["currentCardText"] is None


def test_non_active_player_cannot_score_via_api(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal", "Amine", "Badr"])
    code = game["code"]
    response = client.post(
        f"/api/v1/rooms/{code}/host/start-round",
        headers={"X-Host-Token": game["hostToken"]},
    )
    assert response.status_code == 200

    active = active_member(db_session, code)
    active_player = next(player for player in game["players"] if player["memberId"] == active.id)
    spectator_player = next(player for player in game["players"] if player["memberId"] != active.id)
    response = client.post(
        f"/api/v1/rooms/{code}/turns/current/start",
        headers={"X-Player-Token": active_player["playerToken"]},
    )
    assert response.status_code == 200

    denied = client.post(
        f"/api/v1/rooms/{code}/turns/current/correct",
        headers={"X-Player-Token": spectator_player["playerToken"]},
    )
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "ACTIVE_PLAYER_REQUIRED"


def test_correct_card_scores_once_for_current_round_card(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 17, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)
    score_current_card(db_session, room, alice, now=started_at + timedelta(seconds=1))

    guessed = db_session.query(RoundCard).filter_by(status=RoundCardStatus.GUESSED.value).all()
    assert len(guessed) == 1
    assert guessed[0].guessed_turn_id
    assert get_room_by_code(db_session, game["code"]).teams[0].total_score == 1


def test_correct_card_is_idempotent_for_retried_action_key(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 17, 30, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)

    score_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=1),
        client_action_id="score-1",
    )
    score_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=2),
        client_action_id="score-1",
    )

    guessed = db_session.query(RoundCard).filter_by(status=RoundCardStatus.GUESSED.value).all()
    events = db_session.query(GuessEvent).filter_by(client_action_id="score-1").all()
    assert len(guessed) == 1
    assert len(events) == 1
    assert get_room_by_code(db_session, game["code"]).teams[0].total_score == 1


def test_skip_moves_current_card_to_back_without_scoring(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 18, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)
    first_card = first_pending_round_card(db_session, game["code"])
    first_card_id = first_card.id

    skip_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=1),
        client_action_id="skip-1",
    )

    next_card = first_pending_round_card(db_session, game["code"])
    skipped_card = db_session.get(RoundCard, first_card_id)
    assert skipped_card
    assert next_card.id != first_card_id
    assert skipped_card.queue_position > next_card.queue_position
    assert skipped_card.status == RoundCardStatus.PENDING.value
    assert get_room_by_code(db_session, game["code"]).teams[0].total_score == 0


def test_skip_is_idempotent_for_retried_action_key(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 18, 30, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)

    skip_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=1),
        client_action_id="skip-retry",
    )
    first_after_skip = first_pending_round_card(db_session, game["code"]).id
    skip_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=2),
        client_action_id="skip-retry",
    )

    assert first_pending_round_card(db_session, game["code"]).id == first_after_skip
    assert db_session.query(GuessEvent).filter_by(client_action_id="skip-retry").count() == 1


@pytest.mark.parametrize("round_number", [2, 3])
def test_later_rounds_allow_only_one_skip_per_turn(
    client: TestClient,
    db_session: Session,
    round_number: int,
) -> None:
    game = prepare_minimal_locked_game(
        client,
        db_session,
        ["Clock Parade", "Velvet Rocket", "Paper Castle"],
    )
    room = get_room_by_code(db_session, game["code"])
    room.current_round_number = round_number
    room.phase = GamePhase.ROUND_INTRO.value
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 18, 45, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)

    skip_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=1),
        client_action_id=f"round-{round_number}-skip",
    )
    skip_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=2),
        client_action_id=f"round-{round_number}-skip",
    )

    turn_snapshot, _card_text = build_gameplay_snapshot(
        db_session,
        room,
        viewer="PLAYER",
        current_member_id=alice.id,
    )
    assert turn_snapshot
    assert turn_snapshot.skips_allowed == 1
    assert turn_snapshot.skips_used == 1
    assert turn_snapshot.can_skip is False

    with pytest.raises(ServiceError) as limited:
        skip_current_card(
            db_session,
            room,
            alice,
            now=started_at + timedelta(seconds=3),
            client_action_id=f"round-{round_number}-second-skip",
        )
    assert limited.value.code == "SKIP_LIMIT_REACHED"


def test_non_active_player_cannot_skip_via_api(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal", "Amine", "Badr"])
    code = game["code"]
    started_round = client.post(
        f"/api/v1/rooms/{code}/host/start-round",
        headers={"X-Host-Token": game["hostToken"]},
    )
    assert started_round.status_code == 200

    active = active_member(db_session, code)
    active_player = next(player for player in game["players"] if player["memberId"] == active.id)
    spectator_player = next(player for player in game["players"] if player["memberId"] != active.id)
    started_turn = client.post(
        f"/api/v1/rooms/{code}/turns/current/start",
        headers={"X-Player-Token": active_player["playerToken"]},
    )
    assert started_turn.status_code == 200

    denied = client.post(
        f"/api/v1/rooms/{code}/turns/current/skip",
        headers={"X-Player-Token": spectator_player["playerToken"]},
    )
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "ACTIVE_PLAYER_REQUIRED"


def test_skip_after_deadline_is_rejected(client: TestClient, db_session: Session) -> None:
    game = prepare_quick_game(client, ["Alice", "Bilal"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 19, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)

    with pytest.raises(ServiceError) as expired:
        skip_current_card(db_session, room, alice, now=started_at + timedelta(seconds=31))
    assert expired.value.code == "TURN_EXPIRED"
    assert room.phase == GamePhase.TURN_RECAP.value


def test_round_cards_use_locked_base_deck(client: TestClient, db_session: Session) -> None:
    created = create_room(client)
    alice = join_player(client, created["code"], "Alice")
    bilal = join_player(client, created["code"], "Bilal")
    ready_player(client, created["code"], alice["playerToken"])
    ready_player(client, created["code"], bilal["playerToken"])

    room = get_room_by_code(db_session, created["code"])
    for text in ["Tiny Planet", "Paper Crown"]:
        db_session.add(
            Card(
                room_id=room.id,
                created_by_member_id=None,
                text=text,
                normalised_text=normalise_card_text(text),
                locked=True,
            )
        )
    db_session.flush()
    room.phase = GamePhase.ROUND_INTRO.value
    room.current_round_number = 1
    begin_round(db_session, room)

    round_card_count = (
        db_session.query(RoundCard).filter_by(room_id=room.id, round_number=1).count()
    )
    assert round_card_count == 2
    assert get_room_by_code(db_session, created["code"]).phase == GamePhase.TURN_READY.value


def test_undo_last_correct_restores_score_and_pending_card(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_minimal_locked_game(
        client,
        db_session,
        ["Clock Parade", "Velvet Rocket"],
    )
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 20, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)
    score_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=1),
        client_action_id="score-a",
    )
    score_current_card(
        db_session,
        room,
        alice,
        now=started_at + timedelta(seconds=2),
        client_action_id="score-b",
    )
    assert room.phase == GamePhase.TURN_RECAP.value
    assert room.teams[0].total_score == 2

    undo_last_correct(
        db_session,
        room,
        actor_member=alice,
        now=started_at + timedelta(seconds=3),
        client_action_id="undo-b",
    )
    undo_last_correct(
        db_session,
        room,
        actor_member=alice,
        now=started_at + timedelta(seconds=4),
        client_action_id="undo-b",
    )

    assert room.teams[0].total_score == 1
    assert room.phase == GamePhase.TURN_RECAP.value
    pending_cards = (
        db_session.query(RoundCard).filter_by(status=RoundCardStatus.PENDING.value).all()
    )
    assert len(pending_cards) == 1
    undo_events = db_session.query(GuessEvent).filter_by(action="UNDO_CORRECT").all()
    assert len(undo_events) == 1


def test_undo_permissions_and_recap_card_visibility_via_api(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_minimal_locked_game(
        client,
        db_session,
        ["Cloud Tambourine"],
    )
    code = game["code"]
    room = get_room_by_code(db_session, code)
    begin_round(db_session, room)
    alice = active_member(db_session, code)
    alice_player = next(player for player in game["players"] if player["memberId"] == alice.id)
    bilal_player = next(player for player in game["players"] if player["memberId"] != alice.id)

    started_at = datetime(2026, 5, 26, 20, 30, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)
    score_current_card(db_session, room, alice, now=started_at + timedelta(seconds=1))
    db_session.commit()

    host_snapshot = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Host-Token": game["hostToken"]},
    ).json()
    active_snapshot = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Player-Token": alice_player["playerToken"]},
    ).json()
    spectator_snapshot = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Player-Token": bilal_player["playerToken"]},
    ).json()

    assert host_snapshot["turn"]["points"] == 1
    assert active_snapshot["turn"]["points"] == 1
    assert host_snapshot["turn"]["guessedCards"] == []
    assert active_snapshot["turn"]["guessedCards"] == []
    assert spectator_snapshot["turn"]["guessedCards"] == []
    assert "Cloud Tambourine" not in json.dumps(host_snapshot)
    assert "Cloud Tambourine" not in json.dumps(active_snapshot)
    assert "Cloud Tambourine" not in json.dumps(spectator_snapshot)

    denied = client.post(
        f"/api/v1/rooms/{code}/turns/current/undo-last-correct",
        headers={"X-Player-Token": bilal_player["playerToken"], "Idempotency-Key": "undo-api"},
    )
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "ACTIVE_PLAYER_REQUIRED"

    allowed = client.post(
        f"/api/v1/rooms/{code}/turns/current/undo-last-correct",
        headers={"X-Host-Token": game["hostToken"], "Idempotency-Key": "undo-api"},
    )
    assert allowed.status_code == 200
    assert allowed.json()["snapshot"]["teams"][0]["totalScore"] == 0


def test_full_three_round_game_reaches_finished_with_same_base_deck(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_minimal_locked_game(client, db_session, ["Puzzle Kite"])
    room = get_room_by_code(db_session, game["code"])
    base_card_ids = {card.id for card in db_session.query(Card).filter_by(room_id=room.id).all()}
    base_time = datetime(2026, 5, 26, 21, 0, tzinfo=UTC)

    for round_index in range(1, 4):
        assert room.phase == GamePhase.ROUND_INTRO.value
        assert room.current_round_number == round_index
        begin_round(db_session, room)
        member = active_member(db_session, game["code"])
        start_current_turn(db_session, room, member, now=base_time + timedelta(minutes=round_index))
        score_current_card(
            db_session,
            room,
            member,
            now=base_time + timedelta(minutes=round_index, seconds=1),
        )
        assert room.phase == GamePhase.TURN_RECAP.value
        confirm_current_turn(
            db_session,
            room,
            actor_member=member,
            now=base_time + timedelta(minutes=round_index, seconds=2),
        )
        assert room.phase == GamePhase.ROUND_SUMMARY.value
        round_card_ids = {
            card.card_id
            for card in db_session.query(RoundCard)
            .filter_by(room_id=room.id, round_number=round_index)
            .all()
        }
        assert round_card_ids == base_card_ids
        advance_round_from_summary(
            db_session,
            room,
            now=base_time + timedelta(minutes=round_index, seconds=3),
        )

    assert room.phase == GamePhase.FINISHED.value
    assert room.finished_at is not None


def test_results_stats_ignore_undone_and_unconfirmed_events(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_minimal_locked_game(
        client,
        db_session,
        ["Orbit Spoon", "Signal Hat"],
    )
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 22, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)
    score_current_card(db_session, room, alice, now=started_at + timedelta(seconds=1))
    score_current_card(db_session, room, alice, now=started_at + timedelta(seconds=2))
    undo_last_correct(db_session, room, actor_member=alice, now=started_at + timedelta(seconds=3))
    confirm_current_turn(
        db_session,
        room,
        actor_member=alice,
        now=started_at + timedelta(seconds=4),
    )

    bilal = active_member(db_session, game["code"])
    start_current_turn(db_session, room, bilal, now=started_at + timedelta(minutes=1))
    score_current_card(db_session, room, bilal, now=started_at + timedelta(minutes=1, seconds=1))
    confirm_current_turn(
        db_session,
        room,
        actor_member=bilal,
        now=started_at + timedelta(minutes=1, seconds=2),
    )
    advance_round_from_summary(db_session, room)

    for round_number in [2, 3]:
        begin_round(db_session, room)
        member = active_member(db_session, game["code"])
        start_current_turn(
            db_session,
            room,
            member,
            now=started_at + timedelta(minutes=round_number),
        )
        while room.phase == GamePhase.TURN_LIVE.value:
            score_current_card(
                db_session,
                room,
                member,
                now=started_at + timedelta(minutes=round_number, seconds=1),
            )
        confirm_current_turn(
            db_session,
            room,
            actor_member=member,
            now=started_at + timedelta(minutes=round_number, seconds=2),
        )
        advance_round_from_summary(db_session, room)

    results = build_results_snapshot(db_session, room)
    assert results is not None
    assert results.most_cards_guessed is not None
    assert results.most_cards_guessed.value == 3
    assert results.best_turn is not None
    assert results.best_turn.points == 2


def test_rematch_resets_scores_turns_events_and_round_state(
    client: TestClient,
    db_session: Session,
) -> None:
    game = prepare_minimal_locked_game(client, db_session, ["Tiny Lighthouse"])
    room = get_room_by_code(db_session, game["code"])
    begin_round(db_session, room)
    alice = active_member(db_session, game["code"])
    started_at = datetime(2026, 5, 26, 23, 0, tzinfo=UTC)
    start_current_turn(db_session, room, alice, now=started_at)
    score_current_card(db_session, room, alice, now=started_at + timedelta(seconds=1))
    confirm_current_turn(
        db_session,
        room,
        actor_member=alice,
        now=started_at + timedelta(seconds=2),
    )
    advance_round_from_summary(db_session, room)
    room.current_round_number = 3
    room.phase = GamePhase.ROUND_SUMMARY.value
    advance_round_from_summary(db_session, room)
    assert room.phase == GamePhase.FINISHED.value

    rematch_room(db_session, room, same_cards=True, same_teams=True)

    assert room.phase == GamePhase.ROUND_INTRO.value
    assert room.current_round_number == 1
    assert all(team.total_score == 0 for team in room.teams)
    assert db_session.query(GuessEvent).count() == 0
    assert db_session.query(Turn).count() == 0
    assert db_session.query(RoundCard).count() == 0
