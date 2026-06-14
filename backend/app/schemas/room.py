from typing import Literal

from pydantic import Field, field_validator

from app.models.enums import DeckMode, GamePhase
from app.schemas.common import APIModel
from app.schemas.gameplay import ResultsSnapshot, RoundSummarySnapshot, TurnSnapshot


class TeamCreate(APIModel):
    name: str = Field(min_length=1, max_length=80)
    color_key: str = Field(min_length=1, max_length=32)


class CreateRoomRequest(APIModel):
    deck_mode: DeckMode = DeckMode.QUICK_PLAY
    team_count: int = Field(default=2, ge=2, le=4)
    turn_duration_seconds: int = Field(default=30)
    cards_per_player: int | None = None
    auto_balance_teams: bool = True
    teams: list[TeamCreate] | None = None

    @field_validator("turn_duration_seconds")
    @classmethod
    def valid_turn_duration(cls, value: int) -> int:
        if value not in {30, 45, 60}:
            raise ValueError("Turn duration must be 30, 45, or 60 seconds.")
        return value

    @field_validator("cards_per_player")
    @classmethod
    def valid_cards_per_player(cls, value: int | None) -> int | None:
        if value is not None and value not in {2, 3, 4, 5}:
            raise ValueError("Cards per player must be 2, 3, 4, or 5.")
        return value


class RoomInfo(APIModel):
    code: str
    phase: GamePhase
    deck_mode: DeckMode
    team_count: int
    turn_duration_seconds: int
    cards_per_player: int | None = None
    auto_balance_teams: bool
    join_url: str


class CreateRoomResponse(APIModel):
    code: str
    join_url: str
    host_token: str
    room: RoomInfo


class JoinMemberRequest(APIModel):
    display_name: str = Field(min_length=1, max_length=40)


class ReadyToggleRequest(APIModel):
    ready: bool


class SubmitCardsRequest(APIModel):
    cards: list[str] = Field(min_length=1)


class CardStatusResponse(APIModel):
    submitted: bool
    required_count: int
    submitted_count: int
    cards: list[str]


class MemberJoinedResponse(APIModel):
    player_token: str
    member_id: str
    snapshot: "RoomSnapshot"


class HostShuffleResponse(APIModel):
    snapshot: "RoomSnapshot"


class TeamUpdate(APIModel):
    id: str
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color_key: str | None = Field(default=None, min_length=1, max_length=32)


class TeamAssignment(APIModel):
    member_id: str
    team_id: str


class HostTeamsPatchRequest(APIModel):
    teams: list[TeamUpdate] = Field(default_factory=list)
    assignments: list[TeamAssignment] = Field(default_factory=list)


class HostCommandResponse(APIModel):
    snapshot: "RoomSnapshot"


ViewerRole = Literal["PUBLIC", "HOST", "PLAYER"]


class MemberSnapshot(APIModel):
    id: str
    display_name: str
    team_id: str | None
    ready: bool
    connected: bool
    join_order: int
    is_me: bool = False
    cards_submitted: bool = False
    submitted_card_count: int = 0


class TeamSnapshot(APIModel):
    id: str
    name: str
    color_key: str
    sort_order: int
    total_score: int
    members: list[MemberSnapshot]


class SnapshotRoom(APIModel):
    code: str
    phase: GamePhase
    deck_mode: DeckMode
    turn_duration_seconds: int
    cards_per_player: int | None = None
    auto_balance_teams: bool
    current_round_number: int


class DeckStatusSnapshot(APIModel):
    mode: DeckMode
    total_player_count: int
    submitted_player_count: int
    required_cards_per_player: int | None = None
    total_card_count: int
    deck_ready: bool


class StartStatusSnapshot(APIModel):
    can_start: bool
    blockers: list[str]


class RoomSnapshot(APIModel):
    viewer: ViewerRole
    room: SnapshotRoom
    teams: list[TeamSnapshot]
    members: list[MemberSnapshot]
    join_url: str
    current_member_id: str | None = None
    deck_status: DeckStatusSnapshot
    start_status: StartStatusSnapshot
    turn: TurnSnapshot | None = None
    current_card_text: str | None = None
    round_summary: RoundSummarySnapshot | None = None
    results: ResultsSnapshot | None = None


class RematchRequest(APIModel):
    same_cards: bool = True
    same_teams: bool = True


MemberJoinedResponse.model_rebuild()
HostShuffleResponse.model_rebuild()
HostCommandResponse.model_rebuild()
