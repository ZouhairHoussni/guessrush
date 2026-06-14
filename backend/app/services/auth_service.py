import hashlib
import hmac
import secrets

from app.config import Settings


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str, settings: Settings) -> str:
    return hmac.new(
        settings.app_secret.encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_token(token: str, token_hash: str, settings: Settings) -> bool:
    candidate = hash_token(token, settings)
    return hmac.compare_digest(candidate, token_hash)
