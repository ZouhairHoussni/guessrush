from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]
HostToken = Annotated[str | None, Header(alias="X-Host-Token")]
PlayerToken = Annotated[str | None, Header(alias="X-Player-Token")]
IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key")]
