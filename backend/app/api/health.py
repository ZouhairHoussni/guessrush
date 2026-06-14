from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.config import get_settings

router = APIRouter()


@router.get("/health")
def health(db: DbSession) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "app": get_settings().app_name}
