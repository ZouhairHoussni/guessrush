from datetime import datetime

from app.models.enums import TurnStatus
from app.schemas.common import APIModel


class RecapCardSnapshot(APIModel):
    round_card_id: str
    text: str


class TurnSnapshot(APIModel):
    id: str
    round_number: int
    sequence_number: int
    status: TurnStatus
    active_team_id: str
    active_team_name: str
    active_member_id: str
    active_member_name: str
    started_at: datetime | None = None
    deadline_at: datetime | None = None
    server_time: datetime
    points: int
    cards_remaining: int
    skips_used: int = 0
    skips_allowed: int | None = None
    can_skip: bool = True
    guessed_cards: list[RecapCardSnapshot] = []


class TeamRoundScoreSnapshot(APIModel):
    team_id: str
    team_name: str
    color_key: str
    round_score: int
    total_score: int


class RoundSummarySnapshot(APIModel):
    round_number: int
    teams: list[TeamRoundScoreSnapshot]
    next_round_number: int | None = None
    next_rule_label: str | None = None
    next_rule_detail: str | None = None


class TeamResultSnapshot(APIModel):
    team_id: str
    team_name: str
    color_key: str
    total_score: int


class PlayerStatSnapshot(APIModel):
    member_id: str
    member_name: str
    value: int


class BestTurnSnapshot(APIModel):
    member_id: str
    member_name: str
    team_id: str
    team_name: str
    round_number: int
    points: int


class ClosestRoundSnapshot(APIModel):
    round_number: int
    spread: int


class ResultsSnapshot(APIModel):
    teams: list[TeamResultSnapshot]
    winner_team_ids: list[str]
    is_tie: bool
    most_cards_guessed: PlayerStatSnapshot | None = None
    best_turn: BestTurnSnapshot | None = None
    closest_round: ClosestRoundSnapshot | None = None
