from enum import StrEnum


class DeckMode(StrEnum):
    QUICK_PLAY = "QUICK_PLAY"
    PERSONAL_CARDS = "PERSONAL_CARDS"


class GamePhase(StrEnum):
    LOBBY = "LOBBY"
    CARD_SUBMISSION = "CARD_SUBMISSION"
    READY_CHECK = "READY_CHECK"
    ROUND_INTRO = "ROUND_INTRO"
    TURN_READY = "TURN_READY"
    TURN_LIVE = "TURN_LIVE"
    TURN_RECAP = "TURN_RECAP"
    ROUND_SUMMARY = "ROUND_SUMMARY"
    FINISHED = "FINISHED"
    CANCELLED = "CANCELLED"


class MemberRole(StrEnum):
    PLAYER = "PLAYER"
    DISPLAY = "DISPLAY"


class TurnStatus(StrEnum):
    READY = "READY"
    LIVE = "LIVE"
    RECAP = "RECAP"
    CONFIRMED = "CONFIRMED"
    EXPIRED = "EXPIRED"


class RoundCardStatus(StrEnum):
    PENDING = "PENDING"
    GUESSED = "GUESSED"


class GuessAction(StrEnum):
    CORRECT = "CORRECT"
    UNDO_CORRECT = "UNDO_CORRECT"
    SKIP = "SKIP"
