from __future__ import annotations

import json
import random
import re
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.enums import DeckMode, GamePhase
from app.models.member import Member
from app.models.room import Room
from app.schemas.room import DeckStatusSnapshot
from app.services.errors import ServiceError


def normalise_card_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip()).casefold()


def clean_card_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def quick_play_card_count(player_count: int) -> int:
    return 40 if player_count > 6 else 30


def _starter_cards_path() -> Path:
    return Path(__file__).resolve().parents[1] / "seed" / "starter_cards.json"


def load_starter_cards() -> list[str]:
    data = json.loads(_starter_cards_path().read_text(encoding="utf-8"))
    cards = [card["text"] for card in data["cards"]]
    if len(cards) < 40:
        raise ServiceError(
            "STARTER_DECK_INCOMPLETE",
            "The starter deck is incomplete.",
            status_code=500,
        )
    return cards


def member_card_counts(db: Session, room: Room) -> dict[str, int]:
    rows = db.execute(
        select(Card.created_by_member_id, func.count(Card.id))
        .where(Card.room_id == room.id, Card.created_by_member_id.is_not(None))
        .group_by(Card.created_by_member_id)
    )
    return {str(member_id): int(count) for member_id, count in rows if member_id is not None}


def own_cards(db: Session, room: Room, member: Member) -> list[str]:
    return list(
        db.scalars(
            select(Card.text)
            .where(Card.room_id == room.id, Card.created_by_member_id == member.id)
            .order_by(Card.created_at, Card.id)
        )
    )


def deck_status(db: Session, room: Room) -> DeckStatusSnapshot:
    total_players = len(room.members)
    if room.deck_mode == DeckMode.QUICK_PLAY.value:
        planned_count = quick_play_card_count(total_players)
        return DeckStatusSnapshot(
            mode=DeckMode.QUICK_PLAY,
            total_player_count=total_players,
            submitted_player_count=0,
            required_cards_per_player=None,
            total_card_count=planned_count,
            deck_ready=True,
        )

    counts = member_card_counts(db, room)
    required = room.cards_per_player or 3
    submitted_players = sum(1 for member in room.members if counts.get(member.id, 0) >= required)
    total_cards = int(db.scalar(select(func.count(Card.id)).where(Card.room_id == room.id)) or 0)
    return DeckStatusSnapshot(
        mode=DeckMode.PERSONAL_CARDS,
        total_player_count=total_players,
        submitted_player_count=submitted_players,
        required_cards_per_player=required,
        total_card_count=total_cards,
        deck_ready=total_players > 0 and submitted_players == total_players,
    )


def player_has_required_cards(db: Session, room: Room, member: Member) -> bool:
    if room.deck_mode == DeckMode.QUICK_PLAY.value:
        return True
    required = room.cards_per_player or 3
    count = db.scalar(
        select(func.count(Card.id)).where(
            Card.room_id == room.id,
            Card.created_by_member_id == member.id,
        )
    )
    return int(count or 0) >= required


def refresh_personal_submission_phase(db: Session, room: Room) -> None:
    if room.deck_mode != DeckMode.PERSONAL_CARDS.value:
        return
    if room.phase not in {GamePhase.CARD_SUBMISSION.value, GamePhase.READY_CHECK.value}:
        return
    status = deck_status(db, room)
    room.phase = (
        GamePhase.READY_CHECK.value if status.deck_ready else GamePhase.CARD_SUBMISSION.value
    )


def submit_personal_cards(db: Session, room: Room, member: Member, cards: list[str]) -> None:
    if room.deck_mode != DeckMode.PERSONAL_CARDS.value:
        raise ServiceError(
            "CARD_SUBMISSION_NOT_ENABLED",
            "This room is using Quick Play, so personal cards are not needed.",
            status_code=409,
        )
    if room.phase not in {GamePhase.CARD_SUBMISSION.value, GamePhase.READY_CHECK.value}:
        raise ServiceError(
            "CARDS_LOCKED",
            "Cards are locked after the game starts.",
            status_code=409,
        )

    required = room.cards_per_player or 3
    if len(cards) != required:
        raise ServiceError(
            "CARD_COUNT_INVALID",
            f"Submit exactly {required} cards.",
            status_code=422,
            details={"requiredCount": required},
        )

    cleaned = [clean_card_text(card) for card in cards]
    for card in cleaned:
        if len(card) < 2 or len(card) > 60:
            raise ServiceError(
                "CARD_TEXT_INVALID",
                "Each card must be 2 to 60 visible characters.",
                status_code=422,
            )

    normalised = [normalise_card_text(card) for card in cleaned]
    seen_cards: dict[str, str] = {}
    for text, normalised_text in zip(cleaned, normalised, strict=True):
        if normalised_text in seen_cards:
            duplicate_text = seen_cards[normalised_text]
            raise ServiceError(
                "DUPLICATE_CARD",
                f'This card already exists: "{duplicate_text}". Please choose a different one.',
                status_code=409,
                details={"duplicateCardText": duplicate_text},
            )
        seen_cards[normalised_text] = text

    duplicate = db.scalar(
        select(Card.text).where(
            Card.room_id == room.id,
            Card.normalised_text.in_(normalised),
            Card.created_by_member_id != member.id,
        )
    )
    if duplicate:
        raise ServiceError(
            "DUPLICATE_CARD",
            f'This card already exists: "{duplicate}". Please choose a different one.',
            status_code=409,
            details={"duplicateCardText": duplicate},
        )

    db.execute(
        delete(Card).where(Card.room_id == room.id, Card.created_by_member_id == member.id)
    )
    for text, normalised_text in zip(cleaned, normalised, strict=True):
        db.add(
            Card(
                room_id=room.id,
                created_by_member_id=member.id,
                text=text,
                normalised_text=normalised_text,
                locked=False,
            )
        )
    member.ready = False
    db.flush()
    refresh_personal_submission_phase(db, room)


def ensure_quick_play_cards(db: Session, room: Room) -> None:
    if room.deck_mode != DeckMode.QUICK_PLAY.value:
        return
    existing = int(
        db.scalar(
            select(func.count(Card.id)).where(
                Card.room_id == room.id,
                Card.created_by_member_id.is_(None),
            )
        )
        or 0
    )
    target = quick_play_card_count(len(room.members))
    if existing >= target:
        return

    db.execute(
        delete(Card).where(Card.room_id == room.id, Card.created_by_member_id.is_(None))
    )
    cards = load_starter_cards()
    random.shuffle(cards)
    for text in cards[:target]:
        db.add(
            Card(
                room_id=room.id,
                created_by_member_id=None,
                text=text,
                normalised_text=normalise_card_text(text),
                locked=True,
            )
        )
    db.flush()


def lock_personal_cards(db: Session, room: Room) -> None:
    for card in db.scalars(select(Card).where(Card.room_id == room.id)):
        card.locked = True
