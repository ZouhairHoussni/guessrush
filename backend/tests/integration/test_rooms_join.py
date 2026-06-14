import json

from fastapi.testclient import TestClient


def create_room(client: TestClient, *, team_count: int = 2) -> dict:
    response = client.post(
        "/api/v1/rooms",
        json={
            "deckMode": "QUICK_PLAY",
            "teamCount": team_count,
            "turnDurationSeconds": 30,
            "cardsPerPlayer": None,
            "autoBalanceTeams": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_personal_room(
    client: TestClient,
    *,
    team_count: int = 2,
    cards_per_player: int = 2,
) -> dict:
    response = client.post(
        "/api/v1/rooms",
        json={
            "deckMode": "PERSONAL_CARDS",
            "teamCount": team_count,
            "turnDurationSeconds": 30,
            "cardsPerPlayer": cards_per_player,
            "autoBalanceTeams": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def join_player(client: TestClient, code: str, name: str) -> dict:
    response = client.post(f"/api/v1/rooms/{code}/members", json={"displayName": name})
    assert response.status_code == 201, response.text
    return response.json()


def test_room_creation_returns_host_token_once_and_public_info_is_safe(client: TestClient) -> None:
    created = create_room(client)

    assert len(created["code"]) == 6
    assert created["hostToken"]
    assert created["joinUrl"].endswith(f"/join/{created['code']}")

    room_response = client.get(f"/api/v1/rooms/{created['code']}")
    assert room_response.status_code == 200
    assert "hostToken" not in json.dumps(room_response.json())

    snapshot_response = client.get(f"/api/v1/rooms/{created['code']}/snapshot")
    assert snapshot_response.status_code == 200
    public_snapshot = snapshot_response.json()
    assert public_snapshot["viewer"] == "PUBLIC"
    assert "hostToken" not in json.dumps(public_snapshot)
    assert "playerToken" not in json.dumps(public_snapshot)


def test_join_players_auto_balances_teams_and_rejects_duplicate_names(client: TestClient) -> None:
    created = create_room(client)
    code = created["code"]

    first = join_player(client, code, "Alice")
    second = join_player(client, code, "Bilal")
    third = join_player(client, code, "Amine")
    fourth = join_player(client, code, "Badr")

    assert first["playerToken"] != second["playerToken"]
    assert third["snapshot"]["viewer"] == "PLAYER"
    assert fourth["snapshot"]["currentMemberId"] == fourth["memberId"]

    snapshot = client.get(f"/api/v1/rooms/{code}/snapshot").json()
    team_sizes = sorted(len(team["members"]) for team in snapshot["teams"])
    assert team_sizes == [2, 2]

    duplicate = client.post(f"/api/v1/rooms/{code}/members", json={"displayName": " alice "})
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "DUPLICATE_PLAYER_NAME"


def test_host_shuffle_requires_host_token(client: TestClient) -> None:
    created = create_room(client)
    code = created["code"]
    join_player(client, code, "Alice")
    join_player(client, code, "Bilal")

    missing = client.post(f"/api/v1/rooms/{code}/host/shuffle-teams")
    assert missing.status_code == 403
    assert missing.json()["error"]["code"] == "HOST_TOKEN_REQUIRED"

    wrong = client.post(
        f"/api/v1/rooms/{code}/host/shuffle-teams",
        headers={"X-Host-Token": "nope"},
    )
    assert wrong.status_code == 403

    ok = client.post(
        f"/api/v1/rooms/{code}/host/shuffle-teams",
        headers={"X-Host-Token": created["hostToken"]},
    )
    assert ok.status_code == 200
    assert ok.json()["snapshot"]["viewer"] == "HOST"
    assert "hostToken" not in json.dumps(ok.json())


def test_player_snapshot_requires_private_player_token(client: TestClient) -> None:
    created = create_room(client)
    code = created["code"]
    joined = join_player(client, code, "Alice")

    wrong = client.get(f"/api/v1/rooms/{code}/snapshot", headers={"X-Player-Token": "public-id"})
    assert wrong.status_code == 403
    assert wrong.json()["error"]["code"] == "PLAYER_TOKEN_INVALID"

    recovered = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Player-Token": joined["playerToken"]},
    )
    assert recovered.status_code == 200
    body = recovered.json()
    assert body["viewer"] == "PLAYER"
    assert body["currentMemberId"] == joined["memberId"]
    assert "playerToken" not in json.dumps(body)


def test_personal_cards_are_required_for_ready_and_not_leaked(client: TestClient) -> None:
    created = create_personal_room(client)
    code = created["code"]
    alice = join_player(client, code, "Alice")
    bilal = join_player(client, code, "Bilal")

    too_early = client.post(
        f"/api/v1/rooms/{code}/members/me/ready",
        json={"ready": True},
        headers={"X-Player-Token": alice["playerToken"]},
    )
    assert too_early.status_code == 409
    assert too_early.json()["error"]["code"] == "CARDS_REQUIRED_BEFORE_READY"

    local_duplicate = client.put(
        f"/api/v1/rooms/{code}/members/me/cards",
        json={"cards": ["Moon Pancake", " moon pancake "]},
        headers={"X-Player-Token": alice["playerToken"]},
    )
    assert local_duplicate.status_code == 409
    assert local_duplicate.json()["error"]["code"] == "DUPLICATE_CARD"
    assert local_duplicate.json()["error"]["details"]["duplicateCardText"] == "Moon Pancake"

    submitted = client.put(
        f"/api/v1/rooms/{code}/members/me/cards",
        json={"cards": ["Moon Pancake", "Bubble Museum"]},
        headers={"X-Player-Token": alice["playerToken"]},
    )
    assert submitted.status_code == 200
    assert submitted.json()["submitted"] is True

    duplicate = client.put(
        f"/api/v1/rooms/{code}/members/me/cards",
        json={"cards": ["moon pancake", "Neon Umbrella"]},
        headers={"X-Player-Token": bilal["playerToken"]},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "DUPLICATE_CARD"
    assert duplicate.json()["error"]["details"]["duplicateCardText"] == "Moon Pancake"
    assert 'This card already exists: "Moon Pancake"' in duplicate.json()["error"]["message"]
    assert "Alice" not in duplicate.text

    public_snapshot = client.get(f"/api/v1/rooms/{code}/snapshot").json()
    assert public_snapshot["deckStatus"]["submittedPlayerCount"] == 1
    assert "Moon Pancake" not in json.dumps(public_snapshot)
    assert "Bubble Museum" not in json.dumps(public_snapshot)


def test_start_game_validates_ready_and_deck_then_locks_personal_room(client: TestClient) -> None:
    created = create_personal_room(client)
    code = created["code"]
    alice = join_player(client, code, "Alice")
    bilal = join_player(client, code, "Bilal")

    blocked = client.post(
        f"/api/v1/rooms/{code}/host/start-game",
        headers={"X-Host-Token": created["hostToken"]},
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "START_CONDITIONS_UNMET"
    assert "submit their cards" in json.dumps(blocked.json())

    for joined, cards in [
        (alice, ["Moon Pancake", "Bubble Museum"]),
        (bilal, ["Neon Umbrella", "Kitchen Comet"]),
    ]:
        assert (
            client.put(
                f"/api/v1/rooms/{code}/members/me/cards",
                json={"cards": cards},
                headers={"X-Player-Token": joined["playerToken"]},
            ).status_code
            == 200
        )
        assert (
            client.post(
                f"/api/v1/rooms/{code}/members/me/ready",
                json={"ready": True},
                headers={"X-Player-Token": joined["playerToken"]},
            ).status_code
            == 200
        )

    started = client.post(
        f"/api/v1/rooms/{code}/host/start-game",
        headers={"X-Host-Token": created["hostToken"]},
    )
    assert started.status_code == 200
    assert started.json()["snapshot"]["room"]["phase"] == "ROUND_INTRO"
    assert "Moon Pancake" not in json.dumps(started.json())


def test_quick_play_start_creates_original_seed_deck_after_players_ready(
    client: TestClient,
) -> None:
    created = create_room(client)
    code = created["code"]
    alice = join_player(client, code, "Alice")
    bilal = join_player(client, code, "Bilal")

    for joined in [alice, bilal]:
        response = client.post(
            f"/api/v1/rooms/{code}/members/me/ready",
            json={"ready": True},
            headers={"X-Player-Token": joined["playerToken"]},
        )
        assert response.status_code == 200

    started = client.post(
        f"/api/v1/rooms/{code}/host/start-game",
        headers={"X-Host-Token": created["hostToken"]},
    )
    assert started.status_code == 200
    snapshot = started.json()["snapshot"]
    assert snapshot["room"]["phase"] == "ROUND_INTRO"
    assert snapshot["deckStatus"]["totalCardCount"] == 30


def test_host_can_move_player_between_teams_with_host_token(client: TestClient) -> None:
    created = create_room(client)
    code = created["code"]
    alice = join_player(client, code, "Alice")
    snapshot = client.get(
        f"/api/v1/rooms/{code}/snapshot",
        headers={"X-Host-Token": created["hostToken"]},
    ).json()
    target_team = snapshot["teams"][1]["id"]

    denied = client.patch(
        f"/api/v1/rooms/{code}/host/teams",
        json={"assignments": [{"memberId": alice["memberId"], "teamId": target_team}]},
    )
    assert denied.status_code == 403

    moved = client.patch(
        f"/api/v1/rooms/{code}/host/teams",
        json={"assignments": [{"memberId": alice["memberId"], "teamId": target_team}]},
        headers={"X-Host-Token": created["hostToken"]},
    )
    assert moved.status_code == 200
    moved_snapshot = moved.json()["snapshot"]
    alice_snapshot = next(
        member for member in moved_snapshot["members"] if member["displayName"] == "Alice"
    )
    assert alice_snapshot["teamId"] == target_team


def test_player_can_leave_setup_room_with_private_token(client: TestClient) -> None:
    created = create_room(client)
    code = created["code"]
    alice = join_player(client, code, "Alice")

    missing = client.delete(f"/api/v1/rooms/{code}/members/me")
    assert missing.status_code == 403

    left = client.delete(
        f"/api/v1/rooms/{code}/members/me",
        headers={"X-Player-Token": alice["playerToken"]},
    )
    assert left.status_code == 200
    assert left.json()["snapshot"]["viewer"] == "PUBLIC"

    snapshot = client.get(f"/api/v1/rooms/{code}/snapshot").json()
    assert "Alice" not in json.dumps(snapshot)


def test_host_can_cancel_room_and_block_new_joins(client: TestClient) -> None:
    created = create_room(client)
    code = created["code"]

    missing = client.post(f"/api/v1/rooms/{code}/host/cancel")
    assert missing.status_code == 403

    cancelled = client.post(
        f"/api/v1/rooms/{code}/host/cancel",
        headers={"X-Host-Token": created["hostToken"]},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["snapshot"]["room"]["phase"] == "CANCELLED"

    late_join = client.post(f"/api/v1/rooms/{code}/members", json={"displayName": "Late"})
    assert late_join.status_code == 409
